const proofPoints = [
  '9+ years in software delivery',
  'Public-sector & high-adoption systems',
  'Automation, AI integration & DevOps',
  'Freelance & remote collaboration',
]

export function ProofStrip() {
  return (
    <section className="proof-strip" aria-label="Professional highlights">
      {proofPoints.map(point => <p key={point}>{point}</p>)}
    </section>
  )
}
