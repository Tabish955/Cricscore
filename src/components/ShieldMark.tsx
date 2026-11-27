import type { ShieldSpec } from '@/lib/team-visuals'

/**
 * Trademark-safe two-tone shield for a configured franchise. Silhouette only;
 * no official artwork, no league marks. Short codes are generic abbreviations.
 */
export function ShieldMark({ shield, size, className = '' }: { shield: ShieldSpec; size: number; className?: string }) {
  const { shortCode, primary, secondary, text } = shield
  const clipId = `shield-clip-${shortCode.toLowerCase()}`
  const fontSize = shortCode.length <= 2 ? 15 : shortCode.length === 3 ? 11.5 : 8.5
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      style={{ width: size, height: size }}
    >
      <defs>
        <clipPath id={clipId}>
          <path d="M24 2 L42 10 V26 C42 37.6 34.4 44.6 24 46.5 C13.6 44.6 6 37.6 6 26 V10 Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect width="48" height="48" fill={primary} />
        <rect x="24" width="24" height="48" fill={secondary} />
        <rect y="33.5" width="48" height="14.5" fill={primary} opacity="0.35" />
      </g>
      <path d="M24 2 L42 10 V26 C42 37.6 34.4 44.6 24 46.5 C13.6 44.6 6 37.6 6 26 V10 Z" fill="none" stroke="rgba(0,0,0,0.28)" strokeWidth="1.6" />
      <text
        x="24"
        y="30.5"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="'Archivo Variable', ui-sans-serif, system-ui, sans-serif"
        fontWeight={800}
        fontSize={fontSize}
        letterSpacing="0.08em"
        fill={text}
      >
        {shortCode}
      </text>
    </svg>
  )
}
