import { Fn, For, signal, read, peek, watch, onDispose, nextTick } from 'refui'

export const VirtualList = (
	{ entries, tracked, preload, visibleItems = 30, overscan = 10, debounce = 20, topItemIdx, onSelection },
	itemRenderer
) => {
	const displayEntries = signal([])

	let entryValueMap = new Map()

	let idle = true

	const update = () => {
		const entryArr = read(entries)
		const visibleItemCount = read(visibleItems)
		const overscanCount = read(overscan) || 0
		const itemIdx = read(topItemIdx)

		if (!entryArr) return
		if (!(visibleItemCount || overscanCount)) return

		let usableItemCount = entryArr.length - visibleItemCount
		if (usableItemCount < 0) usableItemCount = 0

		let startIdx = itemIdx - overscanCount
		let endIdx = itemIdx + visibleItemCount + overscanCount

		if (startIdx < 0) startIdx = 0
		if (endIdx > entryArr.length) endIdx = entryArr.length

		const oldItems = peek(displayEntries).map(([item]) => peek(item))
		const newItems = entryArr.slice(startIdx, endIdx)

		const obsoleteSignals = [...new Set([...newItems, ...oldItems])]
			.slice(newItems.length)
			.map((i) => entryValueMap.get(i))

		const newEntryValMap = new Map()

		const displayItems = newItems.map((item, idx) => {
			let entry = entryValueMap.get(item)
			if (!entry) {
				entry = obsoleteSignals.pop()
				const nItemIdx = idx + startIdx
				if (entry) {
					const [val, itemIdx] = entry
					val.value = item
					if (tracked) itemIdx.value = nItemIdx
				} else {
					entry = [signal(item), tracked && signal(nItemIdx) || 0]
				}
			}
			newEntryValMap.set(item, entry)
			return entry
		})

		displayEntries.value = displayItems
		entryValueMap = newEntryValMap

		if (onSelection) {
			onSelection({
				front: startIdx,
				back: entryArr.length - endIdx,
				total: entryArr.length
			})
		}
	}

	watch(() => {
		if (!idle) return

		idle = false
		setTimeout(() => {
			idle = true
			update()
		}, peek(debounce))

		update()
	})

	if (peek(preload)) {
		let timeoutID = null

		let preloadedLength = 0

		const preloadItem = signal()
		const preloadIdx = signal(0)

		const preloadNext = () => {
			const entryArr = read(entries)

			if (entryArr.length > preloadedLength) {
				timeoutID = setTimeout(() => {
					preloadItem.value = entryArr[preloadedLength]
					preloadIdx.value = preloadedLength
					nextTick(() => {
						timeoutID = setTimeout(() => {
							preloadedLength += 1
							preloadNext()
						}, 0)
					})
				}, 0)
			} else {
				preloadedLength = entryArr.length
				timeoutID = null
				preloadItem.value = null
			}
		}

		watch(() => {
			if (timeoutID) return
			preloadNext()
		})

		onDispose(() => {
			if (timeoutID) clearTimeout(timeoutID)
		})

		const preRender = () => itemRenderer(preloadItem, preloadIdx, true)

		return (R) => {
			return <>
				<For entries={displayEntries}>{([prop, idx]) => itemRenderer(prop, idx)}</For>
				<Fn>{() => {
					if (preloadItem.value) {
						return preRender
					}
				}}</Fn>
			</>
		}
	}

	return (R) => {
		return <For entries={displayEntries}>{([prop, idx]) => itemRenderer(prop, idx)}</For>
	}
}
