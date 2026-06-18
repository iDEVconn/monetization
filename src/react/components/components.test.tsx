import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { makeWrapper } from '../test-utils';
import { CreditGateDialog } from './CreditGateDialog';
import { CreditWalletCard } from './CreditWalletCard';
import { EntitlementsSummary } from './EntitlementsSummary';
import { RevenueWalletCard } from './RevenueWalletCard';

describe('CreditWalletCard', () => {
  it('renders the balance once loaded', async () => {
    const client = {
      getBalance: vi.fn().mockResolvedValue({ userId: 'u1', balance: 1234, lifetimeEarned: 5000 }),
      getCreditLedger: vi.fn().mockResolvedValue({ total: 0, entries: [] }),
    };
    render(<CreditWalletCard />, { wrapper: makeWrapper(client) });

    await waitFor(() =>
      expect(screen.getByTestId('mon-balance').textContent).toContain('1,234'),
    );
  });
});

describe('RevenueWalletCard', () => {
  it('renders the available balance', async () => {
    const client = {
      getRevenueBalance: vi.fn().mockResolvedValue({
        userId: 'u1',
        balance: 900,
        pendingPayout: 100,
        lifetimeEarned: 2000,
        lifetimePaid: 1000,
      }),
      getRevenueLedger: vi.fn().mockResolvedValue({ total: 0, entries: [] }),
    };
    render(<RevenueWalletCard />, { wrapper: makeWrapper(client) });

    await waitFor(() =>
      expect(screen.getByTestId('mon-revenue-balance').textContent).toContain('900'),
    );
  });
});

describe('EntitlementsSummary', () => {
  it('renders plan name and feature flags', async () => {
    const client = {
      getEntitlements: vi.fn().mockResolvedValue({
        plan: { code: 'pro', name: 'Pro' },
        features: { sell_audio: true },
        limits: { storageGb: 50 },
      }),
    };
    render(<EntitlementsSummary />, { wrapper: makeWrapper(client) });

    await waitFor(() => expect(screen.getByText('Pro')).toBeTruthy());
    expect(screen.getByText(/sell_audio: on/)).toBeTruthy();
  });
});

describe('CreditGateDialog', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<CreditGateDialog open={false} onCancel={() => undefined} />);
    expect(container.innerHTML).toBe('');
  });

  it('shows the shortfall and fires action handlers', () => {
    const onCancel = vi.fn();
    const onBuyCredits = vi.fn();
    render(
      <CreditGateDialog
        open
        estimate={{ requiredCredits: 200, balance: 30, sufficient: false }}
        onCancel={onCancel}
        onBuyCredits={onBuyCredits}
      />,
    );

    expect(screen.getByTestId('mon-gate-dialog')).toBeTruthy();
    expect(screen.getByText(/Short by 170/)).toBeTruthy();

    (screen.getByText('Buy credits') as HTMLButtonElement).click();
    expect(onBuyCredits).toHaveBeenCalled();
    (screen.getByText('Cancel') as HTMLButtonElement).click();
    expect(onCancel).toHaveBeenCalled();
  });
});
