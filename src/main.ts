import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

import App from './App.vue'
import { router } from './router'

// Note: the ~28 KB `flag-icons` stylesheet is intentionally NOT imported here.
// It is imported by the flag-rendering component (M3) so it rides that route's
// lazy chunk instead of bloating the entry bundle.
import './styles/reset.css'
import './styles/tokens.css'
import './styles/base.css'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

createApp(App).use(pinia).use(router).mount('#app')
