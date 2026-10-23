import './EmergencyPage.css'
import NearbyResources from './NearbyResources'
import SafetyTips from './SafetyTips'
import SosPanel from './SosPanel'

const officialLinkProps = { target: '_blank', rel: 'noreferrer noopener' }

function EmergencyPage() {
  return (
    <main className="emergency-page" aria-labelledby="emergency-title">
      <header className="emergency-header">
        <div className="emergency-title-group">
          <span className="emergency-brand-mark" aria-hidden="true">F</span>
          <div><p className="emergency-eyebrow">Flood Vision <span aria-hidden="true">/</span> Emergency response</p><h1 id="emergency-title">Emergency Assistance</h1></div>
          <span className="emergency-page-status"><span aria-hidden="true" /> National number · 112</span>
        </div>
        <a className="emergency-call emergency-header-call" href="tel:112" aria-label="Call India's national emergency number 112"><span className="call-112-number">112</span><span>Call emergency services</span></a>
      </header>

      <p className="emergency-intro emergency-compact-intro">If you or someone nearby is in immediate danger, call India’s national emergency number.</p>

      <div className="emergency-command-layout">
        <SosPanel />
        <NearbyResources />
      </div>

      <section className="emergency-secondary-section" aria-label="Additional emergency guidance and resources">
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
      </section>

      <footer className="emergency-footer">
        <span>Personal SOS messages require your review and confirmation.</span>
        <a href="https://112.gov.in/faq" {...officialLinkProps}>112 ERSS information and FAQs</a>
      </footer>
    </main>
  )
}

export default EmergencyPage
