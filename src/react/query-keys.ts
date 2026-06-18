/** Query-key factory for the monetization React hooks (TanStack Query). */
export const monetizationKeys = {
  all: ['monetization'] as const,
  creditBalance: (userId: string) => [...monetizationKeys.all, 'credit-balance', userId] as const,
  creditLedger: (userId: string, limit: number, offset: number) =>
    [...monetizationKeys.all, 'credit-ledger', userId, limit, offset] as const,
  revenueBalance: (userId: string) =>
    [...monetizationKeys.all, 'revenue-balance', userId] as const,
  revenueLedger: (userId: string, limit: number, offset: number) =>
    [...monetizationKeys.all, 'revenue-ledger', userId, limit, offset] as const,
  entitlements: (userId: string) => [...monetizationKeys.all, 'entitlements', userId] as const,
};
