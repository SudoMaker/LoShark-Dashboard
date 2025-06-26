import { read, peek, isSignal } from 'refui'

export const BtnSwitch = ({ value = false, class: className, active, inactive, ...props }, ...children) => {
	if (!props['on:click'] && isSignal(value)) props['on:click'] = () => {
		value.value = !peek(value)
	}

	return (R) => {
		return (
			<button
				class={() => {
					const baseClass = read(className) || ''
					const activeClass = read(active) || ''
					const inactiveClass = read(inactive) || ''
					const val = read(value) || false
					return [baseClass, val && activeClass || inactiveClass].join(' ')
				}}
				{...props}
			>
				{...children}
			</button>
		)
	}
}

export const CheckBox = ({ value = false, ...props }) => {
	if (!props['on:change'] && isSignal(value)) props['on:change'] = (e) => {
		value.value = e.target.checked
	}
	return (R) => {
		return (
			<input
				type="checkbox"
				checked={value}
				{...props}
			/>
		)
	}
}
