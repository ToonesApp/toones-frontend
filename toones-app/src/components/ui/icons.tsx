import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Icon({ size = 18, className, children, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      className={className ? `ui-icon ${className}` : 'ui-icon'}
      style={{ width: size, height: size }}
      {...rest}
    >
      {children}
    </svg>
  )
}

export const MicIcon = (p: IconProps) => (
  <Icon size={22} {...p}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
  </Icon>
)

export const PlayIcon = (p: IconProps) => (
  <Icon size={16} {...p}>
    <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />
  </Icon>
)

export const PauseIcon = (p: IconProps) => (
  <Icon size={16} {...p}>
    <rect x="6" y="5" width="4" height="14" rx="1.5" fill="currentColor" stroke="none" />
    <rect x="14" y="5" width="4" height="14" rx="1.5" fill="currentColor" stroke="none" />
  </Icon>
)

export const PlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
)

export const MinusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 12h14" />
  </Icon>
)

export const SearchIcon = (p: IconProps) => (
  <Icon size={14} strokeWidth={2.2} {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4 4" />
  </Icon>
)

export const LocateIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
  </Icon>
)

export const GlobeIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.5 2.6 2.5 14.4 0 17M12 3.5c-2.5 2.6-2.5 14.4 0 17" />
  </Icon>
)

export const LayersIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 4l8.5 4.5L12 13 3.5 8.5z" />
    <path d="M3.5 12.5L12 17l8.5-4.5M3.5 16.3L12 20.8l8.5-4.5" />
  </Icon>
)

export const PanelIcon = (p: IconProps) => (
  <Icon size={14} {...p}>
    <rect x="3" y="4" width="18" height="16" rx="4" />
    <path d="M9 4v16" />
  </Icon>
)

export const EyeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
)

export const HeartIcon = ({ filled, ...p }: IconProps & { filled?: boolean }) => (
  <Icon {...p}>
    <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20z" fill={filled ? 'currentColor' : 'none'} />
  </Icon>
)

export const CommentIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 18.5V6.8A2.3 2.3 0 0 1 7.3 4.5h9.4A2.3 2.3 0 0 1 19 6.8v6.4a2.3 2.3 0 0 1-2.3 2.3H9z" />
  </Icon>
)

export const ShareIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 15V4M8 8l4-4 4 4M5 13v4.5A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5V13" />
  </Icon>
)

export const PinIcon = (p: IconProps) => (
  <Icon size={14} {...p}>
    <path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z" />
    <circle cx="12" cy="10" r="2.3" />
  </Icon>
)

export const ExpandIcon = (p: IconProps) => (
  <Icon size={16} {...p}>
    <path d="M14 4h6v6M10 20H4v-6M20 4l-6.5 6.5M4 20l6.5-6.5" />
  </Icon>
)

export const ChevronIcon = ({ dir = 'right', ...p }: IconProps & { dir?: 'left' | 'right' }) => (
  <Icon size={16} strokeWidth={2.2} {...p}>
    <path d={dir === 'right' ? 'M9.5 5.5L16 12l-6.5 6.5' : 'M14.5 5.5L8 12l6.5 6.5'} />
  </Icon>
)

export const BackIcon = (p: IconProps) => (
  <Icon size={16} {...p}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Icon>
)

export const CloseIcon = (p: IconProps) => (
  <Icon size={16} {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
)

export const PhotoIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="5" width="17" height="14" rx="3.5" />
    <circle cx="9" cy="10" r="1.8" />
    <path d="M20.5 15.5l-4.5-4.5-8 8" />
  </Icon>
)

export const PrevIcon = (p: IconProps) => (
  <Icon size={16} {...p}>
    <path d="M7 5.5v13" />
    <path d="M18 5.5v13L9 12z" fill="currentColor" />
  </Icon>
)

export const NextIcon = (p: IconProps) => (
  <Icon size={16} {...p}>
    <path d="M17 5.5v13" />
    <path d="M6 5.5v13l9-6.5z" fill="currentColor" />
  </Icon>
)

export const EyeOffIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 4l16 16M9.9 5.8A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.4M6.3 7.6A16.7 16.7 0 0 0 2.5 12S6 18.5 12 18.5a9 9 0 0 0 4.2-1" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </Icon>
)
