// Theme + dashboard preferences (client-only, persisted in localStorage).
// Dark is the default to match the reference designs; toggle in Settings.
const THEME_KEY = 'vinsight:theme'
const SETTINGS_KEY = 'vinsight:settings'

export const getThemePref = () => { try { return localStorage.getItem(THEME_KEY) || 'dark' } catch { return 'dark' } }
const resolveTheme = (pref) => (pref === 'system'
  ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  : pref)
export function applyTheme(pref = getThemePref()) {
  document.documentElement.dataset.theme = resolveTheme(pref)
}
export function setThemePref(pref) {
  try { localStorage.setItem(THEME_KEY, pref) } catch { /* ignore */ }
  applyTheme(pref)
}

const DEFAULT_SETTINGS = {
  defaultLanding: '/',          // where login lands
  tableDensity: 'comfortable',  // comfortable | compact
  sidebarDefaultCollapsed: false,
  showRevenueChart: true,
  liveTiles: true,              // pulse "live" dots on KPI tiles
}
export function getSettings() {
  try { return { ...DEFAULT_SETTINGS, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null') || {}) } }
  catch { return { ...DEFAULT_SETTINGS } }
}
export function setSettings(patch) {
  const next = { ...getSettings(), ...patch }
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)) } catch { /* ignore */ }
  return next
}
