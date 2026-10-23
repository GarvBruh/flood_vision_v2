import { MapScreen } from './components/MapScreen/MapScreen'
import './App.css'

/**
 * App — Root Application Shell (Shared file)
 *
 * Owned jointly per AGENTS.md rules.
 * Houses the primary MapScreen (feat/map-ui) and coordinates with
 * the emergency developer's upcoming interfaces (feat/emergency).
 */
function App() {
  return (
    <div className="app-root">
      <MapScreen />
    </div>
  )
}

export default App
