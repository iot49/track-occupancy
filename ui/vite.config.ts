import { defineConfig, type UserConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import basicSsl from '@vitejs/plugin-basic-ssl';
import type { InlineConfig } from 'vitest';

interface VitestConfig extends UserConfig {
  test?: InlineConfig;
}

const config: VitestConfig = {
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/@shoelace-style/shoelace/dist/assets',
          dest: 'shoelace',
        },
        {
          src: 'node_modules/onnxruntime-web/dist/*.{wasm,mjs,js}',
          dest: 'ort',
        },
        {
          src: '../cnn/models/*.{ort,json}',
          dest: 'models',
        },
      ],
    }) as any,
    ...(process.env.HTTP ? [] : [basicSsl()]),
  ],
  resolve: {
    dedupe: ['lit', 'lit-html', 'lit-element'],
  },
  server: {
    host: true,
    fs: {
      allow: ['..'],
    },
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'onnx-vendor': ['onnxruntime-web'],
        },
      },
    },
  },
};

export default defineConfig(config);
