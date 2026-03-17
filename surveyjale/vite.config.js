import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Do not expose source maps in production
    sourcemap: false,
    // Target modern browsers (ES2020+) — all major browsers support this
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          'aws-sdk-transcribe': [
            '@aws-sdk/client-transcribe-streaming',
          ],
          'aws-sdk-polly': [
            '@aws-sdk/client-polly',
          ],
          'aws-amplify': [
            'aws-amplify',
            'aws-amplify/auth',
            'aws-amplify/data',
          ],
        },
      },
    },
  },
})
