import { signal, derivedExtract, peek, If, watch, connect } from 'refui'
import { ListView } from './list-view.jsx'
import { BufferView } from './buffer-view.jsx'
import { CheckBox } from './switches.jsx'
import { usToLocaleTimeString } from '../utils.js'

export const ChatList = ({ messages, parentRef = signal() }, ...children) => {
	const listView = signal()
	const { frontSpacerHeight, backSpacerHeight } = derivedExtract(listView, 'frontSpacerHeight', 'backSpacerHeight')

	const handleScroll = () => {
		listView.value?.handleScroll()
	}

	return (R) => {
		return (
			<div
				class="collapse-content collapse-box-content relative flex flex-col"
				$ref={parentRef}
				on-passive:scroll={handleScroll}
			>
				<div class="grow-0 shrink-0" style:height={() => `${frontSpacerHeight}px`} />
				<ListView tracked preload entries={messages} overscan={5} itemHeight={108} parentRef={parentRef} $ref={listView}>
					{({ item: props, index: idx, reportHeight, preloading = false }) => {
						const { buffer, type, timestamp, signalStat, status, showHexDump } = derivedExtract(props)
						const timeString = signal(timestamp, usToLocaleTimeString)
						const isReceiveMsg = type.neq('send')
						const isSendMsg = type.eq('send')

						const msgBox = signal()

						watch(() => {
							peek(props).showHexDump = showHexDump.value
						})

						connect([props, showHexDump], () => {
							if (!msgBox.value) return
							setTimeout(() => {
								const height = msgBox.value.getBoundingClientRect().height
								reportHeight(idx, height)
							}, 0)
						})

						return (
							<div
								class="chat invisible chat-end chat-start"
								class:invisible={preloading}
								class:chat-end={isSendMsg}
								class:chat-start={isReceiveMsg}
								$ref={msgBox}
							>
								<div class="chat-header">
									<time class="text-xs opacity-50">{timeString}</time>
									<label class="label opacity-50 p-0 mb-1">
										<span class="label-text text-xs mr-1 ml-auto" class:mr-1={isSendMsg} class:ml-auto={isSendMsg}>
											Hex
										</span>
										<CheckBox
											class="toggle toggle-xs toggle-info ml-1 mr-auto"
											class:ml-1={isReceiveMsg}
											class:mr-auto={isReceiveMsg}
											value={showHexDump}
										/>
									</label>
								</div>
								<div
									class="chat-bubble chat-bubble-warning chat-bubble-info overflow-auto before:content-none"
									{...{
										'class:chat-bubble-warning': status.eq('Error'),
										'class:chat-bubble-info': status.neq('Error'),
										'class:overflow-auto': showHexDump,
										'class:before:content-none': showHexDump
									}}
								>
									<BufferView buffer={buffer} showHexDump={showHexDump} />
								</div>
								<If condition={signalStat}>
									{() => {
										const { rssi, rscp, snr, freqErr } = derivedExtract(signalStat)
										return (
											<div
												class="chat-footer tooltip tooltip-right opacity-50 font-mono text-xs text-left font-mono whitespace-pre"
												data-tip={() => `FreqErr: ${freqErr.value.toFixed(2)}`}
											>
												RSSI: {rssi}dBm
												<br />
												RSCP: {rscp}dBm
												<br />
												SNR:&nbsp;&nbsp;{snr}dB
											</div>
										)
									}}
								</If>
								<If condition={status}>{() => <div class="chat-footer opacity-50 font-mono text-xs">{status}</div>}</If>
							</div>
						)
					}}
				</ListView>
				<div class="grow-0 shrink-0" style:height={() => `${backSpacerHeight}px`} />
				{...children}
			</div>
		)
	}
}
