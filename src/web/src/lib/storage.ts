import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";

const STORAGE_ROOT = path.resolve(process.cwd(), "storage");
const RESUMES_DIR = path.join(STORAGE_ROOT, "resumes");
const GENERATED_DIR = path.join(STORAGE_ROOT, "resumes-generated");
const BACKUPS_DIR = path.join(STORAGE_ROOT, "resume-backups");

export async function ensureResumesDir(): Promise<string> {
  await mkdir(RESUMES_DIR, { recursive: true });
  return RESUMES_DIR;
}

export async function ensureGeneratedDir(): Promise<string> {
  await mkdir(GENERATED_DIR, { recursive: true });
  return GENERATED_DIR;
}

export async function ensureResumeBackupsDir(): Promise<string> {
  await mkdir(BACKUPS_DIR, { recursive: true });
  return BACKUPS_DIR;
}

export function resumePath(filename: string): string {
  return path.join(RESUMES_DIR, filename);
}

export function generatedResumePath(id: number, updatedAtMs: number): string {
  return path.join(GENERATED_DIR, `master-${id}-${updatedAtMs}.pdf`);
}

export function generatedVariantPath(variantId: number, createdAtMs: number): string {
  return path.join(GENERATED_DIR, `variant-${variantId}-${createdAtMs}.pdf`);
}

export function resumeBackupPath(resumeId: number, updatedAtMs: number): string {
  return path.join(BACKUPS_DIR, `resume-${resumeId}-${updatedAtMs}.json`);
}

export async function deleteResumeFile(filename: string): Promise<void> {
  try {
    await unlink(resumePath(filename));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
}

export function generateResumeFilename(originalName: string): string {
  const ext = path.extname(originalName) || ".pdf";
  const slug =
    path
      .basename(originalName, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "resume";
  return `${slug}-${Date.now()}${ext}`;
}

export function slugifyForDownload(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "resume";
}
