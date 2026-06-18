import { useCreditWallet } from '../hooks/use-credit-wallet';

export interface CreditLedgerListProps {
  userId?: string;
  limit?: number;
  className?: string;
  /** Empty-state text. */
  emptyLabel?: string;
}

/** Recent credit transactions. Reads useCreditWallet's ledger page. */
export function CreditLedgerList({
  userId,
  limit = 20,
  className,
  emptyLabel = 'No transactions yet.',
}: CreditLedgerListProps) {
  const { ledger, isLoading, isError } = useCreditWallet({ userId, limit });

  if (isError) {
    return (
      <p className="mon-ledger__error" role="alert">
        Couldn’t load ledger.
      </p>
    );
  }
  if (isLoading) {
    return <p className="mon-ledger__loading">Loading…</p>;
  }
  if (ledger.length === 0) {
    return <p className="mon-ledger__empty">{emptyLabel}</p>;
  }

  return (
    <ul className={className ?? 'mon-ledger'} data-testid="mon-ledger">
      {ledger.map((entry) => (
        <li key={entry.id} className="mon-ledger__row">
          <span className="mon-ledger__kind">{entry.kind}</span>
          <span className="mon-ledger__amount">{entry.amount.toLocaleString()}</span>
          <span className="mon-ledger__balance">{entry.balanceAfter.toLocaleString()}</span>
          <time className="mon-ledger__date" dateTime={entry.createdAt}>
            {entry.createdAt}
          </time>
        </li>
      ))}
    </ul>
  );
}
