import { useState, type FormEvent } from 'react'
import './EmergencyAssistant.css'

type ReplyKind = 'danger' | 'water' | 'medical' | 'rescue'

const replies: Record<ReplyKind, { title: string; text: string; link?: { label: string; href: string } }> = {
  danger: {
    title: 'I need urgent help',
    text: 'If anyone is in immediate danger in India, call the national emergency number 112. This guide cannot request or confirm a rescue dispatch.',
    link: { label: 'Open the official 112 portal', href: 'https://112.gov.in/' },
  },
  water: {
    title: 'Is it safe to cross floodwater?',
    text: 'No. Do not walk, swim, or drive through floodwater. Avoid downed power lines and follow instructions from local authorities.',
    link: { label: 'More flood safety guidance', href: 'https://www.ready.gov/floods' },
  },
  medical: {
    title: 'Find nearby medical help',
    text: 'Nearby medical search is available on the Emergency Response page. Results use public map data and do not confirm that a facility is open or available.',
  },
  rescue: {
    title: 'Flood rescue resources',
    text: 'For immediate danger call 112. National disaster-management information is available from NDRF; this link does not guarantee local rescue dispatch.',
    link: { label: 'National Disaster Response Force', href: 'https://www.ndrf.gov.in/en' },
  },
}

const prompts: { label: string; kind: ReplyKind }[] = [
  { label: 'I need urgent help', kind: 'danger' },
  { label: 'Can I cross floodwater?', kind: 'water' },
  { label: 'Find medical help', kind: 'medical' },
  { label: 'Rescue resources', kind: 'rescue' },
]

function AssistantMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 12h2.3l1.5-4 3.1 8 2.3-5 1.3 2H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function EmergencyAssistant({ onOpenEmergency }: { onOpenEmergency: () => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [replyKind, setReplyKind] = useState<ReplyKind | null>(null)
  const [isUnsupported, setIsUnsupported] = useState(false)

  function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalized = question.toLowerCase()
    const matchedKind: ReplyKind | null = /112|urgent|emergency|danger|help/.test(normalized)
      ? 'danger'
      : /water|cross|drive|walk|flood/.test(normalized)
        ? 'water'
        : /hospital|medical|pharmacy|doctor|medicine/.test(normalized)
          ? 'medical'
          : /rescue|ndrf|trapped/.test(normalized)
            ? 'rescue'
            : null
    setReplyKind(matchedKind)
    setIsUnsupported(!matchedKind)
    setQuestion('')
  }

  return (
    <aside className="fv-assistant" aria-label="Flood Vision safety assistant">
      <section
        id="fv-assistant-panel"
        className={`fv-assistant-panel${isOpen ? ' is-open' : ''}`}
        aria-labelledby="fv-assistant-title"
        aria-hidden={!isOpen}
        inert={!isOpen}
      >
          <header className="fv-assistant-header">
            <span className="fv-assistant-mark"><AssistantMark /></span>
            <div className="fv-assistant-heading">
              <h2 id="fv-assistant-title">Flood Vision Assistant</h2>
              <p><span className="fv-assistant-status-dot" /> Guided safety help · AI not connected</p>
            </div>
            <button className="fv-assistant-close" type="button" onClick={() => setIsOpen(false)} aria-label="Close assistant">×</button>
          </header>

          <div className="fv-assistant-body" aria-live="polite">
            <p className="fv-assistant-note">This offline guide shares general information; it cannot assess conditions or dispatch help. For immediate danger, call <a href="tel:112">112</a>.</p>
            {replyKind && (
              <div className="fv-assistant-reply">
                <span className="fv-assistant-reply-label">{replies[replyKind].title}</span>
                <p>{replies[replyKind].text}</p>
                {replyKind === 'medical' && <button type="button" className="fv-assistant-inline-action" onClick={onOpenEmergency}>Open medical assistance</button>}
                {replies[replyKind].link && (
                  <a href={replies[replyKind].link.href} target="_blank" rel="noreferrer noopener">
                    {replies[replyKind].link.label} <span aria-hidden="true">↗</span>
                  </a>
                )}
              </div>
            )}
            {isUnsupported && <p className="fv-assistant-unsupported">I can only provide these guided topics while the AI service is offline. For urgent help, call <a href="tel:112">112</a>.</p>}
            <p className="fv-assistant-prompt-label">Try asking</p>
            <div className="fv-assistant-prompts">
              {prompts.map(({ label, kind }) => (
                <button key={kind} type="button" onClick={() => { setReplyKind(kind); setIsUnsupported(false) }}>{label}</button>
              ))}
            </div>
          </div>

          <form className="fv-assistant-input-row" onSubmit={submitQuestion}>
            <label className="fv-sr-only" htmlFor="fv-assistant-question">Ask a flood-safety question</label>
            <input id="fv-assistant-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about flood safety…" />
            <button type="submit" disabled={!question.trim()} aria-label="Get guided safety information">↗</button>
          </form>
        </section>

      <button
        className={`fv-assistant-launcher${isOpen ? ' is-open' : ''}`}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls="fv-assistant-panel"
      >
        <span className="fv-assistant-launcher-mark"><AssistantMark /></span>
        <span className="fv-assistant-launcher-copy">
          <span className="fv-assistant-launcher-eyebrow">Flood safety</span>
          <span className="fv-assistant-launcher-title">{isOpen ? 'Close assistant' : 'Ask Flood Vision'}</span>
        </span>
        <span className="fv-assistant-launcher-arrow" aria-hidden="true">↗</span>
      </button>
    </aside>
  )
}
