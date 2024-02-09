import { signal } from 'refui'
import { pack as mpPack, unpack as mpUnpack } from 'msgpackr'
import { createBlockEncoder, createBlockDecoder } from 'ucobs'

export class LoSharkAPIController {
	constructor(usbSerial) {
		this.usbSerial = usbSerial
		this.localPacketCounter = 1
		this.remotePacketCounter = -1
		this.pendingAPIRequests = new Map()

		this.cobsEnc = createBlockEncoder((data) => usbSerial.write(data))
		this.cobsDec = createBlockDecoder((data) => {
			try {
				this.handleAPI(mpUnpack(data))
			} catch (e) {
				console.log('mp dec err', e)
			}
		})

		this.listeners = {
			result: new Set(),
			event: new Set(),
			signal: new Set(),
			receive: new Set()
		}

		this.signals = {
			connected: signal(false),
			modemOpened: signal(false)
		}

		this.addListener('result', (apiBody) => {
			if (apiBody.result && apiBody.result.rid) {
				if (this.pendingAPIRequests.has(apiBody.result.rid)) {
					const [resolve, reject] = this.pendingAPIRequests.get(apiBody.result.rid)
					if (apiBody.result.success) {
						resolve(apiBody.data)
					} else {
						reject(apiBody.result.message)
					}
				}
			}
		})
	}

	get connected() {
		return this.signals.connected.value
	}
	set connected(val) {
		this.signals.connected.value = val
	}

	get modemOpened() {
		return this.signals.modemOpened.value
	}
	set modemOpened(val) {
		this.signals.modemOpened.value = val
	}

	addListener(type, cb) {
		const listenerSet = this.listeners[type]
		listenerSet.add(cb)
		return () => listenerSet.delete(cb)
	}

	removeListener(type, cb) {
		this.listeners[type].delete(cb)
	}

	packetCounterFetchAdd() {
		const ret = this.localPacketCounter
		this.localPacketCounter = (this.localPacketCounter % 4294967295) + 1
		return ret
	}

	waitAPIResult(id) {
		return new Promise((resolve, reject) => {
			this.pendingAPIRequests.set(id, [
				(result) => {
					this.pendingAPIRequests.delete(id)
					resolve(result)
				},
				(err) => {
					this.pendingAPIRequests.delete(id)
					reject(new Error(`LoShark Device: ${err}`))
				}
			])
		})
	}

	sendAPIRequest(apiBody) {
		apiBody.id = this.packetCounterFetchAdd()
		this.sendAPIBody(apiBody)
		return this.waitAPIResult(apiBody.id)
	}

	sendAPIRequestWithTimeout(apiBody, timeout = 500) {
		const future = this.sendAPIRequest(apiBody)
		return new Promise((resolve, reject) => {
			let savedRemoteID = this.remotePacketCounter
			let timeoutID = 0
			const checkTimeout = () => {
				if (this.remotePacketCounter <= savedRemoteID) {
					reject(new Error('LoShark API: Communication timeout.'))
				} else {
					savedRemoteID = this.remotePacketCounter
					timeoutID = setTimeout(checkTimeout, timeout)
				}
			}
			timeoutID = setTimeout(checkTimeout, timeout)
			future.then((result) => {
				clearTimeout(timeoutID)
				return resolve(result)
			}).catch((e) => {
				clearTimeout(timeoutID)
				return reject(e)
			})
		})
	}

	apiPing() {
		return this.sendAPIRequestWithTimeout({ op: 'ping' })
	}

	async apiOpened() {
		const opened = await this.sendAPIRequestWithTimeout({ op: 'opened' })
		this.modemOpened = opened
		return opened
	}

	async apiOpen() {
		if (await this.apiOpened()) return
		await this.sendAPIRequestWithTimeout({ op: 'open' })
		await this.apiOpened()
	}

	async apiClose() {
		if (await this.apiOpened()) {
			await this.sendAPIRequestWithTimeout({ op: 'close' })
			await this.apiOpened()
		}
	}

	apiGetTime() {
		return this.sendAPIRequestWithTimeout({ op: 'gettime' })
	}

	apiSetTime(data) {
		return this.sendAPIRequestWithTimeout({ op: 'settime', data })
	}

	apiGetProp(key) {
		return this.sendAPIRequestWithTimeout({ op: 'getprop', data: { key: key } })
	}

	apiSetProp(key, value) {
		return this.sendAPIRequestWithTimeout(
			{
				op: 'setprop',
				data: { key, value }
			},
			500
		)
	}

	apiListProp() {
		return this.sendAPIRequestWithTimeout({ op: 'listprop' }, 2000)
	}

	apiTransmit(buffer) {
		return this.sendAPIRequest({ op: 'transmit', data: { buffer } })
	}

	sendAPIBody(apiBody) {
		apiBody.id = this.packetCounterFetchAdd()
		console.log('api tx', apiBody)

		const apiMp = mpPack(apiBody)

		this.cobsEnc(apiMp)
	}

	emit(type, data) {
		this.listeners[type].forEach((i) => i(data))
	}

	handleAPI(apiBody) {
		console.log('api rx', apiBody)
		this.remotePacketCounter = apiBody.id
		this.emit(apiBody.op, apiBody)
	}

	// Cursed to use async executor with Promise though
	// But USB communication requires constant polling
	// While we cannot check apiOpened without USB polling starts
	// So this makes things easier to handle
	connect() {
		// eslint-disable-next-line no-async-promise-executor
		return new Promise(async (resolve, reject) => {
			if (this.connected) return reject(new Error('LoShark API: Already connected.'))

			try {
				await this.usbSerial.open()
			} catch (e) {
				reject(e)
				this.usbSerial.close()
				return
			}

			this.connected = true

			this.apiOpened().catch((e) => {
				reject(e)
				this.connected = false
				this.modemOpened = false
				this.usbSerial.close()
			})

			try {
				while (this.usbSerial.opened && this.connected) {
					const recvBuf = await this.usbSerial.read()
					this.cobsDec(new Uint8Array(recvBuf))
				}
				console.log('usb recv fin!')
			} catch (e) {
				console.log('usb recv err!')
				reject(e)
			}

			try {
				await this.usbSerial.close()
			} catch (e) {
				reject(e)
			}

			this.connected = false
			this.modemOpened = false

			resolve()
		})
	}

	async disconnect() {
		this.connected = false
		this.modemOpened = false

		await this.apiPing()

		this.pendingAPIRequests.forEach(([, reject]) => {
			reject()
		})
	}
}
