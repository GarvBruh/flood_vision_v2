# Flood Vision 2.0 — Emergency UI Redesign Brief

## Goal
Redesign the existing Emergency Assistance page into a polished, premium emergency-response interface. This is a major visual rethink, not an incremental CSS pass.

## Visual direction
- Cinematic midnight navy with subtle blue atmospheric gradients.
- Strong typography, readable text, intentional whitespace and visual depth.
- Asymmetric, editorial composition instead of repetitive dashboard cards.
- Restrained coral/red for SOS and amber for warnings.
- Remove unnecessary borders, tiny uppercase labels, empty panels and repetitive containers.
- Responsive, accessible, touch-friendly and keyboard navigable.
- Restrained transitions with prefers-reduced-motion support.

## Priority hierarchy
1. Official India 112 emergency-call action.
2. Personal SOS command center and saved contacts.
3. Location and nearby medical assistance.
4. Verified official disaster-response resources.
5. Compact, expandable flood-safety guidance.

## Existing functionality to inspect and preserve
- Emergency contact management and selection.
- SOS message preparation and user confirmation.
- Location permissions and nearby assistance lookup.
- Official resource links and safety guidance.
- Honest loading, empty, timeout and error states.

Do not claim personal SOS automatically contacts emergency services. Do not imply an alert was sent when it was only prepared.

## Data integrity
- No fabricated hospitals, pharmacies, shelters, rescue centres, incidents, statistics or live readings.
- No fake alert-delivery states or fabricated community data.
- Use real provider results and verified official resources.
- Clearly communicate unavailable data and provider failures.

## Git and architecture boundaries
- Emergency feature work belongs on feat/emergency.
- The teammate owns the map UI on feat/map-ui.
- Keep emergency styles scoped and the feature modular.
- Avoid changing shared routing, App.tsx, global styles, map files, or dependencies without a clear need.
- Never reset or discard existing work.
- Do not commit, push, merge, or switch branches without the user's approval.

## Acceptance criteria
- The actual browser UI looks substantially different from the old generic dashboard.
- Desktop and mobile layouts are visually inspected.
- Existing interactions continue to work.
- No empty, oversized panels or misleading data.
- npm run lint and npm run build pass.
