import { signal, For, If, $, onDispose, watch, peek, nextTick, onCondition, untrack, merge } from 'refui'
import { USBSerial } from './usb.js'
import { LoSharkAPIController } from './loshark.js'
import { showModal } from './components/modal.jsx'
import { Icon } from './components/icon.jsx'
import { PropVal } from './components/prop-val.jsx'
import { HexInput } from './components/hex-input.jsx'
import { BtnSwitch, CheckBox } from './components/switches.jsx'
import { EventList } from './components/event-list.jsx'
import { ChatList } from './components/chat-list.jsx'

import { ThemeChanger } from './components/theme-changer.jsx'
import { Toaster } from './components/toaster.jsx'

import { usToLocaleTimeString, getDataPreview, timespecToUnixTimestamp, unixTimestampToTimespec } from './utils.js'
import { registerProps } from './localstorage-manager.js'

import { version } from './setup.js'

const themes = {
	default: 'Default',
	light: 'Light',
	dark: 'Dark',
	cupcake: 'Cupcake',
	bumblebee: 'Bumblebee',
	emerald: 'Emerald',
	corporate: 'Corporate',
	synthwave: 'Synthwave',
	retro: 'Retro',
	cyberpunk: 'Cyberpunk',
	valentine: 'Valentine',
	halloween: 'Halloween',
	garden: 'Garden',
	forest: 'Forest',
	aqua: 'Aqua',
	lofi: 'Lofi',
	pastel: 'Pastel',
	fantasy: 'Fantasy',
	wireframe: 'Wireframe',
	black: 'Black',
	luxury: 'Luxury',
	dracula: 'Dracula',
	cmyk: 'Cmyk',
	autumn: 'Autumn',
	business: 'Business',
	acid: 'Acid',
	lemonade: 'Lemonade',
	night: 'Night',
	coffee: 'Coffee',
	winter: 'Winter',
	dim: 'Dim',
	nord: 'Nord',
	sunset: 'Sunset',
	caramellatte: 'Caramellatte',
	abyss: 'Abyss',
	silk: 'Silk'
}

