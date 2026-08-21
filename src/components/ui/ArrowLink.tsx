import { ArrowUpRight } from 'lucide-react'

type ArrowLinkProps = {
  href: string
  children: React.ReactNode
  external?: boolean
  className?: string
}

export function ArrowLink({ href, children, external = false, className = '' }: ArrowLinkProps) {
  return (
    <a className={`arrow-link ${className}`} href={href} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}>
      <span>{children}</span>
      <ArrowUpRight aria-hidden="true" size={16} strokeWidth={1.8} />
    </a>
  )
}
