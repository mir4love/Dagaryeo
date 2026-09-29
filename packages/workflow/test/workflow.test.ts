import {describe, expect, it} from 'vitest';
import {canExport, canShare, transition} from '../src';

describe('job state machine', () => {
  it('requires review before export and verification before sharing', () => {
    expect(canExport('review-pending', true)).toBe(false);
    expect(canExport('review-complete', true)).toBe(true);
    expect(canShare('exporting', true)).toBe(false);
    expect(canShare('verified', true)).toBe(true);
  });

  it('rejects skipped states', () => {
    expect(() => transition('imported', 'verified')).toThrow(/Invalid job transition/);
  });
});
