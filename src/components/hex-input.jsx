import { signal, expose, nextTick } from 'refui'

export const HexInput = ({ value, onChange, ...props }) => {
	const input = signal()

	const strValue = signal(value, (val) => {
		nextTick(() => strValue.trigger())
		if (val) return Array.from(val)
			.map(i => i.toString(16).padStart(2, '0'))
			.join(' ')

		return ''
	})

	const onInputChange = (e) => {
		if (onChange) {
			const val = e.target.value.trim()
			const arr = val.split(' ')

			for (let i in arr) {
				const byteStr = arr[i]
				if (byteStr.length !== 2) return onChange(null)
				const parsed = parseInt(byteStr, 16)
				if (isNaN(parsed)) return
				if (parsed < 0 || parsed > 0xFF) return onChange(null)
				arr[i] = parsed
			}

			const typedArr = new Uint8Array(arr)
			onChange(typedArr)
		}
	}

	const focus = () => {
		if (input.value) return input.value.focus()
	}

	const clear = () => {
		strValue.value = ''
	}

	expose({
		focus,
		clear
	})

	return (R) => {
		return <input {...props} value={strValue} on:input={onInputChange} pattern="\s*\b([0-9a-fA-F]{2}\s?)+\b\s*" $ref={input}/>
	}
}
