import { createContext, useContext } from 'react';

import type { MonetizationClient } from '@idevconn/monetization/core';

export interface MonetizationContextValue {
  /** Read-only core client, authenticated with the short-lived user token. */
  client: MonetizationClient;
  /** The current user's id; hooks default to it so they can be arg-less. */
  userId: string;
}

export const MonetizationContext = createContext<MonetizationContextValue | null>(null);

/** Access the monetization context; throws if used outside MonetizationProvider. */
export function useMonetization(): MonetizationContextValue {
  const ctx = useContext(MonetizationContext);
  if (!ctx) {
    throw new Error('useMonetization must be used within a <MonetizationProvider>.');
  }
  return ctx;
}
