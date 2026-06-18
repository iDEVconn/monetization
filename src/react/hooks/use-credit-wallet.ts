import { useQuery } from '@tanstack/react-query';

import type { CreditLedgerEntry } from '@idevconn/monetization/core';

import { useMonetization } from '../context';
import { monetizationKeys } from '../query-keys';

export interface UseCreditWalletOptions {
  userId?: string;
  limit?: number;
  offset?: number;
}

export interface UseCreditWalletResult {
  balance: number;
  lifetimeEarned?: number;
  lifetimeSpent?: number;
  ledger: CreditLedgerEntry[];
  total: number;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/** Read-only credit wallet: balance + lifetime stats + paginated ledger. */
export function useCreditWallet(options: UseCreditWalletOptions = {}): UseCreditWalletResult {
  const { client, userId: ctxUserId } = useMonetization();
  const userId = options.userId ?? ctxUserId;
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;

  const balanceQuery = useQuery({
    queryKey: monetizationKeys.creditBalance(userId),
    queryFn: () => client.getBalance(userId),
  });

  const ledgerQuery = useQuery({
    queryKey: monetizationKeys.creditLedger(userId, limit, offset),
    queryFn: () => client.getCreditLedger(userId, { limit, offset }),
  });

  return {
    balance: balanceQuery.data?.balance ?? 0,
    lifetimeEarned: balanceQuery.data?.lifetimeEarned,
    lifetimeSpent: balanceQuery.data?.lifetimeSpent,
    ledger: ledgerQuery.data?.entries ?? [],
    total: ledgerQuery.data?.total ?? 0,
    isLoading: balanceQuery.isLoading || ledgerQuery.isLoading,
    isError: balanceQuery.isError || ledgerQuery.isError,
    refetch: () => {
      void balanceQuery.refetch();
      void ledgerQuery.refetch();
    },
  };
}
