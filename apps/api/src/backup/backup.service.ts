import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// ─── Table catalog ────────────────────────────────────────────────────────────
// Ordered from least-dependent (parents) to most-dependent (children).
// Used for export and for restore insertion order.
export const TABLE_CATALOG = [
  { key: 'referenceCounter', label: 'Reference Counters', table: 'reference_counters' },
  { key: 'unit',             label: 'Units',               table: 'units' },
  { key: 'productCategory',  label: 'Product Categories',  table: 'product_categories' },
  { key: 'user',             label: 'Users',               table: 'users' },
  { key: 'product',          label: 'Products',            table: 'products' },
  { key: 'productSpecification', label: 'Product Specifications', table: 'product_specifications' },
  { key: 'supplier',         label: 'Suppliers',           table: 'suppliers' },
  { key: 'productSupplier',  label: 'Product Suppliers',   table: 'product_suppliers' },
  { key: 'customer',         label: 'Customers',           table: 'customers' },
  { key: 'ticket',           label: 'Tickets',             table: 'tickets' },
  { key: 'ticketNote',       label: 'Ticket Notes',        table: 'ticket_notes' },
  { key: 'ticketFollowUp',   label: 'Ticket Follow-ups',   table: 'ticket_follow_ups' },
  { key: 'ticketStatusHistory', label: 'Ticket Status History', table: 'ticket_status_history' },
  { key: 'quotation',        label: 'Quotations',          table: 'quotations' },
  { key: 'quotationItem',    label: 'Quotation Items',     table: 'quotation_items' },
  { key: 'order',            label: 'Orders',              table: 'orders' },
  { key: 'orderItem',        label: 'Order Items',         table: 'order_items' },
  { key: 'proposal',         label: 'Proposals',           table: 'proposals' },
  { key: 'proposalItem',     label: 'Proposal Items',      table: 'proposal_items' },
  { key: 'proposalNote',     label: 'Proposal Notes',      table: 'proposal_notes' },
  { key: 'proposalFollowUp', label: 'Proposal Follow-ups', table: 'proposal_follow_ups' },
  { key: 'boQTemplate',      label: 'BoQ Templates',       table: 'boq_templates' },
  { key: 'boQTemplateComponent', label: 'BoQ Template Components', table: 'boq_template_components' },
  { key: 'boQ',              label: 'Bills of Quantity',   table: 'boqs' },
  { key: 'boQProduct',       label: 'BoQ Products',        table: 'boq_products' },
  { key: 'boQItem',          label: 'BoQ Items',           table: 'boq_items' },
  { key: 'stockLevel',       label: 'Stock Levels',        table: 'stock_levels' },
  { key: 'stockTransaction', label: 'Stock Transactions',  table: 'stock_transactions' },
  { key: 'purchaseOrder',    label: 'Purchase Orders',     table: 'purchase_orders' },
  { key: 'purchaseOrderItem', label: 'Purchase Order Items', table: 'purchase_order_items' },
  { key: 'alertRule',        label: 'Alert Rules',         table: 'alert_rules' },
  { key: 'alertLog',         label: 'Alert Logs',          table: 'alert_logs' },
  { key: 'stockTransfer',    label: 'Stock Transfers',     table: 'stock_transfers' },
  { key: 'stockTransferItem', label: 'Stock Transfer Items', table: 'stock_transfer_items' },
  { key: 'auditLog',         label: 'Audit Logs',          table: 'audit_logs' },
  { key: 'refreshToken',     label: 'Refresh Tokens',      table: 'refresh_tokens' },
] as const;

export type TableKey = (typeof TABLE_CATALOG)[number]['key'];

// ─── Service ──────────────────────────────────────────────────────────────────
@Injectable()
export class BackupService {
  constructor(private readonly prisma: PrismaService) {}

  /** Return the list of available tables with their labels */
  listTables() {
    return TABLE_CATALOG.map(({ key, label, table }) => ({ key, label, table }));
  }

