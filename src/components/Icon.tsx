import type { ReactNode, SVGProps } from 'react'

const shapes = {
  box: (
    <>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="M3 8v9l9 5 9-5V8M12 13v9M7.5 5.5l9 5" />
    </>
  ),
  home: (
    <>
      <path d="m3 10 9-7 9 7v10H3V10Z" />
      <path d="M9 20v-7h6v7" />
    </>
  ),
  camera: (
    <>
      <path d="M3 7h4l2-3h6l2 3h4v13H3V7Z" />
      <circle cx="12" cy="13" r="4" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m3 17 5-5 4 4 3-3 6 6" />
    </>
  ),
  swap: <path d="m17 3 4 4-4 4M21 7H8M7 21l-4-4 4-4M3 17h13" />,
  ruler: (
    <>
      <path d="m3 17 14-14 4 4L7 21l-4-4Z" />
      <path d="m7 13 2 2m1-5 2 2m1-5 2 2" />
    </>
  ),
  tag: (
    <>
      <path d="M3 12V4h8l10 10-8 8L3 12Z" />
      <circle cx="7.5" cy="8.5" r="1.2" />
    </>
  ),
  crosshair: (
    <>
      <circle cx="12" cy="12" r="6" />
      <path d="M12 2v6M12 16v6M2 12h6M16 12h6" />
    </>
  ),
  undo: <path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />,
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  wifi: (
    <>
      <path d="M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8.5 16a6 6 0 0 1 7 0" />
      <circle cx="12" cy="20" r="0.8" fill="currentColor" stroke="none" />
    </>
  ),
  wifiOff: (
    <>
      <path d="m3 3 18 18M2 8a16 16 0 0 1 5-2M11 4.5A16 16 0 0 1 22 8M5 12a11 11 0 0 1 6-2M16 10.5a11 11 0 0 1 3 1.5M8.5 16a6 6 0 0 1 7 0" />
      <circle cx="12" cy="20" r="0.8" fill="currentColor" stroke="none" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7h.01" />
    </>
  ),
  alert: (
    <>
      <path d="m12 3 10 18H2L12 3Z" />
      <path d="M12 9v5M12 17h.01" />
    </>
  ),
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  download: (
    <>
      <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />
    </>
  ),
  shield: (
    <>
      <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </>
  ),
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof shapes

type IconProps = SVGProps<SVGSVGElement> & { name: IconName }

export function Icon({ name, ...props }: IconProps) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {shapes[name]}
    </svg>
  )
}
