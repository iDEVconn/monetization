import {
  SubscriptionWidget,
  type Subscription,
  type SubscriptionWidgetProps,
} from '@idevconn/isubscribe-widget-react';
import type { CSSProperties } from 'react';

export interface PlansWidgetProps {
  /** Tenant's publishable key — the widget reads the plan catalog with it. */
  tenantKey: string;
  /** SaaS base URL for the public subscriptions API. */
  apiBaseUrl?: string;
  /**
   * Brand theme: `--isw-*` CSS variables merged onto the widget root, the same
   * token-bridge contract the host app uses. e.g. `{ '--isw-accent': '#FF5733' }`.
   */
  theme?: CSSProperties & Record<`--${string}`, string>;
  /** Fires when a plan is chosen — wire to your subscribe/checkout flow. */
  onSubscribe?: (subscription: Subscription) => void;
  /** Escape hatch for any other SubscriptionWidget prop. */
  widgetProps?: Omit<
    SubscriptionWidgetProps,
    'apiKey' | 'apiBaseUrl' | 'style' | 'onSubscribe'
  >;
}

/**
 * Drop-in plan selector. Wraps `@idevconn/isubscribe-widget-react`'s
 * SubscriptionWidget with the token bridge + a subscribe handler, so a host
 * mounts a styled plan catalog with one component. The widget owns its own data
 * fetching (via `tenantKey`); the SDK only standardizes theming + the callback.
 */
export function PlansWidget({
  tenantKey,
  apiBaseUrl,
  theme,
  onSubscribe,
  widgetProps,
}: PlansWidgetProps) {
  return (
    <SubscriptionWidget
      {...widgetProps}
      apiKey={tenantKey}
      apiBaseUrl={apiBaseUrl}
      style={theme}
      onSubscribe={onSubscribe}
    />
  );
}
