import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Build a single ESM bundle for embedding into the HTML resource
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'src/widget.tsx'),
      name: 'GenearchiveWidget',
      formats: ['es'],
      fileName: () => 'widget.js'
    },
    rollupOptions: {
      // Bundle React into the output for simplicity
      external: [],
      output: {
        assetFileNames: (asset) => {
          if (asset.name && asset.name.endsWith('.css')) return 'widget.css';
          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  }
});

