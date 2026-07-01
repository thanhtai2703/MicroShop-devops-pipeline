export default function QuantityControl({
  value,
  onDecrease,
  onIncrease,
  disabled,
  disableIncrease,
}) {
  return (
    <div className="quantity-control" aria-label="Quantity">
      <button
        type="button"
        onClick={onDecrease}
        disabled={disabled || value <= 1}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span>{value}</span>
      <button
        type="button"
        onClick={onIncrease}
        disabled={disabled || disableIncrease}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}

