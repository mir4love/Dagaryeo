export type PiiKind =
  | 'resident-registration-number'
  | 'phone-number'
  | 'email'
  | 'business-registration-number'
  | 'name-candidate'
  | 'address-candidate'
  | 'manual';

export type NormalizedRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PixelRect = NormalizedRect;

export type OcrLine = {
  text: string;
  frame: PixelRect;
};

export type Finding = {
  id: string;
  kind: PiiKind;
  normalizedText: string;
  rect: NormalizedRect;
  confidence: number;
  source: 'ocr-rule' | 'ocr-context' | 'manual';
  selected: boolean;
};
