export interface CreditPack {
  /** Stable id passed back to onBuy. */
  id: string;
  /** Credits granted by this pack. */
  credits: number;
  /** Display price, pre-formatted (e.g. "$9.99"). */
  price: string;
  /** Optional label override; defaults to "{credits} credits". */
  label?: string;
}

export interface BuyCreditsDialogProps {
  open: boolean;
  packs: CreditPack[];
  onCancel: () => void;
  /** Fires with the chosen pack — wire to your checkout/PayPal flow. */
  onBuy: (pack: CreditPack) => void;
  className?: string;
  title?: string;
}

/**
 * Controlled credit-pack purchase dialog. Presentational only — the actual
 * purchase (PayPal/checkout) runs through the host's backend; this just renders
 * the packs and reports the choice. Renders nothing when closed.
 */
export function BuyCreditsDialog({
  open,
  packs,
  onCancel,
  onBuy,
  className,
  title = 'Buy credits',
}: BuyCreditsDialogProps) {
  if (!open) return null;

  return (
    <div
      className={className ?? 'mon-buy-credits-dialog'}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      data-testid="mon-buy-credits-dialog"
    >
      <div className="mon-buy-credits-dialog__panel">
        <h3 className="mon-buy-credits-dialog__title">{title}</h3>
        <ul className="mon-buy-credits-dialog__packs">
          {packs.map((pack) => (
            <li key={pack.id}>
              <button
                type="button"
                className="mon-buy-credits-dialog__pack"
                onClick={() => onBuy(pack)}
              >
                <span className="mon-buy-credits-dialog__pack-label">
                  {pack.label ?? `${pack.credits.toLocaleString()} credits`}
                </span>
                <span className="mon-buy-credits-dialog__pack-price">
                  {pack.price}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="mon-buy-credits-dialog__cancel"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
