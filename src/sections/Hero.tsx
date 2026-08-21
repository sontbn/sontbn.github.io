import { ArrowDown, Download } from 'lucide-react'
import { ArrowLink } from '../components/ui/ArrowLink'
import { profile } from '../data/profile'

export function Hero() {
  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      <div className="hero-meta">
        <p>Independent systems practice</p>
        <p>{profile.location} <span aria-hidden="true">·</span> UTC+7</p>
      </div>
      <div className="hero-content">
        <p className="eyebrow">{profile.title}</p>
        <h1 id="hero-title">{profile.statement}</h1>
        <div className="hero-bottom">
          <p>{profile.summary}</p>
          <div className="hero-actions">
            <ArrowLink href="#work">Explore selected work</ArrowLink>
            <a className="quiet-link" href={profile.resumeUrl} download><Download aria-hidden="true" size={15} /> Résumé</a>
          </div>
        </div>
      </div>
      <a className="scroll-cue" href="#work"><span>Scroll to explore</span><ArrowDown aria-hidden="true" size={16} /></a>
    </section>
  )
}
