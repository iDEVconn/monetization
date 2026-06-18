import { useCreditWallet } from '../hooks/use-credit-wallet';

export interface CreditWalletCardProps {
  userId?: string;
  className?: string;
  /** Heading text. Default "Credits". */
  title?: string;
  /** Render-prop override for full control of the body. */
  children?: (state: ReturnType<typeof useCreditWallet>) => React.ReactNode;
}

/**
 * Balance + lifetime stats card. Reads useCreditWallet; styleable via `className`
 * and the `--mon-*` CSS variables. Pass `children` for a headless render.
 */
export function CreditWalletCard({
  userId,
  className,
  title = 'Credits',
  children,
}: CreditWalletCardProps) {
  const state = useCreditWallet({ userId });

  if (children) return <>{children(state)}</>;

  return (
    <section className={className ?? 'mon-card mon-credit-wallet-card'} aria-busy={state.isLoading}>
      <h3 className="mon-card__title">{title}</h3>
      {state.isError ? (
        <p className="mon-card__error" role="alert">
          Couldn’t load balance.
        </p>
      ) : (
        <>
          <p className="mon-card__balance" data-testid="mon-balance">
            {state.isLoading ? '—' : state.balance.toLocaleString()}
          </p>
          <dl className="mon-card__stats">
            <div>
              <dt>Lifetime earned</dt>
              <dd>{state.lifetimeEarned?.toLocaleString() ?? '—'}</dd>
            </div>
            <div>
              <dt>Lifetime spent</dt>
              <dd>{state.lifetimeSpent?.toLocaleString() ?? '—'}</dd>
            </div>
          </dl>
        </>
      )}
    </section>
  );
}
