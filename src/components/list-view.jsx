import { signal, peek, read, watch, expose } from 'refui'
import { VirtualList } from './virtual-list.jsx'

export const ListView = ({ entries, visibleItems = 10, itemHeight = 20, overscan = 3, parentRef, ...props }, itemRenderer) => {
	visibleItems = signal(visibleItems)

	const frontSpacerHeight = signal(0)
	const backSpacerHeight = signal(0)

	const topItemIdx = signal(0)

	const heightArr = []

	let frontDelta = itemHeight * -1
	let backDelta = itemHeight

	let lastScrollY = 0

	const handleScroll = () => {
		const parentElement = peek(parentRef)
		if (!parentElement) return

		const scrollTop = parentElement.scrollTop

		const delta = scrollTop - lastScrollY

		if (delta <= backDelta && delta >= frontDelta) return

		lastScrollY = scrollTop

		const boxHeight = parentElement.getBoundingClientRect().height
		const maxVisibleHeight = scrollTop + boxHeight

		let idx = 0
		let totalHeight = heightArr[idx] || itemHeight
		while (idx < heightArr.length && totalHeight < scrollTop) {
			idx += 1
			totalHeight += heightArr[idx] || itemHeight
		}
		let lastVisibleIdx = idx
		while (lastVisibleIdx < heightArr.length && totalHeight < maxVisibleHeight) {
			lastVisibleIdx += 1
			totalHeight += heightArr[lastVisibleIdx] || itemHeight
		}

		frontDelta = (heightArr[idx - 1] || itemHeight) * -1
		backDelta = heightArr[lastVisibleIdx + 1] || itemHeight

		topItemIdx.value = idx
		visibleItems.value = lastVisibleIdx - idx + 1
	}

	const onSelection = ({ front, back }) => {
		let frontHeight = 0
		let backHeight = 0

		for (let i = 0; i < front; i++) {
			frontHeight += heightArr[i] || itemHeight
		}
		for (let i = 0; i < back; i++) {
			backHeight += heightArr[heightArr.length - i - 1] || itemHeight
		}
		frontSpacerHeight.value = frontHeight
		backSpacerHeight.value = backHeight
	}

	watch(() => {
		const entryArr = read(entries)
		handleScroll()
		heightArr.length = entryArr.length
	})

	const reportHeight = (idx, height) => {
		heightArr[peek(idx)] = height
	}

	expose({
		handleScroll,
		frontSpacerHeight,
		backSpacerHeight
	})

	return (R) => {
		return (
			<VirtualList
				entries={entries}
				topItemIdx={topItemIdx}
				visibleItems={visibleItems}
				overscan={overscan}
				onSelection={onSelection}
				debounce={20}
				{...props}
			>
				{({ item, index, preloading }) => itemRenderer({ item, index, reportHeight, preloading })}
			</VirtualList>
		)
	}
}
