// import { defineConfig } from 'vite';
// import tailwindcss from '@tailwindcss/vite';  // Ensure you're using `import` for ESM packages
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';             // ← add this
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/', // ✅ add this
  plugins: [react(), tailwindcss()],
  resolve: {                        // ← add alias here
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.jsx?$/,
  },
  server: { port: 3000 },
});
