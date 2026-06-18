import { useRevenueWallet } from '../hooks/use-revenue-wallet';

export interface RevenueWalletCardProps {
  userId?: string;
  className?: string;
  title?: string;
  children?: (state: ReturnType<typeof useRevenueWallet>) => React.ReactNode;
}

/** Seller revenue card: available balance, pending payout, lifetime stats. */
export function RevenueWalletCard({
  userId,
  className,
  title = 'Revenue',
  children,
}: RevenueWalletCardProps) {
  const state = useRevenueWallet({ userId });

  if (children) return <>{children(state)}</>;

  return (
    <section className={className ?? 'mon-card mon-revenue-wallet-card'} aria-busy={state.isLoading}>
      <h3 className="mon-card__title">{title}</h3>
      {state.isError ? (
        <p className="mon-card__error" role="alert">
          Couldn’t load revenue.
        </p>
      ) : (
        <dl className="mon-card__stats">
          <div>
            <dt>Available</dt>
            <dd data-testid="mon-revenue-balance">
              {state.isLoading ? '—' : state.balance.toLocaleString()}
            </dd>
          </div>
          <div>
            <dt>Pending payout</dt>
            <dd>{state.pendingPayout.toLocaleString()}</dd>
          </div>
          <div>
            <dt>Lifetime earned</dt>
            <dd>{state.lifetimeEarned.toLocaleString()}</dd>
          </div>
          <div>
            <dt>Lifetime paid</dt>
            <dd>{state.lifetimePaid.toLocaleString()}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}
