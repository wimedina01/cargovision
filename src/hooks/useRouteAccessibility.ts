import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { appConfig } from '../config/appConfig'

export function useRouteAccessibility() {
  const { pathname } = useLocation()

  useEffect(() => {
    const heading = document.querySelector<HTMLHeadingElement>('main h1')
    if (heading) {
      document.title = `${heading.textContent} | ${appConfig.name}`
      heading.focus({ preventScroll: true })
    }
    window.scrollTo(0, 0)
  }, [pathname])
}
