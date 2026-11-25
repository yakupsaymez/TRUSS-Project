import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

function manualChunks(id) {
  if (!id.includes('node_modules')) return undefined;
  const norm = id.replace(/\\/g, '/');

  if (norm.includes('/node_modules/recharts/')) {
    return 'vendor-charts';
  }
  if (
    norm.includes('/node_modules/d3-') ||
    norm.includes('/node_modules/victory-vendor/') ||
    norm.includes('/node_modules/internmap/') ||
    norm.includes('/node_modules/decimal.js-light/') ||
    norm.includes('/node_modules/es-toolkit/') ||
    norm.includes('/node_modules/@reduxjs/') ||
    norm.includes('/node_modules/redux') ||
    norm.includes('/node_modules/reselect/') ||
    norm.includes('/node_modules/react-redux/') ||
    norm.includes('/node_modules/immer/')
  ) {
    return 'vendor-charts-core';
  }
  if (norm.includes('/node_modules/@tanstack/')) {
    return 'vendor-table';
  }
  if (
    norm.includes('/node_modules/motion/') ||
    norm.includes('/node_modules/motion-dom/') ||
    norm.includes('/node_modules/motion-utils/') ||
    norm.includes('/node_modules/framer-motion/')
  ) {
    return 'vendor-motion';
  }
  if (
    norm.includes('/node_modules/@radix-ui/') ||
    norm.includes('/node_modules/radix-ui/')
  ) {
    return 'vendor-radix';
  }
  if (norm.includes('/node_modules/lucide-react/')) {
    return 'vendor-icons';
  }
  if (
    norm.includes('/node_modules/react/') ||
    norm.includes('/node_modules/react-dom/') ||
    norm.includes('/node_modules/react-router') ||
    norm.includes('/node_modules/scheduler/')
  ) {
    return 'vendor-react';
  }
  return undefined;
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
  esbuild: {
    loader: 'jsx',
    include: /src[\\/].*\.(js|jsx)$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
});
