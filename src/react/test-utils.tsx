import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import type { MonetizationClient } from '@idevconn/monetization/core';

import { MonetizationContext } from './context';

/** Wrap a hook under test with a fresh QueryClient and a stub core client. */
export function makeWrapper(client: Partial<MonetizationClient>, userId = 'u1') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MonetizationContext.Provider
          value={{ client: client as MonetizationClient, userId }}
        >
          {children}
        </MonetizationContext.Provider>
      </QueryClientProvider>
    );
  };
}
