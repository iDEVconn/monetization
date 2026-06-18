import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Mock the external widget so we can assert how PlansWidget wires it.
vi.mock('@idevconn/isubscribe-widget-react', () => ({
  __esModule: true,
  SubscriptionWidget: (props: Record<string, unknown>) => (
    <div
      data-testid="sub-widget"
      data-api-key={props.apiKey as string}
      data-base-url={(props.apiBaseUrl as string) ?? ''}
    />
  ),
}));

import { BuyCreditsDialog, type CreditPack } from './BuyCreditsDialog';
import { PlansWidget } from './PlansWidget';

describe('PlansWidget', () => {
  it('maps tenantKey -> apiKey and forwards the base URL', () => {
    render(
      <PlansWidget tenantKey="tnt_123" apiBaseUrl="https://api.test/api/v1/public" />,
    );
    const widget = screen.getByTestId('sub-widget');
    expect(widget.getAttribute('data-api-key')).toBe('tnt_123');
    expect(widget.getAttribute('data-base-url')).toBe(
      'https://api.test/api/v1/public',
    );
  });
});

describe('BuyCreditsDialog', () => {
  const packs: CreditPack[] = [
    { id: 'p1', credits: 100, price: '$9.99' },
    { id: 'p2', credits: 500, price: '$39.99', label: 'Best value' },
  ];

  it('renders nothing when closed', () => {
    const { container } = render(
      <BuyCreditsDialog open={false} packs={packs} onCancel={() => {}} onBuy={() => {}} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('lists packs and reports the chosen one', () => {
    const onBuy = vi.fn();
    const onCancel = vi.fn();
    render(
      <BuyCreditsDialog open packs={packs} onCancel={onCancel} onBuy={onBuy} />,
    );

    expect(screen.getByText('100 credits')).toBeTruthy();
    expect(screen.getByText('Best value')).toBeTruthy();

    (screen.getByText('Best value') as HTMLElement).click();
    expect(onBuy).toHaveBeenCalledWith(packs[1]);

    (screen.getByText('Cancel') as HTMLElement).click();
    expect(onCancel).toHaveBeenCalled();
  });
});
