import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig, PluginOption } from "vite";

import sparkPlugin from "@github/spark/spark-vite-plugin";
import createIconImportProxy from "@github/spark/vitePhosphorIconProxyPlugin";
import { resolve } from 'path'

const projectRoot = process.env.PROJECT_ROOT || import.meta.dirname

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // DO NOT REMOVE
    createIconImportProxy() as PluginOption,
    sparkPlugin() as PluginOption,
  ],
  resolve: {
    alias: {
      '@': resolve(projectRoot, 'src'),
      // Force single React instance to prevent hook errors
      'react': resolve(projectRoot, 'node_modules/react'),
      'react-dom': resolve(projectRoot, 'node_modules/react-dom'),
    },
    dedupe: ['react', 'react-dom'],
  },
  build: {
    // Output directory for Capacitor
    outDir: 'dist',
    // Optimize chunk size for mobile
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // Manual chunks for better code splitting
        manualChunks: {
          // Firebase in its own chunk - loaded only when needed
          'firebase': ['firebase/app', 'firebase/firestore', 'firebase/auth', 'firebase/storage'],
          // Charts library - heavy (~500KB), separate chunk
          'charts': ['recharts', 'd3'],
          // PDF generation - only load when generating PDFs (~300KB)
          'pdf': ['jspdf', 'html2canvas'],
          // 3D graphics - very heavy (~600KB), only load if needed
          'three': ['three'],
          // UI components - shared across the app
          'radix-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-tabs',
            '@radix-ui/react-select',
            '@radix-ui/react-popover',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-switch',
            '@radix-ui/react-label',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-separator',
            '@radix-ui/react-slot',
          ],
          // Animation library
          'motion': ['framer-motion'],
          // Form handling
          'forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          // Date utilities
          'date': ['date-fns', 'react-day-picker'],
          // Capacitor plugins
          'capacitor': ['@capacitor/filesystem', '@capacitor/share', '@capacitor/camera'],
          // Vendor - react and react-dom
          'vendor': ['react', 'react-dom'],
        }
      }
    },
    // Disable source maps for production mobile builds
    sourcemap: false,
    // Use esbuild for fast minification (built-in)
    minify: 'esbuild',
    // Target modern mobile browsers for smaller output
    target: ['es2020', 'chrome87', 'safari14'],
    // CSS code split for better caching
    cssCodeSplit: true,
  },
  // Server configuration for development
  server: {
    host: '0.0.0.0', // Allow access from mobile devices on local network
    port: 5173,
    strictPort: false,
  },
  // Preview server for testing production builds
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
  // Optimize dependencies for mobile
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@capacitor/core',
      '@capacitor/filesystem',
      '@capacitor/share',
    ],
    exclude: ['@github/spark']
  }
});
