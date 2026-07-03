import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/utils/**/*.test.ts', 'src/hooks/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/utils/**', 'src/hooks/**'],
      exclude: [
        'src/components/**',
        'src/App.tsx',
        'src/main.tsx',
        'src/index.css',
      ],
    }
  }
})
