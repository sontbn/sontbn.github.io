import type { Capability, ExperienceSignal } from '../types/portfolio'

export const capabilities: Capability[] = [
  {
    title: 'Systems engineering',
    description: 'Architecture, APIs, data models, and technical decisions that remain understandable as a system grows.',
    evidence: 'From problem framing to production readiness.',
  },
  {
    title: 'Complex delivery',
    description: 'Translating governance, operational, and business requirements into software teams can actually ship.',
    evidence: 'Public-sector and multi-stakeholder context.',
  },
  {
    title: 'Automation & AI',
    description: 'Practical workflow automation and AI integration designed around useful context, controls, and outcomes.',
    evidence: 'Human-in-the-loop by default.',
  },
  {
    title: 'Operational quality',
    description: 'Maintainability, reliability, performance, delivery practices, and the conditions that keep software useful.',
    evidence: 'Engineering beyond the feature launch.',
  },
]

export const experienceSignals: ExperienceSignal[] = [
  {
    period: '2016 — now',
    title: 'Independent software delivery',
    description: 'Freelance and consulting work across web applications, automation, integration, and technical problem-solving.',
  },
  {
    period: '2023 — now',
    title: 'Systems, strategy & governance',
    description: 'Work at the intersection of technical controls, business requirements, and public-platform delivery.',
  },
]

export const technologyGroups = [
  ['Build', 'Laravel / PHP', 'React', 'Angular', 'Node.js', 'Spring Boot', 'TypeScript / JavaScript', 'Python'],
  ['Systems', 'PostgreSQL', 'SQL', 'REST APIs', 'Domain modelling', 'System integration'],
  ['Operations', 'Docker', 'CI/CD', 'Performance', 'Data integrity', 'Risk management'],
  ['Automation', 'n8n', 'Workflow design', 'AI integration', 'Knowledge management'],
]
