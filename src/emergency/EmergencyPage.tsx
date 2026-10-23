import { useRef, useState, type KeyboardEvent } from 'react'
import './EmergencyPage.css'
import NearbyResources from './NearbyResources'
import SafetyTips from './SafetyTips'
import SosPanel from './SosPanel'

const officialLinkProps = { target: '_blank', rel: 'noreferrer noopener' }
const emergencyTabs = [
  { id: 'sos', label: 'Personal SOS' },
  { id: 'medical', label: 'Nearby medical help' },
  { id: 'resources', label: 'Resources & safety' },
] as const

function EmergencyPage() {
  const [activeTab, setActiveTab] = useState<(typeof emergencyTabs)[number]['id']>('sos')
  const tabListRef = useRef<HTMLDivElement>(null)

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const currentIndex = emergencyTabs.findIndex((tab) => tab.id === activeTab)
    let nextIndex = currentIndex
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % emergencyTabs.length
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + emergencyTabs.length) % emergencyTabs.length
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = emergencyTabs.length - 1
    else return

    event.preventDefault()
    const nextTab = emergencyTabs[nextIndex]
    setActiveTab(nextTab.id)
    tabListRef.current?.querySelector<HTMLButtonElement>(`#emergency-tab-${nextTab.id}`)?.focus()
  }

  return (
    <main className="emergency-page" aria-labelledby="emergency-title">
      <header className="emergency-header">
        <div className="emergency-title-group">
          <span className="emergency-brand-mark" aria-hidden="true">FV</span>
          <div><h1 id="emergency-title">Emergency Assistance</h1></div>
          <span className="emergency-page-status"><span aria-hidden="true" /> National number · 112</span>
        </div>
        <a className="emergency-call emergency-header-call" href="tel:112" aria-label="Call India's national emergency number 112"><span className="call-112-number">112</span><span>Call emergency services</span></a>
      </header>

      <p className="emergency-intro emergency-compact-intro">Call 112 if you or someone nearby is in immediate danger.</p>

      <div className="emergency-tabs" role="tablist" aria-label="Emergency assistance sections" ref={tabListRef}>
        {emergencyTabs.map((tab) => <button
          key={tab.id}
          id={`emergency-tab-${tab.id}`}
          className="emergency-tab"
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`emergency-panel-${tab.id}`}
          tabIndex={activeTab === tab.id ? 0 : -1}
          onClick={() => setActiveTab(tab.id)}
          onKeyDown={handleTabKeyDown}
        >{tab.label}</button>)}
      </div>

      <section id="emergency-panel-sos" className="emergency-tab-panel" role="tabpanel" aria-labelledby="emergency-tab-sos" tabIndex={0} hidden={activeTab !== 'sos'}>
        <SosPanel />
      </section>

      <section id="emergency-panel-medical" className="emergency-tab-panel" role="tabpanel" aria-labelledby="emergency-tab-medical" tabIndex={0} hidden={activeTab !== 'medical'}>
        <NearbyResources />
      </section>

      <section id="emergency-panel-resources" className="emergency-tab-panel" role="tabpanel" aria-labelledby="emergency-tab-resources" tabIndex={0} hidden={activeTab !== 'resources'}>
        <div className="emergency-secondary-section">
          <details className="emergency-accordion safety-accordion" open>
            <summary><span className="accordion-icon" aria-hidden="true">!</span><span><strong>Flood safety guidance</strong><small>Quick actions to reduce risk during flooding</small></span><span className="accordion-chevron" aria-hidden="true">⌄</span></summary>
            <div className="accordion-content"><SafetyTips /></div>
          </details>

          <details className="emergency-accordion resources-accordion">
            <summary><span className="accordion-icon" aria-hidden="true">↗</span><span><strong>Official disaster-response resources</strong><small>National services and local-response information</small></span><span className="accordion-chevron" aria-hidden="true">⌄</span></summary>
            <div className="accordion-content">
              <p className="emergency-muted">112 is India’s national emergency number. Local disaster response depends on the relevant state or union territory authorities.</p>
              <a className="emergency-resource-link" href="https://www.ndrf.gov.in/en" {...officialLinkProps}>National Disaster Response Force (NDRF) <span aria-hidden="true">↗</span></a>
              <a className="emergency-resource-link" href="https://ndma.gov.in/" {...officialLinkProps}>National Disaster Management Authority (NDMA) <span aria-hidden="true">↗</span></a>
              <div className="emergency-local-note"><strong>Local disaster-response contacts</strong><p>Not configured for your location. Contact details vary by state and district.</p></div>
              <p className="emergency-fine-print">NDRF information is a national resource. A general helpline does not guarantee a local rescue dispatch. <a href="https://112.gov.in/" {...officialLinkProps}>ERSS 112 · Government of India</a></p>
            </div>
          </details>
        </div>
      </section>

      <footer className="emergency-footer">
        <span>Personal SOS messages require your review and confirmation.</span>
        <a href="https://112.gov.in/faq" {...officialLinkProps}>112 ERSS information and FAQs</a>
      </footer>
    </main>
  )
}

export default EmergencyPage
