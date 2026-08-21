import { ArrowLink } from '../components/ui/ArrowLink'
import { SectionLabel } from '../components/ui/SectionLabel'
import { profile, socialLinks } from '../data/profile'

export function Contact() {
  return (
    <section className="contact-section" id="contact" aria-labelledby="contact-title">
      <SectionLabel index="05">Start a conversation</SectionLabel>
      <div className="contact-grid">
        <div><h2 id="contact-title">Have a complex problem worth making simpler?</h2><p>{profile.availability}. I am open to thoughtful product, systems, and automation work.</p></div>
        <div className="contact-actions">
          <ArrowLink href={`mailto:${profile.email}`} className="contact-email">{profile.email}</ArrowLink>
          <div className="social-links">
            {socialLinks.map(link => <ArrowLink key={link.label} href={link.href} external>{link.label}</ArrowLink>)}
          </div>
        </div>
      </div>
    </section>
  )
}
