import { signal, onCondition, For } from 'refui'

export const ThemeChanger = ({ value = signal('default'), options = {default: 'Default'}, class: className = 'dropdown', 'join-item': joinItem }, ...children) => {
	const optionsArr = signal(options, (i) =>
		Object.entries(i).map(([key, name]) => ({
			key,
			name
		}))
	)

	const match = onCondition(value)

	const onChange = (e) => {
		value.value = e.target.value
	}

	return (R) => (
		<div tabindex="0" class={className}>
			<div tabindex="0" role="button" class="btn btn-sm btn-ghost join-item" class:join-item={joinItem}>
				<span class="material-symbols-outlined text-sm">apparel</span>
			</div>
			<ul class="dropdown-content z-50 p-2 shadow-2xl bg-base-300 rounded-box w-52 max-h-60 overflow-auto" on-capture:change={onChange}>
				<For entries={optionsArr} track="key">
					{({ item: { key, name } }) => (
						<li>
							<input
								type="radio"
								name="theme-dropdown"
								class="theme-controller btn btn-sm btn-block btn-ghost justify-start"
								aria-label={name}
								value={key}
								checked={match(key)}
							/>
						</li>
					)}
				</For>
				{...children}
			</ul>
		</div>
	)
}
