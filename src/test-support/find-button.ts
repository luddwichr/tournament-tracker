import type { DOMWrapper } from '@vue/test-utils'

// Both VueWrapper and DOMWrapper expose findAll(selector) -> DOMWrapper[], so a
// structural type lets callers pass either the mounted wrapper or a scoped
// sub-wrapper (e.g. wrapper.findComponent(ConfirmDialog)).
interface ButtonHost {
  findAll(selector: string): DOMWrapper<Element>[]
}

function describeButtons(buttons: DOMWrapper<Element>[], attr?: string): string {
  const label = (b: DOMWrapper<Element>) => (attr ? (b.attributes(attr) ?? '∅') : b.text())
  return buttons.length ? buttons.map((b) => `"${label(b)}"`).join(', ') : '(none)'
}

/** The first `<button>` whose visible text includes `text`, or undefined when none matches. */
export function queryButtonByText(host: ButtonHost, text: string): DOMWrapper<Element> | undefined {
  return host.findAll('button').find((b) => b.text().includes(text))
}

/**
 * Like {@link queryButtonByText}, but throws when none matches, listing the available buttons.
 * That gives a real failure message instead of the bare `.find(...)!` idiom's "undefined is not an object".
 */
export function findButtonByText(host: ButtonHost, text: string): DOMWrapper<Element> {
  const buttons = host.findAll('button')
  const match = buttons.find((b) => b.text().includes(text))
  if (!match) throw new Error(`No <button> with text including "${text}". Buttons: [${describeButtons(buttons)}]`)
  return match
}

/** The `<button>` whose aria-label equals `label`, throwing (listing the
 *  available aria-labels) when none matches. */
export function findButtonByLabel(host: ButtonHost, label: string): DOMWrapper<Element> {
  const buttons = host.findAll('button')
  const match = buttons.find((b) => b.attributes('aria-label') === label)
  if (!match) {
    throw new Error(`No <button> with aria-label "${label}". Buttons: [${describeButtons(buttons, 'aria-label')}]`)
  }
  return match
}
