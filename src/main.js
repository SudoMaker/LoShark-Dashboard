import './main.css'
import { registerSW } from 'virtual:pwa-register'
import { signal } from 'refui'
import { render } from './setup.js'
import { App } from './app.jsx'

// Check update per 6 hour
const intervalMS = 6 * 60 * 60 * 1000

const needRefresh = signal(false)
const offlineReady = signal(false)
const checkSWUpdate = signal()
const installPrompt = signal()

const updateSW = registerSW({
	onNeedRefresh() {
		needRefresh.value = true
	},
	onOfflineReady() {
		offlineReady.value = true
	},
	onRegisteredSW(swUrl, r) {
		if (r) {
			checkSWUpdate.value = async () => {
				if (!(!r.installing && navigator)) return

				if ('connection' in navigator && !navigator.onLine) return

				const resp = await fetch(swUrl, {
					cache: 'no-store',
					headers: {
						cache: 'no-store',
						'cache-control': 'no-cache'
					}
				})

				if (resp?.status === 200) await r.update()
			}

			setInterval(checkSWUpdate.value, intervalMS)
		}
	}
})

window.addEventListener('beforeinstallprompt', (event) => {
	event.preventDefault()
	installPrompt.value = event
})

window.app = render(document.body, App, { needRefresh, offlineReady, checkSWUpdate, updateSW, installPrompt })
