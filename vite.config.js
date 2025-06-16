// vite.config.js
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import tailwindcss from '@tailwindcss/vite'

import packageJson from './package.json'

export default defineConfig({
	esbuild: {
		jsxFactory: 'R.c',
		jsxFragment: 'R.f'
	},
	define: {
		__DASHBOARD_VERSION__: JSON.stringify(packageJson.version)
	},
	plugins: [
		tailwindcss(),
		VitePWA({
			strategies: 'injectManifest',
			srcDir: 'src',
			filename: 'sw.js',
			manifest: {
				name: 'LoShark Dashboard',
				short_name: 'LSD',
				description: 'Dashboard for the LoShark USB LoRa dongle',
				theme_color: '#07121f',
				background_color: '#1d232a',
				display: 'standalone',
				display_override: ['window-controls-overlay'],
				icons: [
					{
						src: '/pwa-192x192.png',
						sizes: '192x192',
						type: 'image/png'
					},
					{
						src: '/pwa-512x512.png',
						sizes: '512x512',
						type: 'image/png'
					},
					{
						src: '/favicon.svg',
						sizes: '1024x1024',
						type: 'image/svg'
					},
					{
						src: '/mask-icon.svg',
						sizes: '1024x1024',
						type: 'image/svg',
						purpose: 'maskable'
					},
					{
						src: '/mask-icon.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable'
					}
				]
			}
		})
	]
})
