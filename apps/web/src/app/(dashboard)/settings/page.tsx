'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Database,
  Download,
  Upload,
  CheckSquare,
  Square,
  AlertTriangle,
  FileCode,
  Trash2,
} from 'lucide-react';
import { backupApi } from '@/lib/api';
import { useRole } from '@/hooks/useRole';

interface TableEntry {
  key: string;
  label: string;
  table: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const role = useRole();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // ── Clear table state ──
  const [clearSelected, setClearSelected] = useState<Set<string>>(new Set());
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState('');

  const { data: tables = [], isLoading } = useQuery<TableEntry[]>({
    queryKey: ['backup-tables'],
    queryFn: async () => {
      const res = await backupApi.listTables();
      return res.data?.data ?? res.data;
    },
  });

  const exportMutation = useMutation({
    mutationFn: async (keys: string[]) => {
      const res = await backupApi.exportData(keys);
      const blob = new Blob([res.data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `oxycure-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => toast.success('Backup downloaded successfully'),
    onError: () => toast.error('Export failed — please try again'),
  });

  const restoreMutation = useMutation({
    mutationFn: async (file: File) => {
      const res = await backupApi.restoreData(file);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`Restored ${data.restored?.length ?? 0} table(s) successfully`);
      setConfirmRestore(false);
      setPendingFile(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Restore failed';
      toast.error(msg);
      setConfirmRestore(false);
      setPendingFile(null);
    },
  });

  const clearMutation = useMutation({
    mutationFn: async (keys: string[]) => {
      const res = await backupApi.clearTables(keys);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`Cleared ${data.cleared?.length ?? 0} table(s)`);
      setConfirmClear(false);
      setClearSelected(new Set());
      setClearConfirmText('');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Clear failed';
      toast.error(msg);
      setConfirmClear(false);
      setClearConfirmText('');
    },
  });

  // ── Guard: admin only ──
  if (role && role !== 'admin') {
    router.replace('/');
    return null;
  }

  const allKeys = tables.map((t) => t.key);
  const allSelected = allKeys.length > 0 && allKeys.every((k) => selected.has(k));

  const allClearSelected = allKeys.length > 0 && allKeys.every((k) => clearSelected.has(k));

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allKeys));
  }

  function toggleAllClear() {
    if (allClearSelected) setClearSelected(new Set());
    else setClearSelected(new Set(allKeys));
  }

  function toggleOne(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleOneClear(key: string) {
    setClearSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleExport(all: boolean) {
    const keys = all ? [] : Array.from(selected);
    if (!all && keys.length === 0) {
      toast.warning('Select at least one table to export');
      return;
    }
    exportMutation.mutate(keys);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-selected
    e.target.value = '';
    setPendingFile(file);
    setConfirmRestore(true);
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* ── Page header ── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">System configuration and administration</p>
      </div>

      {/* ── Quick nav ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => router.push('/settings/boq-templates')}
          className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm hover:shadow-md transition text-left"
        >
          <FileCode className="w-6 h-6 text-indigo-500 shrink-0" />
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-200">BoQ Templates</p>
            <p className="text-xs text-slate-500">Manage bill-of-quantity templates</p>
          </div>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ── Database Backup & Restore ── */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
        {/* Section header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <Database className="w-5 h-5 text-indigo-500 shrink-0" />
          <div>
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">
              Database Backup &amp; Restore
            </h2>
            <p className="text-xs text-slate-500">
              Export table data as JSON files and restore them later
            </p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* ── Table selector ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Select tables to export
              </h3>
              <button
                onClick={toggleAll}
                className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {allSelected ? (
                  <CheckSquare className="w-3.5 h-3.5" />
                ) : (
                  <Square className="w-3.5 h-3.5" />
                )}
                {allSelected ? 'Deselect all' : 'Select all'}
              </button>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-9 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {tables.map((t) => {
                  const checked = selected.has(t.key);
                  return (
                    <button
                      key={t.key}
                      onClick={() => toggleOne(t.key)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition
                        ${checked
                          ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                          : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-300'
                        }`}
                    >
                      {checked ? (
                        <CheckSquare className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <Square className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span className="truncate">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Export actions ── */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleExport(false)}
              disabled={exportMutation.isPending || selected.size === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition"
            >
              <Download className="w-4 h-4" />
              Export selected ({selected.size})
            </button>
            <button
              onClick={() => handleExport(true)}
              disabled={exportMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition"
            >
              <Download className="w-4 h-4" />
              Export all tables
            </button>
          </div>

          {/* ── Restore section ── */}
          <div className="rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  Restore from backup
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  Uploading a backup file will <strong>overwrite existing data</strong> in each
                  table contained in the file. This action cannot be undone.
                </p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={restoreMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition"
            >
              <Upload className="w-4 h-4" />
              {restoreMutation.isPending ? 'Restoring…' : 'Upload backup file (.json)'}
            </button>
          </div>
        </div>
      </section>

      {/* ── Confirm restore dialog ── */}
      {confirmRestore && pendingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Confirm Restore
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  You are about to restore from{' '}
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {pendingFile.name}
                  </span>
                  . All existing rows in the tables contained in this file will be{' '}
                  <strong>permanently deleted</strong> and replaced. Are you sure?
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setConfirmRestore(false);
                  setPendingFile(null);
                }}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => pendingFile && restoreMutation.mutate(pendingFile)}
                disabled={restoreMutation.isPending}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-50 transition"
              >
                {restoreMutation.isPending ? 'Restoring…' : 'Yes, restore now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ── Danger Zone: Clear Table Data ── */}
      <section className="rounded-xl border border-red-200 dark:border-red-800 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-red-100 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <Trash2 className="w-5 h-5 text-red-500 shrink-0" />
          <div>
            <h2 className="text-base font-semibold text-red-700 dark:text-red-400">Danger Zone — Clear Table Data</h2>
            <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">
              Permanently delete all rows from selected tables. This cannot be undone.
            </p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Table selector */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Select tables to clear</h3>
              <button
                onClick={toggleAllClear}
                className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 hover:underline"
              >
                {allClearSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                {allClearSelected ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-9 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {tables.map((t) => {
                  const checked = clearSelected.has(t.key);
                  return (
                    <button
                      key={t.key}
                      onClick={() => toggleOneClear(t.key)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition
                        ${checked
                          ? 'border-red-400 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                          : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:border-red-300'
                        }`}
                    >
                      {checked ? <CheckSquare className="w-3.5 h-3.5 shrink-0" /> : <Square className="w-3.5 h-3.5 shrink-0" />}
                      <span className="truncate">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            onClick={() => {
              if (clearSelected.size === 0) { toast.warning('Select at least one table to clear'); return; }
              setClearConfirmText('');
              setConfirmClear(true);
            }}
            disabled={clearMutation.isPending || clearSelected.size === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition"
          >
            <Trash2 className="w-4 h-4" />
            Clear selected ({clearSelected.size}) table{clearSelected.size !== 1 ? 's' : ''}
          </button>
        </div>
      </section>

      {/* ── Confirm clear dialog ── */}
      {confirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Clear Table Data</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  You are about to <strong>permanently delete all rows</strong> from{' '}
                  <span className="font-semibold text-red-600">{clearSelected.size} table{clearSelected.size !== 1 ? 's' : ''}</span>:{' '}
                  <span className="text-xs text-slate-500">
                    {tables.filter((t) => clearSelected.has(t.key)).map((t) => t.label).join(', ')}
                  </span>
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                  Type <strong className="text-red-600">CLEAR</strong> to confirm:
                </p>
                <input
                  autoFocus
                  value={clearConfirmText}
                  onChange={(e) => setClearConfirmText(e.target.value)}
                  placeholder="CLEAR"
                  className="mt-2 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 dark:bg-slate-700 dark:text-slate-100 font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setConfirmClear(false); setClearConfirmText(''); }}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => clearMutation.mutate(Array.from(clearSelected))}
                disabled={clearMutation.isPending || clearConfirmText !== 'CLEAR'}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-50 transition"
              >
                {clearMutation.isPending ? 'Clearing…' : 'Yes, clear now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
