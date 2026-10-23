function SafetyTips() {
  return (
    <div>
      <ul className="ep-safety-list" aria-label="Flood safety guidance">
        <li className="ep-safety-item">
          <span className="ep-safety-num" aria-hidden="true">1</span>
          <p className="ep-safety-text">
            <strong>Stay out of floodwater.</strong>{' '}
            Never walk, swim, or drive through it.
          </p>
        </li>
        <li className="ep-safety-item">
          <span className="ep-safety-num" aria-hidden="true">2</span>
          <p className="ep-safety-text">
            <strong>Avoid electrical hazards.</strong>{' '}
            Don't touch wet equipment or downed power lines.
          </p>
        </li>
        <li className="ep-safety-item">
          <span className="ep-safety-num" aria-hidden="true">3</span>
          <p className="ep-safety-text">
            <strong>Follow official instructions.</strong>{' '}
            Evacuate promptly when local authorities direct you to.
          </p>
        </li>
      </ul>

      <details style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--rule)' }}>
        <summary
          style={{
            width: 'fit-content',
            fontSize: 'var(--fs-small)',
            color: 'var(--accent)',
            cursor: 'pointer',
            listStyle: 'none',
          }}
        >
          More safety tips
        </summary>
        <ul
          style={{
            display: 'grid',
            gap: 8,
            marginTop: 10,
            paddingLeft: 20,
            color: 'var(--muted)',
            fontSize: 'var(--fs-small)',
            lineHeight: 1.55,
          }}
        >
          <li>Move to higher ground if water is rising and it is safe to do so.</li>
          <li>If trapped indoors, go to the highest level; avoid a closed attic.</li>
          <li>After flooding, wait for authorities to confirm an area is safe before returning.</li>
        </ul>
      </details>

      <p
        style={{
          marginTop: 14,
          fontSize: 'var(--fs-small)',
          color: 'var(--faint)',
          lineHeight: 1.5,
        }}
      >
        Guidance:{' '}
        <a
          href="https://www.ready.gov/floods"
          target="_blank"
          rel="noreferrer noopener"
          style={{ color: 'var(--accent)' }}
        >
          Ready.gov flood safety
        </a>
      </p>
    </div>
  )
}

export default SafetyTips
