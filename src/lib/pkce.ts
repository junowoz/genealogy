import { createHash, randomBytes } from 'node:crypto';

export function generateCodeVerifier(byteLength = 64) {
  return base64Url(randomBytes(byteLength));
}

export function generateCodeChallenge(verifier: string) {
  const hash = createHash('sha256').update(verifier).digest();
  return base64Url(hash);
}

function base64Url(buffer: Buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}