export const App = ({ needRefresh, offlineReady, checkSWUpdate, updateSW, installPrompt }) => {
	const webUSBSupported = !!navigator.usb

	const showNeedRefresh = signal(needRefresh)
	const showOfflineReady = signal(offlineReady)

	const inputType = signal('text')

	const inputBox = signal()
	const inputVal = signal('')
	const hexInputVal = signal(null)
	const chatBox = signal()
	const eventBox = signal()
	const toaster = signal()
	const toasterTop = signal()

	const chatDefaultHex = signal(false)

	const notificationEnabled = signal(false)
	const notificationBtnDisabled = signal(!('Notification' in window))

	const propsOpened = signal(true)
	const eventsOpened = signal(true)
	const chatOpened = signal(false)

	const reducedAnimation = signal(false)

	const eventAutoScroll = signal(false)
	const chatAutoScroll = signal(false)

	const themeSelected = signal('default')

	let propMap = new Map()

	const propList = signal([])
	const eventList = signal([])
	const messageList = signal([])

	const inputDisabled = signal(false)
	const sendDisabled = merge(
		[inputType, inputVal, hexInputVal],
		// eslint-disable-next-line max-params
		(_inputType, _inputVal, _hexInputVal) => {
			const maxLength = propMap.get('sx126x.lora.crc')?.value?.value ? 0xfd : 0xff
			console.log(propMap.get('sx126x.lora.crc')?.value?.value, maxLength, _inputType, _inputVal.length, _hexInputVal?.byteLength)
			if (_inputType === 'text') {
				return _inputVal.length > maxLength
			} else if (_inputType === 'hex') {
				return !!(_hexInputVal && _hexInputVal.byteLength > maxLength)
			}
		}
	)

	const deviceTime = signal('')
	const browserTime = signal('')

	const usbSerial = new USBSerial(1, 5, 0xa108)
	const lsAPI = new LoSharkAPIController(usbSerial)

	const { usbDevice } = usbSerial.signals
	const { connected, modemOpened } = lsAPI.signals

	const usbDeviceSN = signal(usbDevice, (i) => (i && i.serialNumber) || '')

	let timeDelta = 0

	const handleInput = (e) => {
		inputVal.value = e.target.value
	}

	const handleHexInput = (val) => {
		hexInputVal.value = val
	}

	const scrollChatBox = () => {
		if (chatBox.value && chatOpened.value) {
			chatBox.value.scrollTo({
				top: chatBox.value.scrollHeight,
				behavior: (reducedAnimation.value && 'instant') || 'smooth'
			})
			chatBox.value.scrollIntoViewIfNeeded({
				block: 'end'
			})
		}
	}

	const scrollEventBox = () => {
		if (eventAutoScroll.value && eventBox.value && eventsOpened.value) {
			eventBox.value.scrollTo({
				top: eventBox.value.scrollHeight,
				behavior: (reducedAnimation.value && 'instant') || 'smooth'
			})
			eventBox.value.scrollIntoViewIfNeeded({
				block: 'end'
			})
		}
	}

	const addEvent = ({ timestamp, type, data }) => {
		const eventData = { timestamp, type, data }
		eventList.value.push(eventData)
		eventList.trigger()

		if (eventAutoScroll.value) setTimeout(scrollEventBox, 0)
	}

	let msgCount = 0
	let msgTimeout = 0

	const addMessage = ({ buffer, type, timestamp, signalStat, status }) => {
		const messageData = {
			buffer,
			type,
			timestamp,
			signalStat,
			status,
			showHexDump: peek(chatDefaultHex)
		}
		messageList.value.push(messageData)
		messageList.trigger()

		if (chatAutoScroll.value) setTimeout(scrollChatBox, 0)

		if (type === 'receive' && notificationEnabled.value) {
			if (document.hasFocus() && toasterTop.value) {
				toasterTop.value.show('New message received.', 2000)
			} else {
				const tag = `lsd-message-${usbDeviceSN}`
				navigator.serviceWorker.ready.then((registration) => {
					return registration.getNotifications({ tag }).then((notifications) => {
						for (let i of notifications) {
							i.close()
						}

						msgCount += 1

						clearTimeout(msgTimeout)

						msgTimeout = setTimeout(() => {
							// eslint-disable-next-line no-plusplus
							registration.showNotification(
								`You have received ${msgCount} LoRa message${(msgCount === 1 && '') || 's'}`,
								{
									renotify: true,
									body: `Messages received on ${usbDeviceSN}.\nClick to view.`,
									vibrate: [200, 100, 200],
									tag,
									icon: '/favicon.svg',
									data: {
										serialNumber: usbDeviceSN.value
									},
									timestamp: Math.floor(timestamp / 1000000)
								}
							)
						}, 50) // we add a 50ms delay for macOS to get the previous notifications fully closed
					})
				})
			}
		}
	}

	const focusHandler = () => {
		const tag = `lsd-message-${usbDeviceSN}`
		msgCount = 0
		clearTimeout(msgTimeout)
		navigator.serviceWorker.ready.then((registration) => {
			return registration.getNotifications({ tag }).then((notifications) => {
				for (let i of notifications) {
					i.close()
				}
			})
		})
	}

	window.addEventListener('focus', focusHandler)
	onDispose(() => window.removeEventListener('focus', focusHandler))

	const refreshTimeDisplay = () => {
		const browserTimestamp = Date.now() * 1000000
		const deviceTimestamp = browserTimestamp - timeDelta
		browserTime.value = usToLocaleTimeString(browserTimestamp)
		deviceTime.value = usToLocaleTimeString(deviceTimestamp)
	}

	const timeRefreshIntervalID = setInterval(refreshTimeDisplay, 1000)
	onDispose(() => clearInterval(timeRefreshIntervalID))

	const eventListener = (body) => {
		const { data } = body
		addEvent(data)
	}

	let lastSignalStat = null

	const signalListener = (body) => {
		const { signal: signalStat } = body
		const { timestamp, freqErr, rscp, rssi, snr } = signalStat
		lastSignalStat = signalStat
		addEvent({
			timestamp,
			type: 'signal',
			data: `RSSI: ${rssi}, RSCP: ${rscp}, SNR: ${snr}, FreqErr: ${freqErr.toFixed(2)}`
		})
	}

	const receiveListener = (body) => {
		const { data, signal: signalStat } = body
		const { timestamp, buffer } = data
		const dataPreview = getDataPreview(buffer)

		addEvent({
			timestamp,
			type: 'receive',
			data: dataPreview
		})

		const msg = {
			buffer,
			timestamp,
			type: 'receive'
		}

		if (signalStat) {
			msg.signalStat = signalStat
			signalListener(body)
		} else if (lastSignalStat && lastSignalStat.timestamp === timestamp) {
			msg.signalStat = lastSignalStat
		}

		addMessage(msg)
	}

	onDispose(lsAPI.addListener('event', eventListener))
	onDispose(lsAPI.addListener('signal', signalListener))
	onDispose(lsAPI.addListener('receive', receiveListener))

	const toggleUSB = () => {
		if (connected.value) lsAPI.disconnect()
		else {
			lsAPI.connect().catch((e) => {
				console.error(e)
				showModal({ title: 'OOPS' }, (R) => (
					<>
						Error happened when communicating with USB device:
						<br />
						<br />
						{e.message}
						<br />
						<br />
						Please make sure you have not opened the device with other dashboard or application, and the LoShark is
						using the{' '}
						<a
							class="link link-info"
							target="_blank"
							rel="noopener noreferrer"
							href="https://github.com/SudoMaker/loshark-generic-firmware"
						>
							correct firmware
						</a>
						. Try power cycle the device in case it&apos;s not connected properly.
					</>
				))
			})
		}
	}

	const toggleModem = async () => {
		try {
			if (modemOpened.value) await lsAPI.apiClose()
			else await lsAPI.apiOpen()
		} catch (e) {
			showModal({ title: 'Error', message: `Error toggling modem:\n\n${e.message}` })
		}
	}

	const listProps = async () => {
		try {
			const result = await lsAPI.apiListProp()
			return result.props
		} catch (e) {
			showModal({ title: 'Error', message: `Error listing props:\n\n${e.message}` })
		}
	}

	const transmitMessage = async () => {
		if (inputDisabled.value || sendDisabled.value) return

		let messageBuffer = null

		if (inputType.value === 'text') {
			const val = inputVal.value
			if (!val) return

			inputDisabled.value = true

			messageBuffer = new TextEncoder('utf-8').encode(val)
		} else if (inputType.value === 'hex') {
			messageBuffer = hexInputVal.value
			if (!messageBuffer) return
		}

		inputDisabled.value = true

		const status = signal('Sending...')

		const preview = getDataPreview(messageBuffer)

		const timestamp = Date.now() * 1000000

		try {
			addEvent({
				type: 'transmit',
				timestamp,
				data: preview
			})
			addMessage({
				buffer: messageBuffer,
				type: 'send',
				timestamp,
				status
			})
			await lsAPI.apiTransmit(messageBuffer)
			status.value = 'Sent'
		} catch (e) {
			status.value = 'Error'
			addEvent({
				type: 'transmitFailed',
				data: e.message
			})
			showModal({ title: 'Error', message: `Error transmitting message:\n\n${e.message}` })
		}

		inputDisabled.value = false

		if (inputBox.value) nextTick(() => inputBox.value.focus())

		if (inputType.value === 'text') {
			inputVal.value = ''
		} else if (inputType.value === 'hex') {
			hexInputVal.value = null
			inputBox.value.clear()
		}
	}

	const handleKey = (e) => {
		if (e.key === 'Enter') {
			transmitMessage()
			setTimeout(() => {
				if (chatBox.value) {
					chatBox.value.scrollIntoViewIfNeeded({
						block: 'end'
					})
				}
			}, 0)
		}
	}

	const refreshTime = async () => {
		if (connected.value) {
			try {
				const deviceTimestamp = timespecToUnixTimestamp(await lsAPI.apiGetTime()) * 1000000
				const browserTimestamp = Date.now() * 1000000
				timeDelta = browserTimestamp - deviceTimestamp
			} catch (e) {
				showModal({ title: 'Error', message: `Error reading device time:\n\n${e.message}` })
			}
		}
	}

	const syncTime = async () => {
		const currentTimeStamp = Date.now()
		const currentTimeSpec = unixTimestampToTimespec(currentTimeStamp)
		try {
			await lsAPI.apiSetTime(currentTimeSpec)
			await refreshTime()
		} catch (e) {
			showModal({ title: 'Error', message: `Error setting device time:\n\n${e.message}` })
		}
	}

	const refreshProps = async () => {
		untrack(refreshTime)
		const propListArr = peek(propList)
		if (modemOpened.value) {
			const props = await listProps()
			if (!props) return
			if (!propListArr.length)
				props.sort((a, b) => {
					if (a.key < b.key) return -1
					if (a.key > b.key) return 1
					return 0
				})
			for (let prop of props) {
				if (propMap.has(prop.key)) {
					const _prop = propMap.get(prop.key)
					_prop.value.value = prop.value
					_prop.value.trigger()
				} else {
					prop.value = signal(prop.value)
					propMap.set(prop.key, prop)
					propListArr.push(prop)
					propList.trigger()
				}
			}

			sendDisabled.set()
		} else {
			propListArr.length = 0
			propList.trigger()
			propMap = new Map()
		}
	}

	const setProp = async (key, val) => {
		try {
			await lsAPI.apiSetProp(key, val)
			if (toaster.value) {
				toaster.value.show('Prop saved.', 2000)
			}
		} finally {
			const prop = propMap.get(key)
			if (prop) {
				const { value } = await lsAPI.apiGetProp(key)
				prop.value.value = value
				prop.value.trigger()

				if (key === 'sx126x.lora.crc') {
					sendDisabled.set()
				}
			}
		}
	}

	const checkNotification = () => {
		if (notificationEnabled.value) {
			Notification.requestPermission().then((permission) => {
				if (permission !== 'granted') {
					notificationEnabled.value = false
					notificationBtnDisabled.value = true
					showModal({
						title: 'OOPS',
						message: "You don't have notification permission. Please check your site permission and refresh the page."
					})
				}
			})
		}
	}

	const popReducedAnimationMessage = () => {
		const _toaster = toaster.value
		const _reducedAnimation = reducedAnimation.value
		if (_toaster) {
			if (_reducedAnimation) {
				_toaster.show('Reduced animation enabled.', 1000)
			}
		}
	}

	const setThemeColor = () => {
		// eslint-disable-next-line newline-per-chained-call
		const themeColor = document.documentElement.computedStyleMap?.().get('background-color').toString()

		if (themeColor) {
			const metaTag = document.querySelector('meta[name="theme-color"]')
			metaTag.content = themeColor
		}
	}

	const clearEventList = () => {
		eventList.value = []
	}

	const clearMessageList = () => {
		messageList.value = []
	}

	watch(refreshTime)
	watch(refreshProps)
	watch(checkNotification)
	watch(popReducedAnimationMessage)

	watch(() => {
		const needRefreshShow = showNeedRefresh.value
		const toaterMethods = toaster.value
		if (needRefreshShow) {
			if (toaterMethods) {
				toaterMethods.show((R) => {
					return (
						<div class="alert alert-warning">
							<span class="material-symbols-outlined">autorenew</span>
							<span>
								New version of Dashboard is ready.
								<br />
								Click OK to reload.
							</span>
							<button class="btn" on:click={() => updateSW()}>
								OK
							</button>
						</div>
					)
				}, 5000)
			}
		}
	})

	watch(() => {
		const offlineReadyShow = showOfflineReady.value
		const toaterMethods = toaster.value
		if (offlineReadyShow) {
			if (toaterMethods) {
				toaterMethods.show({
					message: 'Offline access ready.',
					type: 'alert-success'
				})
			}
		}
	})

	watch(() => {
		if (usbDeviceSN.value) {
			history.replaceState(null, null, `/#!?sn=${usbDeviceSN}`)
		} else {
			history.replaceState(null, null, '/')
		}
	})

	themeSelected.connect(() => nextTick(setThemeColor))

	registerProps({
		notificationEnabled,

		chatDefaultHex,

		propsOpened,
		eventsOpened,
		chatOpened,

		reducedAnimation,

		eventAutoScroll,
		chatAutoScroll,

		themeSelected,

		inputType,
		inputVal
	})

	return (R) => {
		return (
			<div class="flex flex-col md:p-4 h-screen w-screen overflow-y-auto">
				<div class="flex sticky top-0 z-50">
					<div class="hidden md:block w-[env(titlebar-area-x,0px)] shrink-0 grow-0 transition-all" />
					<div class="navbar grow overflow-x-auto bg-base-300 md:rounded-box shadow-xl shadow-sky-300/10 min-h-16 mb-4 draggable">
						<div class="md:hidden w-[env(titlebar-area-x,0px)] shrink-0 grow-0 transition-all" />
						<div class="navbar-start mr-2">
							<div class="join non-draggable">
								<BtnSwitch
									class="btn min-h-12 flex flex-col items-start join-item tooltip tooltip-right leading-none"
									active="btn-info"
									inactive="btn-ghost"
									data-tip={version}
									value={reducedAnimation}
								>
									<span>LoShark</span>
									<span>Dashboard</span>
								</BtnSwitch>
								<a class="btn min-h-12 btn-ghost join-item" href="https://su.mk/store" target="_blank" rel="noopener noreferrer">
									<span class="material-symbols-outlined">store</span>
								</a>
							</div>
						</div>
						<div class="navbar-center">
							<If condition={webUSBSupported}>
								{() => (
									<div class="join hidden lg:block non-draggable">
										<BtnSwitch class="btn min-h-12 join-item" active="btn-info" value={propsOpened}>
											Props
										</BtnSwitch>
										<BtnSwitch class="btn min-h-12 join-item" active="btn-info" value={eventsOpened}>
											Events
										</BtnSwitch>
										<BtnSwitch class="btn min-h-12 join-item" active="btn-info" value={chatOpened}>
											Chat
										</BtnSwitch>
									</div>
								)}
							</If>
						</div>
						<div class="navbar-end min-w-max ml-2">
							<div class="join non-draggable">
								<If condition={connected}>
									{() => {
										return (
											<BtnSwitch
												class="btn min-h-12 tooltip tooltip-left join-item"
												active="btn-success"
												value={signal(modemOpened)}
												data-tip="Modem Power"
												on:click={toggleModem}
											>
												<span class="material-symbols-outlined">power_settings_new</span>
											</BtnSwitch>
										)
									}}
								</If>
								<BtnSwitch
									class="btn min-h-12 tooltip tooltip-left join-item"
									active="btn-success"
									inactive="btn-info"
									disabled={!webUSBSupported}
									value={signal(connected)}
									data-tip="USB Connection"
									on:click={toggleUSB}
								>
									<span class="material-symbols-outlined">{$(() => (connected.value && 'link') || 'usb')}</span>
								</BtnSwitch>
							</div>
						</div>
						<div class="md:hidden w-[calc(100vw-env(titlebar-area-x,0px)-env(titlebar-area-width,100vw))] shrink-0 grow-0 transition-all" />
					</div>
					<div class="hidden md:block w-[calc(100vw-env(titlebar-area-x,0px)-env(titlebar-area-width,100vw))] shrink-0 grow-0 transition-all" />
				</div>

				<If condition={webUSBSupported}>
					{() => (
						<div class="flex flex-col lg:flex-row relative w-full border-opacity-50 gap-4 grow mb-4 before:content-[''] before:absolute before:-z-20 before:w-full before:h-full before:bg-contain before:bg-center before:bg-fixed before:bg-no-repeat before:bg-[url('/mask-icon.svg')] before:opacity-10 before:mix-blend-luminosity before:drop-shadow-[0_8px_8px_rgba(0,0,0,0.5)]">
							<div class="collapse collapse-box">
								<CheckBox value={propsOpened} class="lg:hidden" />
								<div class="collapse-title glass backdrop-filter-none flex items-center">
									<span class="text-xl font-medium p-2">Props</span>
									<div class="join ml-auto z-20">
										<If condition={connected}>
											{() => (
												<button class="btn tooltip tooltip-left join-item" data-tip="Refresh" on:click={refreshProps}>
													<span class="material-symbols-outlined">refresh</span>
												</button>
											)}
											{() => (
												<button class="btn invisible w-0 p-0 border-0">
													<span class="material-symbols-outlined">refresh</span>
												</button>
											)}
										</If>
									</div>
								</div>
								<div class="collapse-content collapse-box-content">
									<If condition={connected}>
										{() => (
											<table class="table table-pin-rows mt-4">
												<colgroup>
													<col class="min-w-min w-1/3" />
													<col class="min-w-max w-2/3" />
												</colgroup>
												<thead>
													<tr>
														<td>Target</td>
														<td>Time</td>
													</tr>
												</thead>
												<tbody>
													<tr class="hover">
														<td>
															<div>Browser</div>
														</td>
														<td>{browserTime}</td>
													</tr>
													<tr>
														<td>
															<div>Device</div>
														</td>
														<td class="flex justify-between items-center">
															<span>{deviceTime}</span>
															<button
																class="btn btn-xs btn-ghost tooltip tooltip-left"
																data-tip="Sync browser time"
																on:click={syncTime}
															>
																<span class="material-symbols-outlined text-sm">sync</span>
															</button>
														</td>
													</tr>
												</tbody>
												<thead>
													<tr>
														<td>Description</td>
														<td>Value</td>
													</tr>
												</thead>
												<tbody>
													<If condition={modemOpened}>
														{() => (
															<For entries={propList}>
																{({ item: prop }) => {
																	const { description, key } = prop
																	return (
																		<tr>
																			<td>
																				<div class="tooltip tooltip-right text-left" data-tip={key}>
																					{description || key}
																				</div>
																			</td>
																			<td>
																				<PropVal prop={prop} setProp={setProp} />
																			</td>
																		</tr>
																	)
																}}
															</For>
														)}
														{() => (
															<tr>
																<td colSpan={2} class="text-center">
																	Turn on modem to view props
																</td>
															</tr>
														)}
													</If>
												</tbody>
											</table>
										)}
										{() => (
											<div role="alert" class="alert flex justify-center mt-4">
												<span class="material-symbols-outlined">info</span>
												<span class="text-left">Connect and turn on modem to view props.</span>
											</div>
										)}
									</If>
								</div>
							</div>

							<div class="collapse collapse-box">
								<CheckBox value={eventsOpened} class="lg:hidden" />
								<div class="collapse-title glass backdrop-filter-none flex items-center">
									<span class="text-xl font-medium p-2">Events</span>
									<div class="join ml-auto z-20">
										<BtnSwitch
											class="btn tooltip tooltip-left join-item"
											active="btn-info"
											data-tip="Auto scroll"
											value={eventAutoScroll}
										>
											<span class="material-symbols-outlined">app_promo</span>
										</BtnSwitch>
										<button class="btn tooltip tooltip-left join-item" data-tip="Clear" on:click={clearEventList}>
											<span class="material-symbols-outlined">mop</span>
										</button>
									</div>
								</div>
								<EventList messages={eventList} parentRef={eventBox} />
							</div>

							<div class="collapse collapse-box">
								<CheckBox value={chatOpened} class="lg:hidden" />
								<div class="collapse-title glass backdrop-filter-none flex items-center">
									<span class="text-xl font-medium p-2">Chat</span>
									<div class="join ml-auto z-20">
										<BtnSwitch
											class="btn tooltip tooltip-left join-item"
											active="btn-info"
											data-tip="Auto scroll"
											value={chatAutoScroll}
										>
											<span class="material-symbols-outlined">app_promo</span>
										</BtnSwitch>
										<BtnSwitch
											class="btn tooltip tooltip-left join-item"
											active="btn-info"
											data-tip="Hex for new messages"
											value={chatDefaultHex}
										>
											<span class="material-symbols-outlined">code_blocks</span>
										</BtnSwitch>
										<BtnSwitch
											class="btn tooltip tooltip-left join-item"
											active="btn-info"
											data-tip="Notification"
											value={notificationEnabled}
										>
											<span class="material-symbols-outlined">notifications</span>
										</BtnSwitch>
										<button class="btn tooltip tooltip-left join-item" data-tip="Clear" on:click={clearMessageList}>
											<span class="material-symbols-outlined">mop</span>
										</button>
									</div>
								</div>
								<ChatList messages={messageList} parentRef={chatBox}>
									<If condition={modemOpened}>
										{() => {
											const match = onCondition(inputType)
											return (
												<div class="join z-20 w-full sticky bottom-0 mt-auto pt-4">
													<select
														class="select join-item w-auto"
														value={inputType}
														disabled={inputDisabled}
														on:change={(e) => {
															inputType.value = e.target.value
														}}
													>
														<option disabled>Type</option>
														<option value="text" selected={match('text')}>
															TEXT
														</option>
														<option value="hex" selected={match('hex')}>
															HEX
														</option>
													</select>
													<If condition={() => inputType.value === 'text'}>
														{() => {
															return (
																<input
																	class="input invalid:input-error w-full join-item"
																	type="text"
																	value={inputVal}
																	on:input={handleInput}
																	on:keypress={handleKey}
																	$ref={inputBox}
																/>
															)
														}}
														{() => {
															return (
																<HexInput
																	class="input invalid:input-error w-full font-mono join-item"
																	onChange={handleHexInput}
																	on:keypress={handleKey}
																	expose={(m) => {inputBox.value = m}}
																/>
															)
														}}
													</If>

													<button
														class="btn join-item"
														disabled={inputDisabled.or(sendDisabled)}
														on:click={transmitMessage}
													>
														<span class="material-symbols-outlined">
															{$(() => (sendDisabled.value && 'backspace') || 'send')}
														</span>
													</button>
												</div>
											)
										}}
									</If>
								</ChatList>
							</div>
						</div>
					)}
					{() => (
						<div class="text-center text-sm mt-8">
							<span>Your browser does not support WebUSB.</span>
							<br />
							<span>
								Learn more about{' '}
								<a class="link link-info" target="_blank" rel="noopener noreferrer" href="https://caniuse.com/webusb">
									WebUSB browser support status
								</a>
							</span>
							.
						</div>
					)}
				</If>

				<footer class="footer items-center grid-flow-col mt-auto md:rounded-box min-h-16 p-4 bg-base-300 text-base-content">
					<aside class="justify-self-start">
						<p>Copyright © {new Date().getFullYear()} SudoMaker, Ltd.</p>
					</aside>
					<div class="grid-flow-col justify-self-end">
						<div class="join justify-self-end">
							<ThemeChanger
								class="dropdown dropdown-top dropdown-end focus:dropdown-open join-item"
								join-item
								value={themeSelected}
								options={themes}
							/>
							<If condition={installPrompt}>
								{() => (
									<button
										class="btn btn-sm btn-success btn-outline tooltip tooltip-left join-item"
										data-tip="Install to home screen"
										on:click={async () => {
											const result = await installPrompt.value.prompt()
											if (result.outcome === 'accepted') installPrompt.value = null
										}}
									>
										<span class="material-symbols-outlined text-sm">download_for_offline</span>
									</button>
								)}
							</If>
							<If condition={checkSWUpdate}>
								{() => (
									<button
										class="btn btn-sm btn-success btn-ghost tooltip tooltip-left join-item"
										class:btn-success={needRefresh}
										class:btn-ghost={() => !needRefresh.value}
										on:click={() => {
											if (needRefresh.value) return updateSW()
											else checkSWUpdate.value()
										}}
										data-tip={() => (needRefresh.value && 'Upgrade ready. Click to reload') || 'Check for update'}
									>
										<span class="material-symbols-outlined text-sm">autorenew</span>
									</button>
								)}
							</If>
							<a
								class="btn btn-sm btn-ghost join-item"
								href="https://github.com/SudoMaker/LoShark-Dashboard"
								target="_blank"
								rel="noopener noreferrer"
							>
								<Icon class="w-4 h-4" href="#github-icon" />
							</a>
						</div>
					</div>
				</footer>

				<Toaster class="toast toast-start toast-bottom z-50" expose={(m) => {toaster.value = m}} />
				<Toaster class="toast toast-start toast-top z-50 mt-[env(titlebar-area-height,0px)]" expose={(m) => {toasterTop.value = m}} />
			</div>
		)
	}
}
