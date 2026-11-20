import { brand } from '@/config/brand'

/** Logo + product name. Change the logo file/name in brand.config.json. */
export default function BrandMark({ size = 32, showName = true }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <img src={brand.logo.mark} alt="" width={size} height={size} className="rounded-lg" />
      {showName && <span className="font-display text-lg font-semibold tracking-tight">{brand.name}</span>}
    </span>
  )
}
