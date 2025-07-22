import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss()],
	build: {
		target: 'es2015',
		minify: 'terser',
		terserOptions: {
			compress: {
				drop_console: true,
				drop_debugger: true,
			},
		},
		rollupOptions: {
			output: {
				manualChunks: {
					vendor: ['react', 'react-dom'],
					router: ['react-router-dom'],
					ui: ['zustand'],
				},
			},
		},
		chunkSizeWarningLimit: 1000,
		sourcemap: false,
	},
	server: {
		headers: {
			'Cache-Control': 'max-age=31536000',
		},
	},
	optimizeDeps: {
		include: ['react', 'react-dom', 'react-router-dom', 'zustand'],
	},
});
