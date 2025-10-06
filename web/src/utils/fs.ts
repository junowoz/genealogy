import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';

export async function ensureDir(dir: string) {
  await fsp.mkdir(dir, { recursive: true });
}

export async function writeFileSafe(dest: string, data: Buffer | string) {
  await ensureDir(path.dirname(dest));
  await fsp.writeFile(dest, data);
}

export async function fileExists(p: string): Promise<boolean> {
  try {
    await fsp.access(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

