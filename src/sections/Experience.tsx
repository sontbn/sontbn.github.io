import { SectionLabel } from '../components/ui/SectionLabel'
import { capabilities, experienceSignals, technologyGroups } from '../data/capabilities'

export function Experience() {
  return (
    <section className="content-section experience" id="experience" aria-labelledby="experience-title">
      <SectionLabel index="03">Experience & capabilities</SectionLabel>
      <div className="experience-layout">
        <div>
          <h2 id="experience-title">A broad practice, anchored in delivery.</h2>
          <p className="experience-lede">Across software engineering, governance, public platforms, and independent consulting, the through-line is making complex work clearer and more dependable.</p>
        </div>
        <ol className="timeline">
          {experienceSignals.map(signal => (
            <li key={signal.period}><p>{signal.period}</p><div><h3>{signal.title}</h3><p>{signal.description}</p></div></li>
          ))}
        </ol>
      </div>
      <div className="capability-grid">
        {capabilities.map(capability => (
          <article key={capability.title}>
            <h3>{capability.title}</h3>
            <p>{capability.description}</p>
            <span>{capability.evidence}</span>
          </article>
        ))}
      </div>
      <div className="technology-context">
        <p className="small-heading">Technology in context</p>
        <div>
          {technologyGroups.map(([group, ...items]) => (
            <p key={group}><strong>{group}</strong><span>{items.join(' · ')}</span></p>
          ))}
        </div>
      </div>
    </section>
  )
}
