import './EmergencyPage.css'
import NearbyResources from './NearbyResources'
import SafetyTips from './SafetyTips'
import SosPanel from './SosPanel'

const officialLinkProps = { target: '_blank', rel: 'noreferrer noopener' }

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6.6 3.8 9 3.2a1.5 1.5 0 0 1 1.7.9l1.1 2.8a1.5 1.5 0 0 1-.4 1.7l-1.5 1.2a13 13 0 0 0 5.3 5.3l1.2-1.5a1.5 1.5 0 0 1 1.7-.4l2.8 1.1a1.5 1.5 0 0 1 .9 1.7l-.6 2.4a1.8 1.8 0 0 1-1.8 1.4C10.1 19.8 4.2 13.9 4.8 5.6a1.8 1.8 0 0 1 1.8-1.8Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function EmergencyPage() {
  return (
    <>
      <main className="ep-canvas" aria-labelledby="ep-title">
        <section className="ep-emergency-banner" aria-labelledby="ep-title">
          <div className="ep-emergency-copy">
            <div className="ep-emergency-meta">
              <span className="ep-danger-label"><span aria-hidden="true" /> Emergency assistance</span>
              <span className="ep-national-label">India · National emergency number</span>
            </div>
            <h1 id="ep-title">National Emergency Number <span>112</span></h1>
            <p>If you or someone nearby is in immediate danger, call India's national emergency number.</p>
            <p className="ep-emergency-note">Local response is coordinated by the relevant state or union territory authorities.</p>
          </div>
          <div className="ep-emergency-actions">
            <a className="ep-call-now" href="tel:112" aria-label="Call India's national emergency number 112 now">
              <PhoneIcon /> Call 112 Now
            </a>
            <a className="ep-official-portal" href="https://112.gov.in/" {...officialLinkProps}>
              ERSS 112 official portal <span aria-hidden="true">↗</span>
            </a>
          </div>
        </section>

        <div className="ep-command-grid">
          <div className="ep-command-stack">
            <section className="ep-sos-section" aria-label="Personal SOS command center">
              <SosPanel />
            </section>
            <section aria-label="Nearby hospitals and pharmacies">
              <NearbyResources />
            </section>
          </div>

          <div className="ep-command-stack">
            <section className="ep-panel" aria-labelledby="ep-resource-title">
              <div className="ep-panel-header">
                <div>
                  <p className="ep-panel-label">Official resources</p>
                  <h2 className="ep-panel-title" id="ep-resource-title">National disaster response</h2>
                </div>
              </div>
              <p className="ep-resource-intro">
                India’s national emergency number is 112. Contact details and response are managed locally by state and union territory authorities.
              </p>
              <a className="ep-resource-link" href="https://www.ndrf.gov.in/en" {...officialLinkProps}>
                National Disaster Response Force (NDRF) <span className="ep-resource-link-arrow" aria-hidden="true">↗</span>
              </a>
              <a className="ep-resource-link" href="https://ndma.gov.in/" {...officialLinkProps}>
                National Disaster Management Authority (NDMA) <span className="ep-resource-link-arrow" aria-hidden="true">↗</span>
              </a>
              <div className="ep-info-box ep-local-note">
                <strong>Local disaster-response contacts</strong>
                Not configured for your location. Contact details vary by state and district.
              </div>
              <p className="ep-fine-print">
                These national resources do not guarantee a local rescue dispatch. For immediate danger, call <a href="tel:112">112</a>.
              </p>
            </section>

            <section className="ep-panel" aria-labelledby="ep-safety-title">
              <div className="ep-panel-header">
                <div>
                  <p className="ep-panel-label">Flood safety</p>
                  <h2 className="ep-panel-title" id="ep-safety-title">Quick-action guidance</h2>
                </div>
              </div>
              <SafetyTips />
            </section>
          </div>
        </div>
      </main>

      <footer className="ep-footer">
        <span>Personal SOS messages require your review and confirmation.</span>
        <a href="https://112.gov.in/faq" {...officialLinkProps}>112 ERSS information and FAQs</a>
      </footer>
    </>
  )
}

export default EmergencyPage
