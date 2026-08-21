import { ArrowUpRight } from 'lucide-react'
import { SectionLabel } from '../components/ui/SectionLabel'

export function CurrentSignals() {
  return (
    <section className="content-section signals" id="notes" aria-labelledby="signals-title">
      <SectionLabel index="04">Current signals</SectionLabel>
      <div className="signals-grid">
        <div>
          <h2 id="signals-title">What I am exploring now.</h2>
          <p>A living section for experiments, working notes, and ideas that are becoming useful in practice.</p>
        </div>
        <article className="signal-note">
          <p className="signal-status">In progress</p>
          <h3>Engineering notes are on the way.</h3>
          <p>TODO_CONTENT: Add a first public note, experiment, or technical observation when ready.</p>
          <span aria-hidden="true"><ArrowUpRight size={18} /></span>
        </article>
      </div>
    </section>
  )
}
