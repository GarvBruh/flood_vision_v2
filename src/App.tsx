import { useState } from 'react'
import EmergencyPage from './emergency/EmergencyPage'
import { MapScreen } from './components/MapScreen/MapScreen'
import AppHeader, { type AppPage, type AppTheme } from './components/AppHeader'
import './App.css'

const THEME_KEY = 'flood-vision-theme-v1'

function getInitialTheme(): AppTheme {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch { /* Fall back to the system theme. */ }

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function App() {
  const [activePage, setActivePage] = useState<AppPage>('map')
  const [theme, setTheme] = useState<AppTheme>(getInitialTheme)

  function toggleTheme() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    try { localStorage.setItem(THEME_KEY, nextTheme) } catch { /* Theme still changes for this visit. */ }
  }

  return (
    <div className={`ep app-root app-root--${activePage}`} data-theme={theme}>
      <AppHeader
        activePage={activePage}
        theme={theme}
        onPageChange={setActivePage}
        onToggleTheme={toggleTheme}
      />
      {activePage === 'map' ? (
        <main className="app-map-stage" aria-label="Daily operations">
          <MapScreen />
        </main>
      ) : (
        <EmergencyPage />
      )}
    </div>
  )
}

export default App
