// dShopping Lite - Vite Configuration (Ultra-Optimized Setup with Tailwind v4)
// Desarrollado para el máximo rendimiento de carga inicial, caché y tamaño de bundle

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // Plugin oficial de Tailwind CSS v4 para compilación de alto rendimiento en Vite
  ],
  resolve: {
    alias: {
      // Configuración de Path Aliases para importaciones limpias en el proyecto
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true, // Abre el navegador al iniciar el dev server
    host: true, // Expone en la red local
  },
  build: {
    // Target de compilación moderno para generar el JS más optimizado y de menor tamaño
    target: 'es2022',
    
    // Límite agresivo de inlining de assets (SVGs e imágenes menores a 8KB se inyectan en Base64)
    assetsInlineLimit: 8192,
    
    // Optimización de la compilación
    minify: 'esbuild',
    cssCodeSplit: true, // Fragmentación de CSS por vistas para carga perezosa
    sourcemap: false, // Deshabilitado en producción para ahorrar bytes y velocidad de construcción
    
    // Configuración avanzada de Rollup para segmentación inteligente de código (Manual Chunking)
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Fragmentar dependencias de terceros para maximizar el almacenamiento en caché
          if (id.includes('node_modules')) {
            // Grandes librerías de exportación independientes (de carga bajo demanda/modal)
            if (id.includes('xlsx')) {
              return 'vendor-xlsx';
            }
            if (id.includes('jspdf') || id.includes('jspdf-autotable')) {
              return 'vendor-pdf';
            }
            // Agrupar el resto de dependencias de node_modules en un único bloque de proveedores
            // Esto evita cualquier referencia circular entre el core (React, Zustand, etc.) y dependencias anidadas
            return 'vendor';
          }
        },
        // Nombres consistentes de archivos de salida para cacheado
        entryFileNames: 'assets/js/[name]-[hash].js',
        chunkFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
  },
  // Optimización de esbuild para producción: eliminar llamadas de depuración
  esbuild: {
    drop: ['console', 'debugger'],
  },
});
