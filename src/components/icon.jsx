export const Icon = ({ href, ...attrs }) => {
	attrs = Object.fromEntries(Object.entries(attrs).map(([k, v]) => {
		if (k.indexOf(':') >= 0) return [k, v]
		return [`attr:${k}`, v]
	}))
	return (R) => {
		return (
			<svg {...attrs}>
				<svg:use attr:href={href} />
			</svg>
		)
	}
}
