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
  } catch { /* Use an empty profile when saved data is malformed. */ }
  return emptyProfile
}

function validPhone(value: string) {
  const digits = value.replace(/\D/g, '')
  return digits.length >= 7 && digits.length <= 15 && /^[+\d().\s-]+$/.test(value)
}

function phoneForWhatsApp(value: string) { return value.replace(/\D/g, '') }
function getInitials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?'
}

function handleDialogKeyDown(event: KeyboardEvent<HTMLElement>, close: () => void) {
  if (event.key === 'Escape') { close(); return }
  if (event.key !== 'Tab') return
  const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
    'a[href], button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
  )).filter((element) => element.offsetParent !== null)
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
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 })
  })
}

function SosPanel() {
  const [contacts, setContacts] = useState<Contact[]>(readContacts)
  const [selectedIds, setSelectedIds] = useState<string[]>(() => readContacts().map((contact) => contact.id))
  const [profile, setProfile] = useState<Profile>(readProfile)
  const [draft, setDraft] = useState({ name: '', relationship: '', phone: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [managing, setManaging] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [prepared, setPrepared] = useState<PreparedAlert | null>(null)

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
      persistContacts(contacts.map((item) => item.id === editingId ? { ...item, name, relationship, phone } : item))
    } else {
      const contact = { id: crypto.randomUUID(), name, relationship, phone }
      persistContacts([...contacts, contact])
      setSelectedIds((current) => [...current, contact.id])
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
    persistContacts(contacts.filter((contact) => contact.id !== id))
    setSelectedIds((current) => current.filter((selected) => selected !== id))
    if (editingId === id) { setEditingId(null); setDraft({ name: '', relationship: '', phone: '' }) }
  }

  async function prepareAlert() {
    if (!selectedIds.length) { setError('Select at least one contact to prepare an alert.'); setConfirming(false); return }
    setPreparing(true)
    setError('')
    let locationLine = 'Location could not be obtained.'
    let locationNote = 'Your location was unavailable. You can still use the message and enter a location manually.'
    let mapsUrl = ''
    try {
      const position = await getPosition()
      const latitude = position.coords.latitude
      const longitude = position.coords.longitude
      mapsUrl = `https://maps.google.com/?q=${latitude},${longitude}`
      locationLine = `Current coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}\nMap: ${mapsUrl}`
      locationNote = 'Current device location included. Check it before sending.'
    } catch {
      if (profile.manualLocation.trim()) {
        locationLine = `Manual location provided by the user: ${profile.manualLocation.trim()}`
        locationNote = 'GPS location was unavailable. The message uses your manually entered location.'
      }
    }
    const now = new Date()
    const time = now.toLocaleString()
    const message = [
      'SOS — EMERGENCY HELP NEEDED',
      profile.name.trim() ? `Name: ${profile.name.trim()}` : '',
      profile.phone.trim() ? `Phone: ${profile.phone.trim()}` : '',
      locationLine,
      `Alert prepared: ${time}`,
      'Please contact me and help arrange assistance. If there is immediate danger, call local emergency services.',
    ].filter(Boolean).join('\n')
    setPrepared({ message, locationNote, createdAt: now.toLocaleTimeString() })
    setConfirming(false)
    setPreparing(false)
  }

  const selectedContacts = contacts.filter((contact) => selectedIds.includes(contact.id))
  const smsHref = selectedContacts.length
    ? `sms:${selectedContacts.map((contact) => contact.phone.replace(/[\s().-]/g, '')).join(',')}?body=${encodeURIComponent(prepared?.message ?? '')}`
    : undefined

  return (
    <section className="emergency-card sos-card" aria-labelledby="sos-title">
      <div className="emergency-card-heading sos-heading">
        <span className="emergency-icon sos-icon" aria-hidden="true">SOS</span>
        <div><p className="emergency-label">Personal emergency plan</p><h2 id="sos-title">Your SOS command center</h2></div>
        <span className={`sos-ready-indicator${contacts.length ? ' is-ready' : ''}`}><span aria-hidden="true" />{contacts.length ? 'Contacts ready' : 'Setup needed'}</span>
      </div>
      <p className="sos-explainer">Prepare a message for trusted people. Personal SOS does not contact emergency services automatically.</p>

      <div className="sos-summary-row">
        <div className="sos-contact-summary" aria-live="polite">
          <strong>{contacts.length ? `${contacts.length} saved contact${contacts.length === 1 ? '' : 's'}` : 'No contacts saved yet'}</strong>
          {selectedIds.length > 0 && <span>{selectedIds.length} selected for alert</span>}
        </div>
        <button className="emergency-secondary-button sos-manage-button" type="button" onClick={() => { setError(''); setManaging(true) }}>
          {contacts.length ? 'Add / edit contacts' : 'Add trusted contacts'}
        </button>
      </div>
      {contacts.length > 0 && <ul className="sos-contact-chips" aria-label="Saved emergency contacts">
        {contacts.map((contact) => <li className={selectedIds.includes(contact.id) ? 'is-selected' : ''} key={contact.id}><span className="sos-contact-avatar" aria-hidden="true">{getInitials(contact.name)}</span><span><strong>{contact.name}</strong><small>{contact.relationship}</small></span><span className="sos-chip-state" aria-label={selectedIds.includes(contact.id) ? 'Selected' : 'Not selected'}>{selectedIds.includes(contact.id) ? '✓' : '–'}</span></li>)}
      </ul>}
      <div className="sos-action-row">
        <button className="sos-trigger sos-primary-trigger" type="button" onClick={() => { setPrepared(null); setError(''); setConfirming(true) }} disabled={!selectedIds.length}>
          <span className="sos-trigger-symbol" aria-hidden="true">SOS</span><span>{selectedIds.length ? 'Prepare SOS message' : 'Add a contact to activate SOS'}<small>{selectedIds.length ? `For ${selectedIds.length} selected contact${selectedIds.length === 1 ? '' : 's'}` : 'Your message stays under your control'}</small></span><span className="sos-trigger-arrow" aria-hidden="true">→</span>
        </button>
        <p className="sos-safety-note">You’ll review the message and choose whether to open SMS or WhatsApp. Nothing is sent automatically.</p>
      </div>
      {error && <p className="emergency-inline-error" role="alert">{error}</p>}

      {managing && <div className="emergency-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setManaging(false) }}>
        <section className="emergency-dialog sos-manage-dialog" role="dialog" aria-modal="true" aria-labelledby="sos-manage-title" onKeyDown={(event) => handleDialogKeyDown(event, () => setManaging(false))}>
          <div className="sos-dialog-heading"><div><p className="emergency-label">Personal emergency plan</p><h3 id="sos-manage-title">Manage trusted contacts</h3></div><button autoFocus className="sos-dialog-close" type="button" onClick={() => setManaging(false)} aria-label="Close contact manager">×</button></div>
          <p className="sos-privacy">Contacts and alert details are saved only in this browser. They are not uploaded or synced.</p>
          <div className="sos-profile">
            <h4>Your details for the alert <span>Optional</span></h4>
            <div className="sos-profile-fields">
              <label>Your name<input value={profile.name} onChange={(event) => persistProfile({ ...profile, name: event.target.value })} autoComplete="name" /></label>
              <label>Your phone<input type="tel" value={profile.phone} onChange={(event) => persistProfile({ ...profile, phone: event.target.value })} autoComplete="tel" /></label>
              <label className="sos-location-field">Manual location<input value={profile.manualLocation} onChange={(event) => persistProfile({ ...profile, manualLocation: event.target.value })} placeholder="Area, landmark, or address" /></label>
            </div>
          </div>
          <h4 className="sos-dialog-subhead">Choose who receives a prepared alert</h4>
          {contacts.length === 0 ? <p className="sos-empty">No contacts saved yet. Add someone you trust.</p> : <ul className="sos-contact-list">
            {contacts.map((contact) => <li key={contact.id}>
              <label className="sos-contact-select"><input type="checkbox" checked={selectedIds.includes(contact.id)} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, contact.id] : current.filter((id) => id !== contact.id))} /><span><strong>{contact.name}</strong><small>{contact.relationship} · {contact.phone}</small></span></label>
              <span className="sos-contact-actions"><button type="button" className="emergency-text-button" onClick={() => editContact(contact)}>Edit</button><button type="button" className="emergency-text-button" onClick={() => deleteContact(contact.id)} aria-label={`Delete ${contact.name}`}>Delete</button></span>
            </li>)}
          </ul>}
          <form className="sos-contact-form" onSubmit={submitContact}>
            <label>Name<input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} autoComplete="off" /></label>
            <label>Relationship<input required value={draft.relationship} onChange={(event) => setDraft({ ...draft, relationship: event.target.value })} placeholder="Parent, friend, guardian…" /></label>
            <label>Phone number<input required type="tel" inputMode="tel" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} placeholder="Include country code if needed" /></label>
            <button className="emergency-secondary-button" type="submit">{editingId ? 'Save contact' : 'Add contact'}</button>
            {editingId && <button className="emergency-text-button" type="button" onClick={() => { setEditingId(null); setDraft({ name: '', relationship: '', phone: '' }) }}>Cancel edit</button>}
          </form>
          {error && <p className="emergency-inline-error" role="alert">{error}</p>}
          <p className="emergency-fine-print">Only opening a messaging app shares the prepared message with that app. Sending requires your confirmation.</p>
        </section>
      </div>}

      {confirming && <div className="emergency-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirming(false) }}>
        <section className="emergency-dialog" role="dialog" aria-modal="true" aria-labelledby="sos-confirm-title" onKeyDown={(event) => handleDialogKeyDown(event, () => setConfirming(false))}>
          <p className="emergency-label">Confirm alert preparation</p><h3 id="sos-confirm-title">Prepare an SOS for {selectedContacts.length} contact{selectedContacts.length === 1 ? '' : 's'}?</h3>
          <p className="emergency-muted">We’ll request your device location. Review the generated message before opening your messaging app. No alert will be sent automatically.</p>
          <div className="emergency-dialog-actions"><button className="emergency-secondary-button" type="button" onClick={() => setConfirming(false)}>Go back</button><button autoFocus className="sos-trigger" type="button" disabled={preparing} onClick={prepareAlert}>{preparing ? 'Getting location…' : 'Continue'}</button></div>
        </section>
      </div>}

      {prepared && <div className="emergency-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setPrepared(null) }}>
        <section className="emergency-dialog sos-prepared-dialog" role="dialog" aria-modal="true" aria-labelledby="sos-prepared-title" onKeyDown={(event) => handleDialogKeyDown(event, () => setPrepared(null))}>
          <p className="emergency-label">Prepared at {prepared.createdAt}</p><h3 id="sos-prepared-title">Review before sending</h3>
          <p className="sos-location-feedback" role="status">{prepared.locationNote}</p>
          <label className="sos-message-label" htmlFor="sos-message">Message</label><textarea autoFocus id="sos-message" className="sos-message" readOnly value={prepared.message} rows={7} />
          <p className="emergency-fine-print">Opening an app does not mean the message was sent. Confirm sending in the app.</p>
          <div className="sos-send-actions">
            {smsHref && <a className="emergency-secondary-button" href={smsHref}>Open SMS for selected contacts</a>}
            {selectedContacts.map((contact) => <a className="emergency-secondary-button" key={contact.id} href={`https://wa.me/${phoneForWhatsApp(contact.phone)}?text=${encodeURIComponent(prepared.message)}`} target="_blank" rel="noreferrer noopener">WhatsApp · {contact.name}</a>)}
            {typeof navigator.share === 'function' && <button className="emergency-secondary-button" type="button" onClick={() => { void navigator.share({ title: 'Emergency SOS', text: prepared.message }).catch(() => undefined) }}>Share…</button>}
            <button className="emergency-text-button" type="button" onClick={() => setPrepared(null)}>Close</button>
          </div>
        </section>
      </div>}
    </section>
  )
}

export default SosPanel
