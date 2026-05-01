/**
 * Shared constants and helpers for proposal document uploads.
 * The actual Multer lifecycle is handled by ProposalUploadInterceptor so that
 * the reference-based filename can be resolved via an async DB look-up.
 */

import { BadRequestException } from '@nestjs/common';
import { join } from 'path';

// ─── Allowed MIME types ───────────────────────────────────────────────────────
export const PROPOSAL_ALLOWED_MIME_TYPES: ReadonlyArray<string> = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
];

// ─── Upload directory ─────────────────────────────────────────────────────────
export const PROPOSAL_UPLOAD_DIR = join(process.cwd(), 'uploads', 'proposals');

// ─── fileFilter ───────────────────────────────────────────────────────────────
export const proposalFileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
): void => {
  if (PROPOSAL_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new BadRequestException(
        `Unsupported file type "${file.mimetype}". Allowed: PDF, Word, Excel, JPEG, PNG`,
      ),
      false,
    );
  }
};
