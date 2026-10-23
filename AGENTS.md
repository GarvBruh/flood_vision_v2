# Project 2.0 — Shared Development Rules

## Technology
- React
- TypeScript
- Vite
- npm

Inspect existing files before changing architecture or adding dependencies.

## Product direction
Build a practical, map-first rainfall and urban-waterlogging information platform.
- Avoid generic landing pages and unnecessary explanatory tabs.
- Prioritize useful actions, clear icons, interactive maps and concise popups.
- Emergency help should be easily accessible without taking over the home screen.
- Never present mock data as verified live information.

## Team ownership

### Map/UI developer — feat/map-ui
Owns:
- Main map-first home screen
- Map display, markers, interactions and popups
- Search and location controls
- Overall visual design and navigation layout

### Emergency developer — feat/emergency
Owns:
- Emergency screen and emergency-specific user journey
- Helplines and contact actions
- Hospital, medical-store and assistance-resource interfaces
- Emergency-specific cards and interactions

## Shared-file rules
- Coordinate changes to App.tsx, routing, global styles, package.json, package-lock.json and shared configuration.
- Do not independently rewrite shared files.
- Keep features modular and avoid editing files owned by the other developer.
- Agree on component interfaces before integration.
- Review diffs before committing.
- Never force-push or rewrite shared history without team agreement.

## Data integrity
- Never present mock data as live or verified.
- Label demo data clearly.
- Never invent emergency numbers, hospitals, rescue stations, safe zones or rainfall readings.
- Communicate uncertainty and data freshness.

## Git workflow
- main: stable integrated code.
- feat/map-ui: map/UI development.
- feat/emergency: emergency development.
- Commit and push work to the appropriate branch.
- Review and test changes before merging.
- Do not merge unfinished work just to synchronize branches.

## Before implementation
Inspect the repository and explain the intended file changes before making broad modifications.