import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

import App from './App.vue'
import { router } from './router'
import { logError } from './lib/error-log'

// Note: the `flag-icons` stylesheet (styles/flags.scss subset) is intentionally
// NOT imported here. It is imported by the flag-rendering component (M3) so it
// rides that route's lazy chunk instead of bloating the entry bundle.
import './styles/reset.css'
import './styles/tokens.css'
import './styles/base.css'
import './styles/standings-row.css'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const app = createApp(App)

// Component errors don't reach the window listeners in index.html once an
// errorHandler is registered, so log them here (Settings → Diagnose reads the
// log) and keep them visible on the console for local debugging.
app.config.errorHandler = (err, _instance, info) => {
  logError('vue', `${err instanceof Error ? err.message : String(err)} (${info})`)
  console.error(err)
}

app.use(pinia).use(router).mount('#app')
