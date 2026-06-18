import type { EstimateResult } from '@idevconn/monetization/core';

export interface CreditGateDialogProps {
  open: boolean;
  /** The estimate that triggered the gate (from useCreditGate.lastEstimate). */
  estimate?: EstimateResult;
  onCancel: () => void;
  /** Shown only when provided — wire to a buy-credits flow. */
  onBuyCredits?: () => void;
  /** Shown only when provided — wire to a plan-upgrade flow. */
  onUpgrade?: () => void;
  className?: string;
  title?: string;
  message?: string;
}

/**
 * Controlled "insufficient credits" dialog. Presentational only — pair with
 * useCreditGate: render with `open={gate.isBlocked}`, `estimate={gate.lastEstimate}`,
 * `onCancel={gate.reset}`. Renders nothing when closed.
 */
export function CreditGateDialog({
  open,
  estimate,
  onCancel,
  onBuyCredits,
  onUpgrade,
  className,
  title = 'Not enough credits',
  message,
}: CreditGateDialogProps) {
  if (!open) return null;

  const shortfall =
    estimate !== undefined ? Math.max(estimate.requiredCredits - estimate.balance, 0) : undefined;

  return (
    <div
      className={className ?? 'mon-gate-dialog'}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      data-testid="mon-gate-dialog"
    >
      <div className="mon-gate-dialog__panel">
        <h3 className="mon-gate-dialog__title">{title}</h3>
        <p className="mon-gate-dialog__message">
          {message ??
            (estimate
              ? `This action needs ${estimate.requiredCredits.toLocaleString()} credits; you have ${estimate.balance.toLocaleString()}.`
              : 'You don’t have enough credits for this action.')}
        </p>
        {shortfall !== undefined && shortfall > 0 && (
          <p className="mon-gate-dialog__shortfall">Short by {shortfall.toLocaleString()}.</p>
        )}
        <div className="mon-gate-dialog__actions">
          <button type="button" className="mon-gate-dialog__cancel" onClick={onCancel}>
            Cancel
          </button>
          {onBuyCredits && (
            <button type="button" className="mon-gate-dialog__buy" onClick={onBuyCredits}>
              Buy credits
            </button>
          )}
          {onUpgrade && (
            <button type="button" className="mon-gate-dialog__upgrade" onClick={onUpgrade}>
              Upgrade plan
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
