import { describe, expect, it } from 'vitest';

import { CircuitBreaker } from './circuit-breaker';

const config = { errorThresholdPercent: 50, openMs: 1000, volumeThreshold: 4 };

describe('CircuitBreaker', () => {
  it('stays closed below the volume threshold', () => {
    const cb = new CircuitBreaker(config);
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getState()).toBe('closed');
    expect(cb.canPass()).toBe(true);
  });

  it('trips open once failure rate exceeds threshold within the window', () => {
    const cb = new CircuitBreaker(config);
    cb.recordFailure();
    cb.recordFailure();
    cb.recordSuccess();
    cb.recordFailure(); // 3/4 = 75% >= 50%
    expect(cb.getState()).toBe('open');
    expect(cb.canPass()).toBe(false);
  });

  it('moves to half-open after openMs and closes on a successful trial', () => {
    let clock = 0;
    const cb = new CircuitBreaker(config, () => clock);
    for (let i = 0; i < 4; i++) cb.recordFailure();
    expect(cb.getState()).toBe('open');

    clock = 999;
    expect(cb.canPass()).toBe(false);

    clock = 1000;
    expect(cb.canPass()).toBe(true);
    expect(cb.getState()).toBe('half-open');

    cb.recordSuccess();
    expect(cb.getState()).toBe('closed');
  });

  it('re-opens when the half-open trial fails', () => {
    let clock = 0;
    const cb = new CircuitBreaker(config, () => clock);
    for (let i = 0; i < 4; i++) cb.recordFailure();
    clock = 1000;
    cb.canPass(); // → half-open
    cb.recordFailure();
    expect(cb.getState()).toBe('open');
  });
});
