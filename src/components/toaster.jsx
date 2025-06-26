import { expose, signal, If, For, t, onDispose } from 'refui'

export const Toaster = ({ class: className, ...props }) => {
	const toastsArr = []
	const toasts = signal(toastsArr)

	const show = (content, timeout = 5000) => {
		const renderToast = (R) => {
			let toastElement = null
			switch (typeof content) {
				case 'function': {
					toastElement = content(R)
					break
				}
				case 'object': {
					const { message, type = 'alert-info' } = content
					toastElement = (
						<div class={t`alert ${type}`}>
							<span>{message}</span>
						</div>
					)
					break
				}
				default: {
					toastElement = (
						<div class="alert alert-info">
							<span>{content}</span>
						</div>
					)
				}
			}
			setTimeout(() => {
				toastElement
					.animate(
						[
							{
								transform: 'scale(1)',
								opacity: '1'
							},
							{
								transform: 'scale(0.9)',
								opacity: '0'
							}
						],
						{ duration: 250, iteration: 1 }
					)
					.addEventListener('finish', () => {
						const idx = toastsArr.indexOf(renderToast)
						toastsArr.splice(idx, 1)
						toasts.trigger()
					})
			}, timeout)

			return toastElement
		}

		toastsArr.push(renderToast)
		toasts.trigger()
	}

	expose({
		show
	})

	return (R) => {
		return (
			<If condition={() => toasts.value.length}>
				{() => (
					<div class={className} {...props}>
						<For entries={toasts}>{({ item }) => item(R)}</For>
					</div>
				)}
			</If>
		)
	}
}
