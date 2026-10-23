function SafetyTips() {
  return (
    <section className="emergency-card safety-card" aria-labelledby="safety-title">
      <div className="emergency-card-heading">
        <span className="emergency-icon safety-icon" aria-hidden="true">!</span>
        <div><p className="emergency-label">Flood safety</p><h2 id="safety-title">A few things to remember</h2></div>
      </div>
      <ul className="safety-priority-list">
        <li><p><strong>Stay out of floodwater.</strong> Never walk, swim, or drive through it.</p></li>
        <li><p><strong>Avoid electrical hazards.</strong> Don’t touch wet equipment or downed power lines.</p></li>
        <li><p><strong>Follow official instructions.</strong> Evacuate promptly when local authorities direct you to.</p></li>
      </ul>
      <details className="safety-more">
        <summary>More safety tips</summary>
        <ul>
          <li>Move to higher ground if water is rising and it is safe to do so.</li>
          <li>If trapped indoors, go to the highest level; avoid a closed attic.</li>
          <li>After flooding, wait for authorities to confirm an area is safe before returning.</li>
        </ul>
      </details>
      <p className="safety-source">Guidance: <a href="https://www.ready.gov/floods" target="_blank" rel="noreferrer noopener">Ready.gov flood safety</a></p>
    </section>
  )
}

export default SafetyTips
