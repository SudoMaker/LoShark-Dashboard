import { signal, expose, dispose, getCurrentSelf } from 'refui'
import { render } from '../setup.js'

export const Modal = ({ title = 'Alert', message, btnText = 'Close', onClose, removeOnClose }, children) => {
	const self = getCurrentSelf()
	const dialog = signal()

	let removePending = false

	const show = () => {
		if (dialog.value) dialog.value.showModal()
	}
	const close = () => {
		if (!dialog.value) return
		dialog.value.close()
		if (removeOnClose) {
			removePending = true
			dispose(self)
		}
		if (onClose) onClose()
	}

	const onTransitionEnd = () => {
		if (removePending) dialog.value.remove()
	}

	expose({
		show,
		close,
		dialog
	})

	return (R) => (
		<dialog id="my_modal_1" class="modal" on:close={close} on:transitionend={onTransitionEnd} $ref={dialog}>
			<div class="modal-box">
				<h3 class="font-bold text-lg">{title}</h3>
				<p class="py-4 whitespace-pre-line">
					{message}
					{children && children(R)}
				</p>
				<div class="modal-action">
					<form method="dialog">
						<button class="btn">{btnText}</button>
					</form>
				</div>
			</div>
		</dialog>
	)
}

export const showModal = (config, children) => {
	render(document.body, Modal, { removeOnClose: true, ...config }, children).show()
}
