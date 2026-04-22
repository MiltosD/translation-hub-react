import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? './' : '/',
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: (chunkInfo) =>
          chunkInfo.name === 'index'
            ? 'assets/[name].js'
            : 'assets/[name]-[hash].js',
        chunkFileNames: (chunkInfo) =>
          chunkInfo.name.startsWith('vendor-')
            ? 'assets/[name].js'
            : 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) =>
          assetInfo.name === 'index.css'
            ? 'assets/[name][extname]'
            : 'assets/[name]-[hash][extname]',
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom'],
          'vendor-router': ['react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-table': ['@tanstack/react-table'],
          'vendor-ui': ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers'],
          'vendor-utils': ['clsx', 'tailwind-merge', 'class-variance-authority'],
        },
      },
    },
    chunkSizeWarningLimit: 600, // Increase limit slightly since we're optimizing
  },
}));
