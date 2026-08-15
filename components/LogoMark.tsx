export function LogoMark({ size = 30, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect x="1.5" y="1.5" width="29" height="29" rx="9.5" fill="var(--brand)" />
      <circle cx="9.5" cy="9.5" r="2" stroke="var(--ink)" strokeWidth="1.4" />
      <path
        d="M10 17.2l4.2 4.2L23 12"
        stroke="var(--ink)"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
