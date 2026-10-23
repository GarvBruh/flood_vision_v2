import { useState } from 'react'
import { flushSync } from 'react-dom'
import EmergencyPage from './emergency/EmergencyPage'
import { MapScreen } from './components/MapScreen/MapScreen'
import AppHeader, { type AppPage, type AppTheme } from './components/AppHeader'
import EmergencyAssistant from './emergency/EmergencyAssistant'
import AboutPage from './about/AboutPage'
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
  const [hasPlayedMapIntro, setHasPlayedMapIntro] = useState(false)

  function toggleTheme() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    try { localStorage.setItem(THEME_KEY, nextTheme) } catch { /* Theme still changes for this visit. */ }
  }

  function switchPage(page: AppPage) {
    if (page === activePage) return

    const updatePage = () => {
      flushSync(() => {
        setActivePage(page)
        if (page === 'map') setHasPlayedMapIntro(true)
      })
    }

    if (
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
      typeof document.startViewTransition === 'function'
    ) {
      document.startViewTransition(updatePage)
    } else {
      setActivePage(page)
      if (page === 'map') setHasPlayedMapIntro(true)
    }
  }

  return (
    <div className={`ep app-root app-root--${activePage}`} data-theme={theme}>
      <AppHeader
        activePage={activePage}
        theme={theme}
        onPageChange={switchPage}
        onToggleTheme={toggleTheme}
      />
      {activePage === 'map' ? (
        <div className="app-page-frame app-page-frame--map" key="map">
          <main className="app-map-stage" aria-label="Daily operations">
            <MapScreen animateOpening={!hasPlayedMapIntro} />
          </main>
          <EmergencyAssistant onOpenEmergency={() => switchPage('emergency')} />
        </div>
      ) : activePage === 'emergency' ? (
        <div className="app-page-frame app-page-frame--emergency" key="emergency">
          <EmergencyPage />
        </div>
      ) : (
        <div className="app-page-frame app-page-frame--about" key="about">
          <AboutPage />
        </div>
      )}
    </div>
  )
}

export default App
