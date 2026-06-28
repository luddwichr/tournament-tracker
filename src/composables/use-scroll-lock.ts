import { onMounted, onUnmounted } from 'vue'

let lockCount = 0
let savedScrollY = 0

// Uses position:fixed (rather than overflow:hidden) so the scroll position is
// preserved on mobile browsers where overflow:hidden alone does not prevent
// scroll. The saved scroll Y is restored when the last lock is released.
export function useScrollLock(): void {
  onMounted(() => {
    lockCount++
    if (lockCount === 1) {
      savedScrollY = window.scrollY
      document.body.style.position = 'fixed'
      document.body.style.top = `-${savedScrollY}px`
      document.body.style.width = '100%'
    }
  })
  onUnmounted(() => {
    lockCount--
    if (lockCount === 0) {
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      window.scrollTo(0, savedScrollY)
    }
  })
}
