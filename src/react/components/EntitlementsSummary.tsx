import { useEntitlements } from '../hooks/use-entitlements';

export interface EntitlementsSummaryProps {
  userId?: string;
  className?: string;
}

/** Plan + feature/limit summary, rendered from the resolved entitlement set. */
export function EntitlementsSummary({ userId, className }: EntitlementsSummaryProps) {
  const { plan, features, limits, isLoading, isError } = useEntitlements(userId);

  if (isError) {
    return (
      <p className="mon-entitlements__error" role="alert">
        Couldn’t load entitlements.
      </p>
    );
  }
  if (isLoading) {
    return <p className="mon-entitlements__loading">Loading…</p>;
  }

  const featureKeys = Object.keys(features);
  const limitKeys = Object.keys(limits);

  return (
    <section className={className ?? 'mon-entitlements'} data-testid="mon-entitlements">
      <p className="mon-entitlements__plan">{plan?.name ?? 'No plan'}</p>

      {featureKeys.length > 0 && (
        <ul className="mon-entitlements__features">
          {featureKeys.map((key) => (
            <li key={key} data-enabled={features[key]}>
              {key}: {features[key] ? 'on' : 'off'}
            </li>
          ))}
        </ul>
      )}

      {limitKeys.length > 0 && (
        <dl className="mon-entitlements__limits">
          {limitKeys.map((key) => (
            <div key={key}>
              <dt>{key}</dt>
              <dd>{limits[key]?.toLocaleString()}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
