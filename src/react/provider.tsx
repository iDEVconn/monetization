import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { type ReactNode, useMemo } from 'react';

import { createMonetizationCore } from '@idevconn/monetization/core';

import { MonetizationContext, type MonetizationContextValue } from './context';

export interface MonetizationProviderProps {
  children: ReactNode;
  /** SaaS API base URL, e.g. https://api.isubscribe.me/api/v1. */
  baseUrl: string;
  /** Current user id; hooks default to it. */
  userId: string;
  /**
   * Returns a short-lived, read-only user token. Keeps secrets out of the bundle
   * — all writes still go through the customer backend, never the browser.
   */
  getUserToken: () => string | Promise<string>;
  /** Reuse the app's QueryClient. If omitted, the provider creates its own. */
  queryClient?: QueryClient;
}

/**
 * Root provider for the React monetization surface. Builds a read-only /core
 * client (bearer-authenticated via getUserToken) and exposes it, plus the
 * current userId, through context. Wraps children in a QueryClientProvider —
 * sharing the app's client when one is passed.
 */
export function MonetizationProvider({
  children,
  baseUrl,
  userId,
  getUserToken,
  queryClient,
}: MonetizationProviderProps) {
  const value = useMemo<MonetizationContextValue>(() => {
    const { client } = createMonetizationCore({ baseUrl, getUserToken });
    return { client, userId };
  }, [baseUrl, userId, getUserToken]);

  const client = useMemo(() => queryClient ?? new QueryClient(), [queryClient]);

  return (
    <QueryClientProvider client={client}>
      <MonetizationContext.Provider value={value}>{children}</MonetizationContext.Provider>
    </QueryClientProvider>
  );
}
