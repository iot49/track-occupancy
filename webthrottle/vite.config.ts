import { defineConfig, type UserConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import type { InlineConfig } from 'vitest';

interface VitestConfig extends UserConfig {
  test?: InlineConfig;
}

const config: VitestConfig = {
  plugins: [
    ...(process.env.HTTP ? [] : [basicSsl()]),
  ],
  resolve: {
    dedupe: ['lit', 'lit-html', 'lit-element'],
  },
  server: {
    host: true,
    port: 5174,
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
};

export default defineConfig(config);
