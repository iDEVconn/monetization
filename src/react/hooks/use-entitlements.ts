import { useQuery } from '@tanstack/react-query';

import type { Entitlements } from '@idevconn/monetization/core';

import { useMonetization } from '../context';
import { monetizationKeys } from '../query-keys';

export interface UseEntitlementsResult {
  entitlements: Entitlements | undefined;
  plan: Entitlements['plan'];
  features: Record<string, boolean>;
  limits: Record<string, number>;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/** Resolved entitlement set for a user (plan, features, limits, credits). */
export function useEntitlements(userId?: string): UseEntitlementsResult {
  const { client, userId: ctxUserId } = useMonetization();
  const id = userId ?? ctxUserId;

  const query = useQuery({
    queryKey: monetizationKeys.entitlements(id),
    queryFn: () => client.getEntitlements(id),
  });

  const entitlements = query.data ?? undefined;
  return {
    entitlements,
    plan: entitlements?.plan,
    features: entitlements?.features ?? {},
    limits: entitlements?.limits ?? {},
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: () => void query.refetch(),
  };
}

/** Boolean feature gate. Returns false until entitlements have loaded. */
export function useEntitlement(feature: string, userId?: string): boolean {
  const { features } = useEntitlements(userId);
  return features[feature] === true;
}
