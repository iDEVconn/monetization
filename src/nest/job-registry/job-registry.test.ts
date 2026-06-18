import { describe, expect, it } from 'vitest';

import { InMemoryJobRegistry } from './job-registry';

describe('InMemoryJobRegistry', () => {
  it('returns the mapped reservation and removes it (once-only)', async () => {
    const reg = new InMemoryJobRegistry(1000);
    await reg.set('job-1', 'res-1');

    expect(await reg.take('job-1')).toBe('res-1');
    expect(await reg.take('job-1')).toBeUndefined();
  });

  it('returns undefined for an expired mapping', async () => {
    let clock = 0;
    const reg = new InMemoryJobRegistry(1000, () => clock);
    await reg.set('job-1', 'res-1');
    clock = 1000;
    expect(await reg.take('job-1')).toBeUndefined();
  });

  it('returns undefined for an unknown job', async () => {
    const reg = new InMemoryJobRegistry(1000);
    expect(await reg.take('nope')).toBeUndefined();
  });
});
