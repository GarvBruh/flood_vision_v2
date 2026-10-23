import './AppHeader.css'

export type AppPage = 'map' | 'emergency' | 'about'
export type AppTheme = 'light' | 'dark'

interface AppHeaderProps {
  activePage: AppPage
  theme: AppTheme
  onPageChange: (page: AppPage) => void
  onToggleTheme: () => void
}

function WaveMark() {
  return (
    <svg viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d="M2 18c2.5-5 5-7.5 8-7.5s5.5 2.5 8 7.5c1.25 2.5 2 4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 11c2-3.5 4.5-5.5 7-5.5s5 2 7.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.45" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6.6 3.8 9 3.2a1.5 1.5 0 0 1 1.7.9l1.1 2.8a1.5 1.5 0 0 1-.4 1.7l-1.5 1.2a13 13 0 0 0 5.3 5.3l1.2-1.5a1.5 1.5 0 0 1 1.7-.4l2.8 1.1a1.5 1.5 0 0 1 .9 1.7l-.6 2.4a1.8 1.8 0 0 1-1.8 1.4C10.1 19.8 4.2 13.9 4.8 5.6a1.8 1.8 0 0 1 1.8-1.8Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ThemeIcon({ theme }: { theme: AppTheme }) {
  return theme === 'dark' ? (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20.2 15.3A8.5 8.5 0 0 1 8.7 3.8 8.7 8.7 0 1 0 20.2 15.3Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function AppHeader({ activePage, theme, onPageChange, onToggleTheme }: AppHeaderProps) {
  const logoTarget: AppPage = activePage === 'map' ? 'emergency' : 'map'
  const pageLabel = activePage === 'map' ? 'Daily operations' : activePage === 'emergency' ? 'Emergency response' : 'About Us'

  return (
    <header className="ep-topbar fv-app-header">
      <div className="ep-topbar-left">
        <button
          className="ep-mark fv-brand-button"
          type="button"
          onClick={() => onPageChange(logoTarget)}
          aria-label={`Switch to ${logoTarget === 'map' ? 'Daily Operations' : 'Emergency Response'}`}
          title="Switch Flood Vision mode"
        >
          <WaveMark />
          <span className="ep-wordmark">Flood Vision <span className="ep-version">2.0</span></span>
        </button>
        <span className="ep-topbar-section fv-current-section">{pageLabel}</span>
      </div>

      <nav className="fv-mode-switch" aria-label="Flood Vision mode">
        <button
          className="fv-mode-option"
          type="button"
          aria-pressed={activePage === 'map'}
          onClick={() => onPageChange('map')}
        >
          <span className="fv-mode-label-full">Daily Operations</span>
          <span className="fv-mode-label-compact">Daily</span>
        </button>
        <button
          className="fv-mode-option"
          type="button"
          aria-pressed={activePage === 'emergency'}
          onClick={() => onPageChange('emergency')}
        >
          <span className="fv-mode-label-full">Emergency Response</span>
          <span className="fv-mode-label-compact">Emergency</span>
        </button>
        <button
          className="fv-mode-option"
          type="button"
          aria-pressed={activePage === 'about'}
          onClick={() => onPageChange('about')}
        >
          <span className="fv-mode-label-full">About Us</span>
          <span className="fv-mode-label-compact">About</span>
        </button>
      </nav>

      <div className="ep-topbar-right fv-header-actions">
        <button
          className="ep-theme-toggle"
          type="button"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          aria-pressed={theme === 'dark'}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          <ThemeIcon theme={theme} />
        </button>
        <a className="ep-call-112" href="tel:112" aria-label="Call India's national emergency number 112">
          <PhoneIcon />
          <span>Call 112</span>
        </a>
      </div>
    </header>
  )
}
