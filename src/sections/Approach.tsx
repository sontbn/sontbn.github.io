import { SectionLabel } from '../components/ui/SectionLabel'

const steps = [
  ['01', 'Understand the operating reality', 'Start with people, process, constraints, and the actual job a system needs to do.'],
  ['02', 'Make deliberate technical decisions', 'Shape architecture and workflows around maintainability, integration boundaries, and real delivery constraints.'],
  ['03', 'Build for the work after launch', 'Treat reliability, clarity, observability, and change as part of the product—not an afterthought.'],
]

export function Approach() {
  return (
    <section className="content-section approach" id="approach" aria-labelledby="approach-title">
      <SectionLabel index="02">Operating context</SectionLabel>
      <div className="approach-intro">
        <h2 id="approach-title">Engineering that starts with the system around the software.</h2>
        <p>Good delivery is not just implementation. It is making the right trade-offs between user needs, organisational reality, technical quality, and the next person who has to maintain it.</p>
      </div>
      <ol className="approach-list">
        {steps.map(([number, title, description]) => (
          <li key={number}>
            <span>{number}</span>
            <div><h3>{title}</h3><p>{description}</p></div>
          </li>
        ))}
      </ol>
    </section>
  )
}
