import { titleCase } from '../utils';

const TONES = ['forest', 'rust', 'gold', 'ink', 'clay', 'moss'];

export default function ProductVisual({ product, compact = false }) {
  const id = Number(product?.id) || 0;
  const tone = TONES[id % TONES.length];
  const initials = String(product?.name || 'MS')
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

  return (
    <div
      className={`product-visual visual-${tone} ${compact ? 'is-compact' : ''}`}
      aria-label={`${product?.name || 'Product'} illustration`}
      role="img"
    >
      <span className="visual-orbit visual-orbit-one" />
      <span className="visual-orbit visual-orbit-two" />
      <span className="visual-monogram">{initials}</span>
      {!compact && (
        <span className="visual-caption">
          {titleCase(product?.category || 'MicroShop')}
        </span>
      )}
    </div>
  );
}

