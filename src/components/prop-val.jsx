import { signal, For, isSignal, onCondition } from 'refui'
import { showModal } from './modal.jsx'
import { HexInput } from './hex-input.jsx'

export const PropVal = ({ prop, setProp }) => {
	switch (prop.key) {
		case 'modem0.rf.frequency_ranges': {
			const val = signal(prop.value, (i) => i.map(([low, high]) => `${low} - ${high}`).join(', '))
			return val
		}

		case 'modem0.rf.tx_power_range': {
			const val = signal(prop.value, (i) => i.join(' - '))
			return val
		}

		default: {
			const { key, type, value, readonly, choices } = prop

			const inputDisabled = signal(!!readonly)

			const setPropVal = async (val) => {
				try {
					inputDisabled.value = true
					await setProp(key, val)
				} catch (e) {
					showModal({
						title: 'Error',
						message: `Error happened while setting prop "${key}":\n\n${e}`,
						btnText: 'OK'
					})
					if (isSignal(value)) {
						value.trigger()
					}
				} finally {
					inputDisabled.value = false
				}
			}

			if (choices) {
				const valIdx = signal(value, (i) => choices.indexOf(i).toString(10))
				const onChange = (e) => {
					const newIdx = e.target.value
					const newVal = choices[newIdx]

					setPropVal(newVal)
				}

				const match = onCondition(valIdx)

				return (R) => {
					return (
						<select class="select select-xs w-full" on:change={onChange} disabled={inputDisabled}>
							<For entries={Object.entries(choices)}>
								{([idx, choice]) => {
									return (
										<option value={idx} selected={match(idx)}>
											{choice}
										</option>
									)
								}}
							</For>
						</select>
					)
				}
			}

			switch (type) {
				case 'bool': {
					if (readonly) return value

					const onChange = (e) => {
						setPropVal(e.target.checked)
					}

					return (R) => {
						return (
							<div class="form-control">
								<label class="label cursor-pointer w-full justify-between">
									<span class="label-text">{value}</span>
									<input
										type="checkbox"
										class="toggle toggle-xs toggle-info"
										checked={value}
										on:change={onChange}
										disabled={inputDisabled}
									/>
								</label>
							</div>
						)
					}
				}

				case 'string': {
					if (readonly) return value
					let debounceId = 0
					const onInput = (e) => {
						clearTimeout(debounceId)
						const val = e.target.value
						if (!val) return
						setTimeout(() => setPropVal(val), 1000)
					}
					return (R) => {
						return (
							<input
								class="input input-xs invalid:input-error w-full"
								value={value}
								disabled={inputDisabled}
								on:input={onInput}
							/>
						)
					}
				}

				case 'number': {
					if (readonly) return value
					const { min, max } = prop
					const steps = max - (min || 0)

					const onChange = (e) => {
						const val = parseInt(e.target.value, 10)
						if (isNaN(val)) return
						if (val < min || val > max) return
						setPropVal(val)
					}

					if ((min !== undefined || max !== undefined) && steps < 256) {
						const displayValue = signal(value)

						const flushDisplay = (e) => {
							const val = parseInt(e.target.value, 10)
							if (isNaN(val)) return
							displayValue.value = val
						}

						return (R) => {
							return (
								<div class="flex items-center">
									<span class="label-text min-w-4 mr-2 text-center">{displayValue}</span>
									<div class="form-control grow flex flex-col">
										<label class="label cursor-pointer">
											<input
												type="range"
												class="range range-xs invalid:range-error w-full"
												step={1}
												min={min}
												max={max}
												value={value}
												disabled={inputDisabled}
												on:change={onChange}
												on:input={flushDisplay}
											/>
										</label>
										<label class="label justify-between">
											<span class="label-text-alt">Min: {min ?? '-'}</span>
											<span class="label-text-alt">Max: {max ?? '-'}</span>
										</label>
									</div>
								</div>
							)
						}
					} else {
						return (R) => {
							return (
								<div class="form-control">
									<input
										type="number"
										class="input input-xs invalid:input-error w-full"
										step={1}
										min={min}
										max={max}
										value={value}
										disabled={inputDisabled}
										on:change={onChange}
									/>
								</div>
							)
						}
					}
				}

				case 'byte[]': {
					const { min, max } = prop
					let debounceId = 0
					const onChange = (val) => {
						clearTimeout(debounceId)
						if (!val) return
						if (val.byteLength < min || val.byteLength > max) return
						setTimeout(() => setPropVal(val), 1000)
					}
					return (R) => {
						return (
							<div class="form-control">
								<HexInput
									class="input input-xs invalid:input-error w-full font-mono"
									value={value}
									disabled={inputDisabled}
									onChange={onChange}
								/>
								{((typeof min !== 'undefined' || typeof max !== 'undefined') && (
									<label class="label">
										<span class="label-text-alt">
											Min: {min} byte{(min === 1 && '') || 's'}
										</span>
										<span class="label-text-alt">
											Max: {max} byte{(max === 1 && '') || 's'}
										</span>
									</label>
								)) ||
									null}
							</div>
						)
					}
				}

				default: {
					return (R) => {
						return <div>{JSON.stringify(prop)}</div>
					}
				}
			}
		}
	}
}
