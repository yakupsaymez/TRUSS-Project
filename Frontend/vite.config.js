import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

function manualChunks(id) {
  if (!id.includes('node_modules')) return undefined;
  const norm = id.replace(/\\/g, '/');

  if (
    norm.includes('/node_modules/recharts/') ||
    norm.includes('/node_modules/d3-') ||
    norm.includes('/node_modules/victory-vendor/')
  ) {
    return 'vendor-charts';
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
