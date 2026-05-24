import { describe, expect, it, vi } from 'vitest';
import { emitProgress, subscribeProgress } from './progress-emitter';

describe('progress emitter', () => {
  it('delivers events only to subscribers of the matching runId', () => {
    const onA = vi.fn();
    const onB = vi.fn();
    subscribeProgress('run-A', onA);
    subscribeProgress('run-B', onB);

    emitProgress('run-A', { stage: 'deterministic' });
    emitProgress('run-B', { stage: 'aggregating' });

    expect(onA).toHaveBeenCalledExactlyOnceWith({ stage: 'deterministic' });
    expect(onB).toHaveBeenCalledExactlyOnceWith({ stage: 'aggregating' });
  });

  it('returns an unsubscribe that stops further delivery', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeProgress('run-x', listener);
    emitProgress('run-x', { stage: 'deterministic' });
    unsubscribe();
    emitProgress('run-x', { stage: 'aggregating' });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('is a no-op when nothing is subscribed', () => {
    expect(() => emitProgress('nobody-home', { stage: 'deterministic' })).not.toThrow();
  });

  it('supports multiple listeners for the same runId', () => {
    const a = vi.fn();
    const b = vi.fn();
    subscribeProgress('run-multi', a);
    subscribeProgress('run-multi', b);
    emitProgress('run-multi', { stage: 'qualitative-start' });
    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
  });
});
