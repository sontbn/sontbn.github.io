import { ChevronDown } from 'lucide-react'
import { projects } from '../../data/projects'

export function ProjectIndex() {
  return (
    <div className="project-index">
      {projects.map(project => (
        <details className="project-entry" key={project.id}>
          <summary>
            <span className="project-number">{project.number}</span>
            <span className="project-title-wrap">
              <span className="project-category">{project.category}</span>
              <span className="project-title">{project.title}</span>
            </span>
            <span className="project-status">In preparation</span>
            <ChevronDown className="project-chevron" aria-hidden="true" size={18} strokeWidth={1.5} />
          </summary>
          <div className="project-detail">
            <p className="project-summary">{project.summary}</p>
            <dl className="project-facts">
              <div><dt>Role</dt><dd>{project.role.replace('TODO_CONTENT: ', '')}</dd></div>
              <div><dt>Scope</dt><dd>{project.scope.replace('TODO_CONTENT: ', '')}</dd></div>
            </dl>
            <div className="project-focus" aria-label="Focus areas">
              {project.focus.map(item => <span key={item}>{item}</span>)}
            </div>
            {project.confidentiality && <p className="confidentiality-note">{project.confidentiality}</p>}
          </div>
        </details>
      ))}
    </div>
  )
}
