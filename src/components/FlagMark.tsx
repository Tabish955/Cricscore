/**
 * Feed-supplied country flag, rendered only when the API provides one.
 * There is no flag mapping anywhere in the app — absence renders nothing.
 */
export function FlagMark({ flagUrl, name, className = '' }: { flagUrl?: string | null; name: string; className?: string }) {
  if (!flagUrl) return null
  if (!/^https:\/\//i.test(flagUrl)) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny remote asset supplied by the feed; not in next/image config by design
    <img
      src={flagUrl}
      alt={`${name} flag`}
      width={17}
      height={12}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className={`inline-block h-[12px] w-[17px] shrink-0 rounded-[2px] object-cover ring-1 ring-black/10 ${className}`}
    />
  )
}