  /** Export data from the requested tables (or all) as a JSON object */
  async exportData(keys: string[]): Promise<{ meta: object; data: Record<string, unknown[]> }> {
    const entries = keys.length
      ? TABLE_CATALOG.filter((t) => keys.includes(t.key))
      : [...TABLE_CATALOG];

    const data: Record<string, unknown[]> = {};

    for (const entry of entries) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data[entry.key] = await (this.prisma as any)[entry.key].findMany();
      } catch {
        data[entry.key] = [];
      }
    }

    return {
      meta: {
        version: 2,
        format: 'oxycure-backup',
        exportedAt: new Date().toISOString(),
        tables: entries.map((e) => e.key),
        rowCounts: entries.reduce<Record<string, number>>((acc, e) => {
          acc[e.key] = data[e.key]?.length ?? 0;
          return acc;
        }, {}),
      },
      data,
    };
  }

  /** Restore tables from uploaded JSON.  Replaces existing data. Admin-only. */
  async restoreData(payload: { meta: { version: number; tables?: string[]; format?: string }; data: Record<string, unknown[]> }) {
    if (!payload?.meta || !payload?.data) {
      throw new BadRequestException('Invalid backup file format');
    }
    if (![1, 2].includes(payload.meta.version)) {
      throw new BadRequestException('Unsupported backup version');
    }
    if (payload.meta.version === 2 && payload.meta.format !== 'oxycure-backup') {
      throw new BadRequestException('Backup file is not in Oxycure backup format');
    }

    const allowedKeys: Set<string> = new Set(TABLE_CATALOG.map((t) => t.key));
    const tableKeys = Object.keys(payload.data).filter((k) => allowedKeys.has(k));

    if (!tableKeys.length) {
      throw new BadRequestException('No recognisable tables found in the backup file');
    }

    // Resolve ordered entries for this backup (only tables present in the backup)
    const orderedEntries = TABLE_CATALOG.filter((t) => tableKeys.includes(t.key));

    try {
      return await this.prisma.$transaction(async (tx) => {
        const tableNames = [...orderedEntries].reverse().map((e) => `"${e.table}"`).join(', ');
        await tx.$executeRawUnsafe(`TRUNCATE TABLE ${tableNames} CASCADE`);

        // Insert in dependency order (parents first). If one table fails, rollback all.
        for (const entry of orderedEntries) {
          const rows = payload.data[entry.key];
          if (!Array.isArray(rows) || rows.length === 0) continue;

          try {
            await (tx as any)[entry.key].createMany({
              data: rows,
              skipDuplicates: false,
            });
          } catch (err) {
            const message = (err as Error).message || 'unknown restore error';
            throw new BadRequestException(`Restore failed for table "${entry.key}": ${message}`);
          }
        }

        return {
          restored: orderedEntries.map((e) => e.key),
          restoredTables: orderedEntries.length,
        };
      });
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      throw new InternalServerErrorException('Restore failed: ' + (err as Error).message);
    }
  }

  /** Clear (truncate) selected tables. Irreversible. Admin-only. */
  async clearTables(keys: string[]): Promise<{ cleared: string[] }> {
    if (!keys.length) throw new BadRequestException('No tables specified');

    const allowedKeys = new Set<string>(TABLE_CATALOG.map((t) => t.key));
    const invalid = keys.filter((k) => !allowedKeys.has(k));
    if (invalid.length) {
      throw new BadRequestException(`Unknown table keys: ${invalid.join(', ')}`);
    }

    // Truncate all selected tables in one statement — Postgres resolves FK
    // constraints internally when multiple tables are named together.
    // CASCADE handles any remaining dependents not in the selection.
    const orderedEntries = TABLE_CATALOG.filter((t) => keys.includes(t.key));

    try {
      const tableNames = [...orderedEntries].reverse().map((e) => `"${e.table}"`).join(', ');
      await this.prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableNames} CASCADE`);
      return { cleared: orderedEntries.map((e) => e.key) };
    } catch (err) {
      throw new InternalServerErrorException('Clear failed: ' + (err as Error).message);
    }
  }
}
