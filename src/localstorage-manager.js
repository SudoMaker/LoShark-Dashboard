import { watch } from 'refui'

export const saveProp = (prop, value) => localStorage.setItem(prop, JSON.stringify(value))
export const getProp = (prop) => JSON.parse(localStorage.getItem(prop))

export const registerProps = (propMap) => {
	for (const [key, val] of Object.entries(propMap)) {
		const savedVal = localStorage.getItem(key)
		if (savedVal !== null) val.value = JSON.parse(savedVal)
		watch(() => {
			const value = val.value
			saveProp(key, value)
		})
	}
}
