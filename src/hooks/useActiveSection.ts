import { useEffect, useState } from 'react'

export function useActiveSection(sectionIds: string[]) {
  const [activeSection, setActiveSection] = useState(sectionIds[0])

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.filter(entry => entry.isIntersecting)
        if (visible[0]) setActiveSection(visible[0].target.id)
      },
      { rootMargin: '-28% 0px -62% 0px', threshold: 0 },
    )

    sectionIds.forEach(id => {
      const section = document.getElementById(id)
      if (section) observer.observe(section)
    })

    return () => observer.disconnect()
  }, [sectionIds])

  return activeSection
}
