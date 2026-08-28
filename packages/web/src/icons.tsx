type IconProps = { className?: string };

export function DieIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <circle cx="8.5" cy="8.5" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="8.5" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="15.5" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="15.5" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function DiceTrayIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <rect x="3" y="10.5" width="8" height="8" rx="2" transform="rotate(-8 7 14.5)" />
      <rect x="13" y="9.5" width="8" height="8" rx="2" transform="rotate(10 17 13.5)" />
      <circle cx="6.7" cy="14.3" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="17.3" cy="13.7" r="0.9" fill="currentColor" stroke="none" />
      <path d="M6 6.5 12 3l6 3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function InvestigatorIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.2-4 4-6 7.5-6s6.3 2 7.5 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ScrollIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path d="M6 4h11a2 2 0 0 1 2 2v13a1.5 1.5 0 0 1-1.5 1.5H8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 8h6M9 11.5h6M9 15h3" strokeLinecap="round" />
    </svg>
  );
}

export function TableIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <ellipse cx="12" cy="8.5" rx="8" ry="3.5" />
      <path d="M4 8.5V15c0 1.9 3.6 3.5 8 3.5s8-1.6 8-3.5V8.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="8" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="9" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SkullIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
      <path
        d="M12 3c-4.4 0-7.5 3.2-7.5 7.2 0 2.6 1.3 4.4 2.7 5.6V19c0 .6.4 1 1 1h1.3v-1.8h1v1.8h2v-1.8h1v1.8h1.3c.6 0 1-.4 1-1v-3.2c1.4-1.2 2.7-3 2.7-5.6C19.5 6.2 16.4 3 12 3Z"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="10.5" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10.5" r="1.6" fill="currentColor" stroke="none" />
      <path d="M11 13.2h2l-1 1.6-1-1.6Z" fill="currentColor" stroke="none" />
    </svg>
  );
}
