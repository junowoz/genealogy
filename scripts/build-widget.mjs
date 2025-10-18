import { build } from 'esbuild';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

const rootDir = process.cwd();
const entry = path.join(rootDir, 'widgets/index.tsx');
const outdir = path.join(rootDir, 'public/mcp');

await mkdir(outdir, { recursive: true });

const result = await build({
  entryPoints: [entry],
  outfile: path.join(outdir, 'widget.js'),
  bundle: true,
  platform: 'browser',
  format: 'esm',
  target: ['es2020'],
  minify: true,
  sourcemap: false,
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'development'),
  },
});

if (result.errors?.length) {
  console.error(result.errors);
  process.exit(1);
}

await writeFile(path.join(outdir, 'widget.css'), '', { flag: 'w' });
