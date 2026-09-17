import { afterEach, beforeEach, vi } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'

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

// Unmount every wrapper a test mounted, so a spec cannot inherit the DOM of the one before it.
// Mounts pass `attachTo: document.body` in a few specs, and those append to the real document
// and are only removed on unmount, so without this they pile up across the file.
enableAutoUnmount(afterEach)
