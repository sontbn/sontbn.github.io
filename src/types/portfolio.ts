export type Project = {
  id: string
  number: string
  title: string
  category: string
  summary: string
  role: string
  scope: string
  focus: string[]
  status: 'ready' | 'in-preparation'
  confidentiality?: string
}

export type Capability = {
  title: string
  description: string
  evidence: string
}

export type ExperienceSignal = {
  period: string
  title: string
  description: string
}

export type SocialLink = {
  label: string
  href: string
}
