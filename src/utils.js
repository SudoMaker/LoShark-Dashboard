export const usToLocaleTimeString = (ns) => new Date(ns / 1000000).toLocaleString()

export const getDataPreview = (uint8buffer) => {
	let dataPreview = Array.from(
		new Uint8Array(uint8buffer.buffer, uint8buffer.byteOffset, Math.min(uint8buffer.byteLength, 8))
	)
		.map((i) => i.toString(16).padStart(2, '0'))
		.join(' ')

	if (uint8buffer.byteLength > 8) {
		dataPreview = `${dataPreview} (...${uint8buffer.byteLength - 8})`
	}

	return dataPreview
}

export const hexDump = (uint8buffer) => {
	let hexDumpStr = ''

	for (let i = 0; i < uint8buffer.length; i += 16) {
		// Address part
		// eslint-disable-next-line prefer-template
		hexDumpStr += i.toString(16).padStart(4, '0') + '| '

		// Hexadecimal bytes part
		for (let j = 0; j < 16; j++) {
			if (i + j < uint8buffer.length) {
				// eslint-disable-next-line prefer-template
				hexDumpStr += uint8buffer[i + j].toString(16).padStart(2, '0') + ' '
			} else {
				hexDumpStr += '   '
			}
		}

		hexDumpStr += '|'

		// ASCII part
		for (let j = 0; j < 16; j++) {
			if (i + j < uint8buffer.length) {
				const char = uint8buffer[i + j]
				hexDumpStr += char >= 32 && char <= 127 ? String.fromCharCode(char) : '.'
			}
		}

		hexDumpStr += '\n'
	}

	return hexDumpStr
}

export const timespecToUnixTimestamp = (timespec) => {
	const { sec, nsec } = timespec
	return sec * 1000 + nsec / 1e6
}

export const unixTimestampToTimespec = (unixTimestamp) => {
	const sec = Math.floor(unixTimestamp / 1000)
	const nsec = (unixTimestamp % 1000) * 1e6
	return { sec, nsec }
}
