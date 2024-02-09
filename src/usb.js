import { signal } from 'refui'

export class USBSerial {
	constructor(nConfig, nIntf, vID) {
		this.nConfig = nConfig
		this.nIntf = nIntf
		this.vID = vID

		this.signals = {
			opened: signal(false),
			usbDevice: signal(null)
		}
	}

	get opened() {
		return this.signals.opened.value
	}
	set opened(val) {
		this.signals.opened.value = val
	}

	get usbDevice() {
		return this.signals.usbDevice.value
	}
	set usbDevice(val) {
		this.signals.usbDevice.value = val
	}

	async open() {
		const usbDevice = await navigator.usb.requestDevice({
			filters: [{ vendorId: this.vID }]
		})

		this.usbDevice = usbDevice

		await usbDevice.open()
		await usbDevice.selectConfiguration(this.nConfig)
		await usbDevice.claimInterface(this.nIntf)

		const endpoints = usbDevice.configuration.interfaces[this.nIntf].alternate.endpoints

		for (const endpoint of endpoints) {
			if (endpoint.direction === 'in') {
				this.nEPIn = endpoint.endpointNumber
			} else {
				this.nEPOut = endpoint.endpointNumber
			}
		}

		this.opened = true
	}

	async close() {
		if (!this.usbDevice) return
		await this.usbDevice.close()
		this.opened = false
		this.usbDevice = null
	}

	async write(buf) {
		await this.usbDevice.transferOut(this.nEPOut, buf)
	}

	async read() {
		const result = await this.usbDevice.transferIn(this.nEPIn, 4096)
		return result.data.buffer
	}
}
