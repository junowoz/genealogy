import { NextRequest, NextResponse } from 'next/server';
import { randomUUID, createHash } from 'crypto';
import path from 'path';
import { writeFileSafe } from '../../../../src/utils/fs';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Envie um arquivo em "file" (multipart/form-data)' }, { status: 400 });
  }

  const id = randomUUID();
  const arrayBuffer = await file.arrayBuffer();
  const buf = Buffer.from(arrayBuffer);
  const sha256 = createHash('sha256').update(buf).digest('hex');
  const ext = path.extname(file.name) || '.bin';
  const relPath = path.join('uploads', `${id}${ext}`);
  const absPath = path.join(process.cwd(), relPath);
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
}

