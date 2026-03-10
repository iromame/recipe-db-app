import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";

import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
	plugins: [
		react(),
		cloudflare(),
		tailwindcss(),
		VitePWA({
			registerType: 'autoUpdate',
			manifest: {
				name: 'Family Recipe Kitchen',
				short_name: 'Recipes',
				description: 'A standard-compliant recipe database.',
				theme_color: '#1e3a8a', // blue-900 approx
				background_color: '#ffffff',
				display: 'standalone',
				icons: [
					{
						src: 'icons/icon-192x192.svg',
						sizes: '192x192',
						type: 'image/svg+xml'
					},
					{
						src: 'icons/icon-512x512.svg',
						sizes: '512x512',
						type: 'image/svg+xml'
					}
				]
			}
		})
	],
});
