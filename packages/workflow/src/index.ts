export type JobState =
  | 'imported'
  | 'analyzing'
  | 'review-pending'
  | 'review-complete'
  | 'exporting'
  | 'verified'
  | 'failed'
  | 'cancelled';

const transitions: Record<JobState, readonly JobState[]> = {
  imported: ['analyzing', 'cancelled', 'failed'],
  analyzing: ['review-pending', 'cancelled', 'failed'],
  'review-pending': ['review-complete', 'cancelled', 'failed'],
  'review-complete': ['exporting', 'review-pending', 'cancelled', 'failed'],
  exporting: ['verified', 'failed'],
  verified: [],
  failed: [],
  cancelled: [],
};

export function transition(current: JobState, next: JobState): JobState {
  if (!transitions[current].includes(next)) {
    throw new Error(`Invalid job transition: ${current} -> ${next}`);
  }
  return next;
}

export function canShare(state: JobState, verificationPassed: boolean): boolean {
  return state === 'verified' && verificationPassed;
}

export function canExport(state: JobState, reviewedAllPages: boolean): boolean {
  return state === 'review-complete' && reviewedAllPages;
}
