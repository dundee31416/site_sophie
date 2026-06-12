interface IconProps {
  size?: number;
}

export const Icon = {
  search: ({ size = 20 }: IconProps) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="16.5" y1="16.5" x2="21" y2="21" />
    </svg>
  ),
  arrowL: ({ size = 28 }: IconProps) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 5 8 12 15 19" />
    </svg>
  ),
  arrowR: ({ size = 28 }: IconProps) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 5 16 12 9 19" />
    </svg>
  ),
  back: ({ size = 22 }: IconProps) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="14 6 8 12 14 18" />
    </svg>
  ),
  close: ({ size = 22 }: IconProps) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  ),
  book: ({ size = 20 }: IconProps) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 5.5C3 5 3.4 4.5 4 4.5h6c1.1 0 2 .9 2 2v13c0-1.1-.9-2-2-2H4c-.6 0-1-.4-1-1V5.5Z" />
      <path d="M21 5.5c0-.5-.4-1-1-1h-6c-1.1 0-2 .9-2 2v13c0-1.1.9-2 2-2h6c.6 0 1-.4 1-1V5.5Z" />
    </svg>
  ),
  scan: ({ size = 20 }: IconProps) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 8h5M8 12h8M8 16h6" />
    </svg>
  ),
  grid: ({ size = 20 }: IconProps) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  ),
  comic: ({ size = 20 }: IconProps) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5.5C4 4.7 4.7 4 5.5 4h8c.8 0 1.5.7 1.5 1.5v5c0 .8-.7 1.5-1.5 1.5H9l-3 3v-3H5.5C4.7 11.5 4 10.8 4 10V5.5Z" />
      <path d="M16 9.5h2.5c.8 0 1.5.7 1.5 1.5v5c0 .8-.7 1.5-1.5 1.5H18v3l-3-3h-2.5c-.4 0-.8-.2-1.1-.4" />
    </svg>
  ),
  art: ({ size = 20 }: IconProps) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a9 9 0 0 0 0 18c1.1 0 1.8-.9 1.8-1.9 0-.5-.2-1-.5-1.3-.3-.3-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8H16a5 5 0 0 0 5-5c0-3.9-4-7-9-7Z" />
      <circle cx="7.5" cy="11.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="11" cy="7.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="8.5" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  ),
  craft: ({ size = 20 }: IconProps) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="2.4" />
      <circle cx="6" cy="18" r="2.4" />
      <path d="M8 7.7 19 17M8 16.3 19 7" />
      <path d="M14.5 11.2 19 7l-.2 3.2M14.5 12.8 19 17l-.2-3.2" />
    </svg>
  ),
};
