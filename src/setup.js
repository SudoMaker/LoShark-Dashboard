import { createDOMRenderer } from 'refui/dom'
import { defaults } from 'refui/presets/browser'

// eslint-disable-next-line no-undef
const version = __DASHBOARD_VERSION__

const { render } = createDOMRenderer(defaults)

export { render, version }
