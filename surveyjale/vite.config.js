import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'aws-sdk': [
            '@aws-sdk/client-transcribe-streaming',
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
