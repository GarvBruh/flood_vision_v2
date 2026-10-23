import teamDeoxysMark from '../assets/team-deoxys-optimized.webp'
import './AboutPage.css'

const members = [
  { name: 'Garv Mathur', branch: 'CSIT', role: 'Team Leader' },
  { name: 'Purvesh Bhatla', branch: 'CS' },
  { name: 'Prakhar Bajpai', branch: 'CS' },
  { name: 'Mayank Gaur', branch: 'CSIT' },
  { name: 'Kunal Sharma', branch: 'CSIT' },
]

export default function AboutPage() {
  return (
    <main className="about-page">
      <div className="about-page-inner">
        <header className="about-heading">
          <p className="about-kicker">Flood Vision 2.0 · Project team</p>
          <p className="about-intro">Meet Team Deoxys, the team behind Flood Vision.</p>
        </header>

        <div className="about-layout">
          <section className="about-id-section" aria-label="Team Deoxys identity card">
            <div className="about-lanyard-scene">
              <div className="about-id-hanger">
                <div className="about-lanyard-strap" aria-hidden="true" />
                <div className="about-id-clip" aria-hidden="true"><span /></div>
                <article className="about-id-card">
                  <div className="about-id-card-topline">
                    <span>FLOOD VISION</span>
                    <span>2.0</span>
                  </div>
                  <img src={teamDeoxysMark} alt="Team Deoxys emblem" />
                  <div className="about-id-card-footer">
                    <strong>TEAM DEOXYS</strong>
                    <span>PROJECT TEAM · FLOOD VISION</span>
                  </div>
                </article>
              </div>
            </div>
            <p className="about-id-caption">A team card for the people building Flood Vision.</p>
          </section>

          <section className="about-members" aria-labelledby="about-members-title">
            <div className="about-members-heading">
              <div>
                <p className="about-kicker">The people behind the project</p>
                <h2 id="about-members-title">Team Deoxys</h2>
              </div>
              <span className="about-member-count">{members.length} members</span>
            </div>

            <ol className="about-member-list">
              {members.map((member) => (
                <li className="about-member" key={member.name}>
                  <span className="about-member-initial" aria-hidden="true">{member.name.charAt(0)}</span>
                  <div className="about-member-copy">
                    <div className="about-member-name-line">
                      <h3>{member.name}</h3>
                      {member.role && <span className="about-role">{member.role}</span>}
                    </div>
                    <p>{member.branch}</p>
                  </div>
                  <span className="about-member-branch">{member.branch}</span>
                </li>
              ))}
            </ol>

            <p className="about-details-note">
              Roll numbers, study years, contact numbers and GitHub profiles were not included in the supplied team details.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
