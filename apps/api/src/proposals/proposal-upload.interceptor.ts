/**
 * ProposalUploadInterceptor
 *
 * A NestJS injectable interceptor that handles the full Multer lifecycle for
 * proposal document uploads. By running BEFORE the controller action it can:
 *
 *  1. Query the DB for the proposal's ticket referenceId (async — not possible
 *     inside a plain diskStorage filename callback).
 *  2. Delete the previous document file so the upload slot is always clean.
 *  3. Configure a per-request diskStorage instance whose filename callback
 *     already knows the correct reference-based name.
 *  4. Stream the file to disk ONCE, with the final name — no temp file, no
 *     post-upload rename.
 *
 * The controller action receives req.file via @UploadedFile() as normal.
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import * as multer from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { PROPOSAL_UPLOAD_DIR, proposalFileFilter } from './proposal-upload.config';

@Injectable()
export class ProposalUploadInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const req = context.switchToHttp().getRequest<
      Express.Request & { params: Record<string, string> }
    >();
    const res = context.switchToHttp().getResponse();
    const proposalId: string = req.params.id;

    // ── 1. Fetch only what we need for naming + cleanup ───────────────────────
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      select: {
        documentUrl: true,
        ticket: { select: { referenceId: true } },
      },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal ${proposalId} not found`);
    }

    // ── 2. Ensure upload directory exists ─────────────────────────────────────
    mkdirSync(PROPOSAL_UPLOAD_DIR, { recursive: true });

    // ── 3. Remove the previous file so we always write a clean, non-colliding
    //       filename (same refNumber + same extension → same slot). ──────────
    if (proposal.documentUrl) {
      const oldFilename = proposal.documentUrl.split('/').pop();
      if (oldFilename) {
        const oldPath = join(PROPOSAL_UPLOAD_DIR, oldFilename);
        if (existsSync(oldPath)) {
          try { unlinkSync(oldPath); } catch { /* ignore concurrent-delete races */ }
        }
      }
    }

    // ── 4. Build the reference-based filename ─────────────────────────────────
    const ticketRef = proposal.ticket?.referenceId ?? proposalId.slice(0, 8);
    const sanitizedRef = ticketRef.replace(/[^a-zA-Z0-9_-]/g, '-');

    // ── 5. Build a per-request diskStorage with the correct filename baked in ─
    const storage = multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, PROPOSAL_UPLOAD_DIR),
      filename: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase() || '.bin';
        cb(null, `${sanitizedRef}${ext}`);
      },
    });

    // ── 6. Run Multer as a one-shot promise ───────────────────────────────────
    const upload = multer({
      storage,
      limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
      fileFilter: proposalFileFilter,
    }).single('file');

    await new Promise<void>((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      upload(req as any, res as any, (err: unknown) => {
        if (err) {
          // Re-throw multer errors as NestJS HTTP exceptions so the global
          // exception filter can serialise them properly.
          reject(
            err instanceof Error
              ? new BadRequestException(err.message)
              : new BadRequestException('File upload failed'),
          );
        } else {
          resolve();
        }
      });
    });

    return next.handle();
  }
}
