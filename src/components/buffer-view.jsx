import { If, read, signal } from 'refui'
import { hexDump } from '../utils.js'

export const BufferView = ({ buffer, showHexDump, encoding = 'utf-8' }) => {
	return (R) => {
		return (
			<If condition={() => read(buffer).byteLength}>
				{() => (
					<If condition={showHexDump}>
						{() => {
							const hexDumpText = signal(buffer, hexDump)
							return <code class="whitespace-pre">{hexDumpText}</code>
						}}
						{() => {
							const str = signal(buffer, i => new TextDecoder(encoding).decode(i))
							return <p class="w-full break-words">{str}</p>
						}}
					</If>
				)}
				{() => <i>&lt;Empty message&gt;</i>}
			</If>
		)
	}
}
