import { useQuery } from '@tanstack/react-query';

import type { RevenueLedgerEntry } from '@idevconn/monetization/core';

import { useMonetization } from '../context';
import { monetizationKeys } from '../query-keys';

export interface UseRevenueWalletOptions {
  userId?: string;
  limit?: number;
  offset?: number;
}

export interface UseRevenueWalletResult {
  balance: number;
  pendingPayout: number;
  lifetimeEarned: number;
  lifetimePaid: number;
  ledger: RevenueLedgerEntry[];
  total: number;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/** Read-only seller revenue wallet: balance, pending payout, lifetime stats, ledger. */
export function useRevenueWallet(options: UseRevenueWalletOptions = {}): UseRevenueWalletResult {
  const { client, userId: ctxUserId } = useMonetization();
  const userId = options.userId ?? ctxUserId;
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;

  const balanceQuery = useQuery({
    queryKey: monetizationKeys.revenueBalance(userId),
    queryFn: () => client.getRevenueBalance(userId),
  });

  const ledgerQuery = useQuery({
    queryKey: monetizationKeys.revenueLedger(userId, limit, offset),
    queryFn: () => client.getRevenueLedger(userId, { limit, offset }),
  });

  return {
    balance: balanceQuery.data?.balance ?? 0,
    pendingPayout: balanceQuery.data?.pendingPayout ?? 0,
    lifetimeEarned: balanceQuery.data?.lifetimeEarned ?? 0,
    lifetimePaid: balanceQuery.data?.lifetimePaid ?? 0,
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
