import { useState, type FormEvent, type KeyboardEvent } from 'react'

type Contact = { id: string; name: string; relationship: string; phone: string }
type Profile = { name: string; phone: string; manualLocation: string }
type PreparedAlert = { message: string; locationNote: string; createdAt: string }

const CONTACTS_KEY = 'flood-vision-emergency-contacts-v1'
const PROFILE_KEY = 'flood-vision-emergency-profile-v1'
const emptyProfile: Profile = { name: '', phone: '', manualLocation: '' }

function readContacts(): Contact[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(CONTACTS_KEY) ?? '[]')
    if (!Array.isArray(value)) return []
    return value.filter((item): item is Contact => Boolean(
      item && typeof item.id === 'string' && typeof item.name === 'string' &&
      typeof item.relationship === 'string' && typeof item.phone === 'string',
    ))
  } catch { return [] }
}

function readProfile(): Profile {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? '{}')
    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>
      return {
        name: typeof record.name === 'string' ? record.name : '',
        phone: typeof record.phone === 'string' ? record.phone : '',
        manualLocation: typeof record.manualLocation === 'string' ? record.manualLocation : '',
      }
    }
  } catch { /* use empty profile when data is malformed */ }
  return emptyProfile
}

function validPhone(value: string) {
  const digits = value.replace(/\D/g, '')
  return digits.length >= 7 && digits.length <= 15 && /^[+\d().\s-]+$/.test(value)
}

function phoneForWhatsApp(value: string) { return value.replace(/\D/g, '') }

function getInitials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2)
    .map((part) => part[0]?.toUpperCase()).join('') || '?'
}

function handleDialogKeyDown(event: KeyboardEvent<HTMLElement>, close: () => void) {
  if (event.key === 'Escape') { close(); return }
  if (event.key !== 'Tab') return
  const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
    'a[href], button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
  )).filter((el) => el.offsetParent !== null)
  if (!focusable.length) { event.preventDefault(); return }
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Location is not supported by this browser.'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true, timeout: 12000, maximumAge: 30000,
    })
  })
}

