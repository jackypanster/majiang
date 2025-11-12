import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // Path alias configuration
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },

  // Development server configuration
  server: {
    port: 5173,
    host: true,  // Listen on all addresses (including LAN)
    open: true,  // Automatically open browser on startup

    // Proxy configuration to solve CORS issues in development
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },

  // Production build configuration
  build: {
    outDir: 'dist',
    sourcemap: false,  // Disable sourcemap in production

    // Code splitting optimization
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'query-vendor': ['@tanstack/react-query'],
          'zustand-vendor': ['zustand'],
          'axios-vendor': ['axios']
        }
      }
    },

    // Compression configuration
    minify: 'esbuild',

    // Chunk size warning threshold (KB)
    chunkSizeWarningLimit: 1000
  },

  // Environment variable prefix (only VITE_ prefixed variables are exposed to client)
  envPrefix: 'VITE_'
})
