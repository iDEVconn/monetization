/**
 * @idevconn/monetization/react
 *
 * React surface: one provider + read-only hooks over the SaaS wallet platform.
 * Writes (reserve/commit) happen server-side via /nest — the browser only reads
 * and runs UX pre-checks. react and @tanstack/react-query are peer dependencies.
 *
 * Styled drop-in components (PlansWidget, CreditWalletCard, CreditGateDialog,
 * …) compose external packages and land in a follow-up; these hooks are the
 * headless foundation they render.
 */

export { MonetizationProvider, type MonetizationProviderProps } from './provider';
export { MonetizationContext, useMonetization, type MonetizationContextValue } from './context';
export { monetizationKeys } from './query-keys';

export {
  useCreditWallet,
  type UseCreditWalletOptions,
  type UseCreditWalletResult,
} from './hooks/use-credit-wallet';
export {
  useRevenueWallet,
  type UseRevenueWalletOptions,
  type UseRevenueWalletResult,
} from './hooks/use-revenue-wallet';
export {
  useEntitlement,
  useEntitlements,
  type UseEntitlementsResult,
} from './hooks/use-entitlements';
export {
  useCreditGate,
  type CheckCreditsInput,
  type UseCreditGateResult,
} from './hooks/use-credit-gate';

export { CreditWalletCard, type CreditWalletCardProps } from './components/CreditWalletCard';
export { CreditLedgerList, type CreditLedgerListProps } from './components/CreditLedgerList';
export { RevenueWalletCard, type RevenueWalletCardProps } from './components/RevenueWalletCard';
export {
  EntitlementsSummary,
  type EntitlementsSummaryProps,
} from './components/EntitlementsSummary';
export { CreditGateDialog, type CreditGateDialogProps } from './components/CreditGateDialog';
export { PlansWidget, type PlansWidgetProps } from './components/PlansWidget';
export {
  BuyCreditsDialog,
  type BuyCreditsDialogProps,
  type CreditPack,
} from './components/BuyCreditsDialog';

// Re-export the core types consumers touch in component props.
export type {
  Balance,
  CreditLedgerEntry,
  Entitlements,
  EstimateResult,
  RevenueBalance,
  RevenueLedgerEntry,
} from '@idevconn/monetization/core';
