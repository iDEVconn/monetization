import { useCallback, useState } from 'react';

import type { EstimateResult } from '@idevconn/monetization/core';

import { useMonetization } from '../context';

export interface CheckCreditsInput {
  durationMinutes?: number;
  quantity?: number;
}

export interface UseCreditGateResult {
  /**
   * UX pre-check before an AI action. Hits the estimate endpoint; returns true
   * if the balance is sufficient. On insufficient, sets `isBlocked` so the host
   * can render a gate/upsell. The authoritative reserve still happens server-side.
   */
  checkCredits: (operation: string, input?: CheckCreditsInput) => Promise<boolean>;
  isChecking: boolean;
  isBlocked: boolean;
  lastEstimate: EstimateResult | undefined;
  reset: () => void;
}

/** Headless credit gate: estimate-based pre-flight + blocked state. */
export function useCreditGate(userId?: string): UseCreditGateResult {
  const { client, userId: ctxUserId } = useMonetization();
  const id = userId ?? ctxUserId;

  const [isChecking, setIsChecking] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [lastEstimate, setLastEstimate] = useState<EstimateResult | undefined>(undefined);

  const checkCredits = useCallback(
    async (operation: string, input: CheckCreditsInput = {}): Promise<boolean> => {
      setIsChecking(true);
      try {
        const estimate = await client.estimate({
          userId: id,
          operation,
          durationMinutes: input.durationMinutes,
          quantity: input.quantity,
        });
        setLastEstimate(estimate);
        setIsBlocked(!estimate.sufficient);
        return estimate.sufficient;
      } finally {
        setIsChecking(false);
      }
    },
    [client, id],
  );

  const reset = useCallback(() => {
    setIsBlocked(false);
    setLastEstimate(undefined);
  }, []);

  return { checkCredits, isChecking, isBlocked, lastEstimate, reset };
}
