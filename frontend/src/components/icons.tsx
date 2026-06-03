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
};
