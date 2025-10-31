import { signal, isSignal, onDispose, dispose, watch, peek, getCurrentSelf } from 'refui'
import { render } from '../setup.js'

export const Modal = ({ title = 'Alert', message, btnText = 'Close', onClose, removeOnClose, open, expose }, children) => {
	const self = getCurrentSelf()
	const dialog = signal()

	if (!isSignal(open)) {
		open = signal(!!open)
	}

	let inited = false
	watch(() => {
		const dialogElement = dialog.value
		const opened = open.value
		const _onClose = peek(onClose)
		if (dialogElement) {
			if (opened) {
				dialogElement.showModal()
			} else {
				dialogElement.close()
			}
		}
	})

	let removePending = false

	const show = () => {
		open.value = true
	}

	const close = () => {
		open.value = false
		removePending = true
	}

	const remove = () => {
		if (dialog.value) {
			dialog.value.remove()
		}
		peek(onClose)?.()
	}

	const onTransitionEnd = () => {
		if (removePending) {
			removePending = false
			remove()
		}
	}

	expose?.({
		show,
		close,
		dialog
	})

	inited = true

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

export const showModal = ({onClose: _onClose, ...config}, children) => {
	const onClose = () => {
		dispose(rendered)
		if (_onClose) _onClose()
	}

	const rendered = render(document.body, Modal, { removeOnClose: true, open: signal(true), onClose, ...config }, children)
}
