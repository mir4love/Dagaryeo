import type {Finding, NormalizedRect} from '@dagaryeo/pii-core';
import type {JobState} from '@dagaryeo/workflow';

export type LocalImage = {
  uri: string;
  fileName: string;
  type: string;
  width: number;
  height: number;
  fileSize?: number;
};

export type Redaction = {
  id: string;
  rect: NormalizedRect;
  selected: boolean;
  origin: 'automatic' | 'manual';
};

export type MobileJob = {
  state: JobState;
  image?: LocalImage;
  findings: Finding[];
  manualRedactions: Redaction[];
  outputUri?: string;
  verificationPassed: boolean;
  savedToPhotos?: boolean;
  savedOriginal?: boolean;
  error?: string;
};
