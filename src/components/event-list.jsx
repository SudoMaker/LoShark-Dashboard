import { signal, derivedExtract } from 'refui'
import { ListView } from './list-view.jsx'
import { usToLocaleTimeString } from '../utils.js'

export const EventList = ({ messages, parentRef }) => {
	const listView = signal()

	const { frontSpacerHeight, backSpacerHeight } = derivedExtract(listView, 'frontSpacerHeight', 'backSpacerHeight')

	const handleScroll = () => {
		listView.value?.handleScroll()
	}

	return (R) => {
		return (
			<div class="collapse-content collapse-box-content" $ref={parentRef} on-passive:scroll={handleScroll}>
				<table class="table table-pin-rows mt-4">
					<colgroup>
						<col class="max-w-fit" />
						<col class="min-w-min w-1/5" />
						<col class="min-w-min w-1/5" />
						<col class="min-w-min w-3/5" />
					</colgroup>
					<thead>
						<tr>
							<th></th>
							<td>Time</td>
							<td>Type</td>
							<td>Data</td>
						</tr>
					</thead>
					<tbody>
						<tr style:height={() => `${frontSpacerHeight}px`} />
						<ListView
							tracked
							preload
							entries={messages}
							visibleItems={30}
							overscan={10}
							itemHeight={41}
							parentRef={parentRef}
							$ref={listView}
						>
							{({ item: props, index: idx, reportHeight, preloading = false }) => {
								const { type, timestamp, data } = derivedExtract(props)
								const dataText = signal(data, (i) => i || 'N/A')
								const idxText = signal(idx, (i) => i + 1)
								const timestampText = signal(timestamp, usToLocaleTimeString)

								const tableItem = signal()

								props.connect(() => {
									if (!tableItem.value) return
									setTimeout(() => {
										const height = tableItem.value.getBoundingClientRect().height
										reportHeight(idx, height)
									}, 0)
								})

								return (
									<tr class="invisible" class:invisible={preloading} $ref={tableItem}>
										<th>{idxText}</th>
										<td>{timestampText}</td>
										<td>{type}</td>
										<td class="font-mono">{dataText}</td>
									</tr>
								)
							}}
						</ListView>
						<tr style:height={() => `${backSpacerHeight}px`} />
					</tbody>
				</table>
			</div>
		)
	}
}
