import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";

import { VitePWA } from 'vite-plugin-pwa';
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src/react-app"),
		},
	},
	plugins: [
		react(),
		cloudflare(),
		tailwindcss(),
		VitePWA({
			registerType: 'autoUpdate',
			manifest: {
				name: 'Mame',
				short_name: 'Mame',
				description: 'A standard-compliant recipe database.',
				theme_color: '#1e3a8a',
				background_color: '#ffffff',
				display: 'standalone',
				icons: [
					{
						src: 'favicon.png',
						sizes: '1024x1024',
						type: 'image/png'
					},
					{
						src: 'apple-touch-icon.png',
						sizes: '1024x1024',
						type: 'image/png'
					}
				]
			}
		})
	],
});
