import { NextResponse } from 'next/server';
import { randomUUID, createHash } from 'crypto';
import { writeFileSafe } from '../../../../src/utils/fs';
import {
  FamilySearchAuthError,
  getFamilySearchContext,
} from '../../../../src/lib/familysearch/client';
import {
  extensionForUpload,
  getAppDataPath,
  MAX_UPLOAD_BYTES,
} from '../../../../src/lib/storage';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    await getFamilySearchContext();

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Envie um arquivo em "file" (multipart/form-data)' }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'Arquivo excede o limite de 10 MB' }, { status: 413 });
    }

    const ext = extensionForUpload(file.type, file.name);
    if (!ext) {
      return NextResponse.json({ error: 'Tipo de arquivo não permitido' }, { status: 415 });
    }

    const id = randomUUID();
    const arrayBuffer = await file.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);
    const sha256 = createHash('sha256').update(buf).digest('hex');
    const relPath = `uploads/${id}${ext}`;
    const absPath = getAppDataPath('uploads', `${id}${ext}`);
    await writeFileSafe(absPath, buf);

    return NextResponse.json({
      upload: {
        id,
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        size: buf.byteLength,
        sha256,
        storagePath: relPath,
        uploadedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    if (err instanceof FamilySearchAuthError) {
      return NextResponse.json({ error: 'auth_required', message: err.message }, { status: 401 });
    }
    throw err;
  }
}
