import { ProjectIndex } from '../components/work/ProjectIndex'
import { SectionLabel } from '../components/ui/SectionLabel'

export function SelectedWork() {
  return (
    <section className="content-section selected-work" id="work" aria-labelledby="work-title">
      <SectionLabel index="01">Selected work</SectionLabel>
      <div className="section-heading-layout">
        <h2 id="work-title">Systems are more than the screens people see.</h2>
        <p>Selected work is structured around context, constraints, decisions, and the kind of outcome that makes a system worth operating.</p>
      </div>
      <ProjectIndex />
      <p className="content-notice"><span>Note</span> Detailed public case studies are being curated. Confidential work will be described with appropriate context and boundaries.</p>
    </section>
  )
}
