import { beforeEach, vi } from 'vitest'

// jsdom doesn't implement <dialog> element behavior (showModal/close), so every
// spec that mounts a BaseDialog-based component needs these stubbed. This runs
// for every spec file regardless of its `// @vitest-environment` annotation, so
// guard against files running under the default 'node' environment, where
// HTMLDialogElement doesn't exist.
if (typeof HTMLDialogElement !== 'undefined') {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = vi.fn<() => void>()
    HTMLDialogElement.prototype.close = vi.fn<() => void>().mockImplementation(function (this: HTMLDialogElement) {
      this.dispatchEvent(new Event('close'))
    })
  })
}