function SosPanel() {
  const [contacts, setContacts]       = useState<Contact[]>(readContacts)
  const [selectedIds, setSelectedIds] = useState<string[]>(() => readContacts().map((c) => c.id))
  const [profile, setProfile]         = useState<Profile>(readProfile)
  const [draft, setDraft]             = useState({ name: '', relationship: '', phone: '' })
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [error, setError]             = useState('')
  const [managing, setManaging]       = useState(false)
  const [confirming, setConfirming]   = useState(false)
  const [preparing, setPreparing]     = useState(false)
  const [prepared, setPrepared]       = useState<PreparedAlert | null>(null)

  function persistContacts(next: Contact[]) {
    setContacts(next)
    try { localStorage.setItem(CONTACTS_KEY, JSON.stringify(next)); setError('') }
    catch { setError('Browser storage is unavailable. Contacts will not persist after you close this page.') }
  }

  function persistProfile(next: Profile) {
    setProfile(next)
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(next)); setError('') }
    catch { setError('Browser storage is unavailable. Your alert details will not persist after you close this page.') }
  }

  function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = draft.name.trim()
    const relationship = draft.relationship.trim()
    const phone = draft.phone.trim()
    if (!name || !relationship || !phone) { setError('Enter a name, relationship, and phone number.'); return }
    if (!validPhone(phone)) { setError('Enter a valid phone number with 7 to 15 digits.'); return }
    setError('')
    if (editingId) {
      persistContacts(contacts.map((c) => c.id === editingId ? { ...c, name, relationship, phone } : c))
    } else {
      const contact = { id: crypto.randomUUID(), name, relationship, phone }
      persistContacts([...contacts, contact])
      setSelectedIds((cur) => [...cur, contact.id])
    }
    setDraft({ name: '', relationship: '', phone: '' })
    setEditingId(null)
  }

  function editContact(contact: Contact) {
    setDraft({ name: contact.name, relationship: contact.relationship, phone: contact.phone })
    setEditingId(contact.id)
    setError('')
  }

  function deleteContact(id: string) {
    persistContacts(contacts.filter((c) => c.id !== id))
    setSelectedIds((cur) => cur.filter((sid) => sid !== id))
    if (editingId === id) { setEditingId(null); setDraft({ name: '', relationship: '', phone: '' }) }
  }

  async function prepareAlert() {
    if (!selectedIds.length) { setError('Select at least one contact to prepare an alert.'); setConfirming(false); return }
    setPreparing(true)
    setError('')
    let locationLine = 'Location could not be obtained.'
    let locationNote = 'Your location was unavailable. You can still use the message and enter a location manually.'
    try {
      const position = await getPosition()
      const lat = position.coords.latitude
      const lon = position.coords.longitude
      const mapsUrl = `https://maps.google.com/?q=${lat},${lon}`
      locationLine = `Current coordinates: ${lat.toFixed(6)}, ${lon.toFixed(6)}\nMap: ${mapsUrl}`
      locationNote = 'Current device location included. Check it before sending.'
    } catch {
      if (profile.manualLocation.trim()) {
        locationLine = `Manual location provided by the user: ${profile.manualLocation.trim()}`
        locationNote = 'GPS location was unavailable. The message uses your manually entered location.'
      }
    }
    const now = new Date()
    const message = [
      'SOS — EMERGENCY HELP NEEDED',
      profile.name.trim() ? `Name: ${profile.name.trim()}` : '',
      profile.phone.trim() ? `Phone: ${profile.phone.trim()}` : '',
      locationLine,
      `Alert prepared: ${now.toLocaleString()}`,
      'Please contact me and help arrange assistance. If there is immediate danger, call local emergency services.',
    ].filter(Boolean).join('\n')
    setPrepared({ message, locationNote, createdAt: now.toLocaleTimeString() })
    setConfirming(false)
    setPreparing(false)
  }

  const selectedContacts = contacts.filter((c) => selectedIds.includes(c.id))
  const smsHref = selectedContacts.length
    ? `sms:${selectedContacts.map((c) => c.phone.replace(/[\s().-]/g, '')).join(',')}?body=${encodeURIComponent(prepared?.message ?? '')}`
    : undefined

  const readyStatus = contacts.length > 0
    ? (selectedIds.length > 0 ? 'ready' : 'partial')
    : 'setup'

  return (
    <>
      <div className="ep-panel-grid" style={{ marginTop: 20 }}>
        {/* ── Main SOS card ──────────────────────────────────────────────── */}
        <div className="ep-panel ep-panel-full">
          <div className="ep-panel-header">
            <div>
              <p className="ep-panel-label">Personal emergency plan</p>
              <p className="ep-panel-title">SOS message preparation</p>
            </div>

            {/* Status pill — the one status signal on this card */}
            {readyStatus === 'ready' && (
              <span className="ep-pill ep-pill-positive">
                <span className="ep-pill-dot" />
                {contacts.length} contact{contacts.length > 1 ? 's' : ''} ready
              </span>
            )}
            {readyStatus === 'partial' && (
              <span className="ep-pill ep-pill-warning">
                <span className="ep-pill-dot" />
                No contacts selected
              </span>
            )}
            {readyStatus === 'setup' && (
              <span className="ep-pill ep-pill-neutral">
                <span className="ep-pill-dot" />
                Setup needed
              </span>
            )}
          </div>

          <p className="ep-sos-explainer">
            Prepare a message for trusted people. Personal SOS does not contact emergency
            services automatically — you review and send via SMS, WhatsApp, or Share.
          </p>

          {/* Contact summary row */}
          <div className="ep-sos-summary">
            <div>
              <p className="ep-sos-count">
                {contacts.length
                  ? `${contacts.length} saved contact${contacts.length > 1 ? 's' : ''}`
                  : 'No contacts saved yet'}
              </p>
              {selectedIds.length > 0 && (
                <p className="ep-sos-count-sub">
                  {selectedIds.length} selected for alert
                </p>
              )}
            </div>
            <button
              className="ep-btn ep-btn-secondary"
              type="button"
              onClick={() => { setError(''); setManaging(true) }}
            >
              {contacts.length ? 'Manage contacts' : 'Add trusted contacts'}
            </button>
          </div>

          {/* Contact chips */}
          {contacts.length > 0 && (
            <ul className="ep-contact-chips" aria-label="Saved emergency contacts">
              {contacts.map((contact) => (
                <li
                  key={contact.id}
                  className={`ep-contact-chip${selectedIds.includes(contact.id) ? ' is-selected' : ''}`}
                >
                  <span className="ep-contact-avatar" aria-hidden="true">
                    {getInitials(contact.name)}
                  </span>
                  <span>
                    <span className="ep-contact-chip-name">{contact.name}</span>
                    <span className="ep-contact-chip-rel">, {contact.relationship}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* SOS trigger */}
          <div className="ep-sos-action">
            <button
              className="ep-trigger"
              type="button"
              disabled={!selectedIds.length}
              onClick={() => { setPrepared(null); setError(''); setConfirming(true) }}
              aria-label={selectedIds.length ? 'Prepare SOS message' : 'Add a contact to activate SOS'}
            >
              <span className="ep-trigger-icon" aria-hidden="true">SOS</span>
              <span className="ep-trigger-body">
                <span className="ep-trigger-label">
                  {selectedIds.length ? 'Prepare SOS message' : 'Add a contact to activate SOS'}
                </span>
                <span className="ep-trigger-sub">
                  {selectedIds.length
                    ? `For ${selectedIds.length} selected contact${selectedIds.length > 1 ? 's' : ''}`
                    : 'Your message stays under your control'}
                </span>
              </span>
              {selectedIds.length > 0 && <span className="ep-trigger-arrow" aria-hidden="true">→</span>}
            </button>

            <p className="ep-sos-note">
              You'll review the message and choose whether to open SMS or WhatsApp.
              Nothing is sent automatically.
            </p>
          </div>

          {error && (
            <p className="ep-inline-error" role="alert">{error}</p>
          )}
        </div>
      </div>

      {/* ── Dialog: Manage contacts ─────────────────────────────────────── */}
      {managing && (
        <div
          className="ep-backdrop"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setManaging(false) }}
        >
          <section
            className="ep-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ep-manage-title"
            onKeyDown={(e) => handleDialogKeyDown(e, () => setManaging(false))}
          >
            <div className="ep-dialog-header">
              <div>
                <p style={{ fontSize: 'var(--fs-small)', color: 'var(--faint)', marginBottom: 4 }}>
                  Personal emergency plan
                </p>
                <h2 id="ep-manage-title" className="ep-dialog-title">Manage trusted contacts</h2>
              </div>
              <button
                autoFocus
                className="ep-dialog-close"
                type="button"
                onClick={() => setManaging(false)}
                aria-label="Close contact manager"
              >
                ×
              </button>
            </div>

            <p className="ep-fine-print" style={{ marginTop: 0, marginBottom: 14 }}>
              Contacts and alert details are saved only in this browser. They are not uploaded or synced.
            </p>

            {/* Profile fields */}
            <p className="ep-section-head">
              Your details for the alert <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
            </p>
            <div className="ep-profile-grid" style={{ marginBottom: 20 }}>
              <div className="ep-field-group">
                <label className="ep-label" htmlFor="ep-profile-name">Your name</label>
                <input
                  id="ep-profile-name"
                  className="ep-input"
                  value={profile.name}
                  onChange={(e) => persistProfile({ ...profile, name: e.target.value })}
                  autoComplete="name"
                />
              </div>
              <div className="ep-field-group">
                <label className="ep-label" htmlFor="ep-profile-phone">Your phone</label>
                <input
                  id="ep-profile-phone"
                  className="ep-input"
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => persistProfile({ ...profile, phone: e.target.value })}
                  autoComplete="tel"
                />
              </div>
              <div className="ep-field-group ep-field-span">
                <label className="ep-label" htmlFor="ep-profile-location">Manual location</label>
                <input
                  id="ep-profile-location"
                  className="ep-input"
                  value={profile.manualLocation}
                  onChange={(e) => persistProfile({ ...profile, manualLocation: e.target.value })}
                  placeholder="Area, landmark, or address"
                />
              </div>
            </div>

            {/* Contact selection */}
            <p className="ep-section-head">Contacts to receive the alert</p>
            {contacts.length === 0
              ? <p style={{ fontSize: 'var(--fs-body)', color: 'var(--muted)', marginBottom: 12 }}>
                  No contacts saved yet. Add someone you trust below.
                </p>
              : <ul className="ep-contact-list" aria-label="Saved contacts">
                  {contacts.map((contact) => (
                    <li key={contact.id} className="ep-contact-row">
                      <label className="ep-contact-check">
                        <input
                          type="checkbox"
                          style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }}
                          checked={selectedIds.includes(contact.id)}
                          onChange={(e) =>
                            setSelectedIds((cur) =>
                              e.target.checked
                                ? [...cur, contact.id]
                                : cur.filter((id) => id !== contact.id)
                            )
                          }
                        />
                        <span className="ep-contact-info">
                          <span className="ep-contact-name">{contact.name}</span>
                          <span className="ep-contact-detail">
                            {contact.relationship} · {contact.phone}
                          </span>
                        </span>
                      </label>
                      <span className="ep-contact-row-actions">
                        <button
                          type="button"
                          className="ep-btn ep-btn-ghost"
                          onClick={() => editContact(contact)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="ep-btn ep-btn-ghost"
                          style={{ color: 'var(--negative)' }}
                          onClick={() => deleteContact(contact.id)}
                          aria-label={`Delete ${contact.name}`}
                        >
                          Delete
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
            }

            {/* Add / edit form */}
            <p className="ep-section-head">
              {editingId ? 'Edit contact' : 'Add a contact'}
            </p>
            <form className="ep-contact-form" onSubmit={submitContact}>
              <div className="ep-field-group">
                <label className="ep-label" htmlFor="ep-draft-name">Name</label>
                <input
                  id="ep-draft-name"
                  className="ep-input"
                  required
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  autoComplete="off"
                />
              </div>
              <div className="ep-field-group">
                <label className="ep-label" htmlFor="ep-draft-rel">Relationship</label>
                <input
                  id="ep-draft-rel"
                  className="ep-input"
                  required
                  value={draft.relationship}
                  onChange={(e) => setDraft({ ...draft, relationship: e.target.value })}
                  placeholder="Parent, friend, guardian…"
                />
              </div>
              <div className="ep-field-group ep-field-span">
                <label className="ep-label" htmlFor="ep-draft-phone">Phone number</label>
                <input
                  id="ep-draft-phone"
                  className="ep-input"
                  required
                  type="tel"
                  inputMode="tel"
                  value={draft.phone}
                  onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                  placeholder="Include country code if needed"
                />
              </div>

              <div className="ep-dialog-actions" style={{ marginTop: 4, gridColumn: '1 / -1' }}>
                {editingId && (
                  <button
                    type="button"
                    className="ep-btn ep-btn-ghost"
                    onClick={() => { setEditingId(null); setDraft({ name: '', relationship: '', phone: '' }) }}
                  >
                    Cancel
                  </button>
                )}
                <button className="ep-btn ep-btn-primary" type="submit">
                  {editingId ? 'Save contact' : 'Add contact'}
                </button>
              </div>
            </form>

            {error && <p className="ep-inline-error" role="alert">{error}</p>}

            <p className="ep-fine-print">
              Only opening a messaging app shares the prepared message. Sending requires your confirmation in the app.
            </p>
          </section>
        </div>
      )}

      {/* ── Dialog: Confirm preparation ─────────────────────────────────── */}
      {confirming && (
        <div
          className="ep-backdrop"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirming(false) }}
        >
          <section
            className="ep-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ep-confirm-title"
            onKeyDown={(e) => handleDialogKeyDown(e, () => setConfirming(false))}
            style={{ maxWidth: 420 }}
          >
            <div className="ep-dialog-header">
              <h2 id="ep-confirm-title" className="ep-dialog-title">
                Prepare an SOS for {selectedContacts.length} contact{selectedContacts.length > 1 ? 's' : ''}?
              </h2>
            </div>
            <p className="ep-confirm-desc">
              We'll request your device location. Review the generated message before
              opening your messaging app. No alert will be sent automatically.
            </p>
            <div className="ep-dialog-actions">
              <button
                className="ep-btn ep-btn-secondary"
                type="button"
                onClick={() => setConfirming(false)}
              >
                Go back
              </button>
              <button
                autoFocus
                className="ep-btn ep-btn-primary"
                type="button"
                disabled={preparing}
                onClick={() => { void prepareAlert() }}
              >
                {preparing ? 'Getting location…' : 'Continue'}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ── Dialog: Review prepared message ─────────────────────────────── */}
      {prepared && (
        <div
          className="ep-backdrop"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setPrepared(null) }}
        >
          <section
            className="ep-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ep-prepared-title"
            onKeyDown={(e) => handleDialogKeyDown(e, () => setPrepared(null))}
          >
            <div className="ep-dialog-header">
              <div>
                <p style={{ fontSize: 'var(--fs-small)', color: 'var(--faint)', marginBottom: 4 }}>
                  Prepared at {prepared.createdAt}
                </p>
                <h2 id="ep-prepared-title" className="ep-dialog-title">Review before sending</h2>
              </div>
              <button
                className="ep-dialog-close"
                type="button"
                onClick={() => setPrepared(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="ep-location-note" role="status">{prepared.locationNote}</div>

            <div className="ep-field-group">
              <label className="ep-label" htmlFor="ep-sos-message">Message</label>
              <textarea
                autoFocus
                id="ep-sos-message"
                className="ep-textarea"
                readOnly
                value={prepared.message}
                rows={7}
              />
            </div>

            <p className="ep-fine-print">
              Opening an app does not mean the message was sent. Confirm sending in the app.
            </p>

            <div className="ep-dialog-actions-start" style={{ flexWrap: 'wrap' }}>
              {smsHref && (
                <a className="ep-btn ep-btn-secondary" href={smsHref}>
                  Open SMS
                </a>
              )}
              {selectedContacts.map((contact) => (
                <a
                  key={contact.id}
                  className="ep-btn ep-btn-secondary"
                  href={`https://wa.me/${phoneForWhatsApp(contact.phone)}?text=${encodeURIComponent(prepared.message)}`}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  WhatsApp · {contact.name}
                </a>
              ))}
              {typeof navigator.share === 'function' && (
                <button
                  className="ep-btn ep-btn-secondary"
                  type="button"
                  onClick={() => {
                    void navigator.share({ title: 'Emergency SOS', text: prepared.message }).catch(() => undefined)
                  }}
                >
                  Share…
                </button>
              )}
              <button
                className="ep-btn ep-btn-ghost"
                style={{ marginLeft: 'auto' }}
                type="button"
                onClick={() => setPrepared(null)}
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}

export default SosPanel
