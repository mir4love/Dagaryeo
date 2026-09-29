import {pixelToNormalized} from './coordinates';
import type {Finding, OcrLine, PiiKind} from './types';

const compact = (value: string) => value.replace(/\s/g, '');
const digits = (value: string) => value.replace(/\D/g, '');

export function isValidResidentRegistrationNumber(value: string): boolean {
  const number = digits(value);
  if (!/^\d{13}$/.test(number)) return false;
  const month = Number(number.slice(2, 4));
  const day = Number(number.slice(4, 6));
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const weights = [2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5];
  const sum = weights.reduce((total, weight, index) =>
    total + Number(number[index]) * weight, 0);
  return (11 - (sum % 11)) % 10 === Number(number[12]);
}

export function isValidBusinessRegistrationNumber(value: string): boolean {
  const number = digits(value);
  if (!/^\d{10}$/.test(number)) return false;
  const weights = [1, 3, 7, 1, 3, 7, 1, 3];
  let sum = weights.reduce((total, weight, index) =>
    total + Number(number[index]) * weight, 0);
  const ninth = Number(number[8]) * 5;
  sum += Math.floor(ninth / 10) + (ninth % 10);
  return (10 - (sum % 10)) % 10 === Number(number[9]);
}

export function isValidKoreanPhoneNumber(value: string): boolean {
  return /^(01[016789]\d{7,8}|0(?:2\d{7,8}|[3-6][1-5]\d{7,8}|70\d{7,8}))$/.test(digits(value));
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(compact(value));
}

type Matcher = {kind: PiiKind; expression: RegExp; validate: (value: string) => boolean};

const matchers: Matcher[] = [
  {
    kind: 'resident-registration-number',
    expression: /\b\d{6}[\s-]?[1-8]\d{6}\b/g,
    validate: isValidResidentRegistrationNumber,
  },
  {
    kind: 'business-registration-number',
    expression: /\b\d{3}[\s-]?\d{2}[\s-]?\d{5}\b/g,
    validate: isValidBusinessRegistrationNumber,
  },
  {
    kind: 'phone-number',
    expression: /(?:01[016789]|02|0[3-6][1-5]|070)[\s.-]?\d{3,4}[\s.-]?\d{4}/g,
    validate: isValidKoreanPhoneNumber,
  },
  {
    kind: 'email',
    expression: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
    validate: isValidEmail,
  },
];

const addressLabels = /(주소|소재지|거주지|도로명|서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)/;
const nameLabels = /(성명|이름|대표자|신청인|담당자)\s*[:：]?\s*[가-힣]{2,5}/;

export function detectFindings(
  lines: OcrLine[],
  imageWidth: number,
  imageHeight: number,
): Finding[] {
  const findings: Finding[] = [];
  lines.forEach((line, lineIndex) => {
    matchers.forEach(matcher => {
      matcher.expression.lastIndex = 0;
      for (const match of line.text.matchAll(matcher.expression)) {
        if (!matcher.validate(match[0])) continue;
        findings.push({
          id: `${lineIndex}-${matcher.kind}-${match.index ?? 0}`,
          kind: matcher.kind,
          normalizedText: compact(match[0]),
          rect: pixelToNormalized(line.frame, imageWidth, imageHeight),
          confidence: 0.98,
          source: 'ocr-rule',
          selected: true,
        });
      }
    });

    const contextualKind = nameLabels.test(line.text)
      ? 'name-candidate'
      : addressLabels.test(line.text)
        ? 'address-candidate'
        : undefined;
    if (contextualKind) {
      findings.push({
        id: `${lineIndex}-${contextualKind}`,
        kind: contextualKind,
        normalizedText: '',
        rect: pixelToNormalized(line.frame, imageWidth, imageHeight),
        confidence: 0.58,
        source: 'ocr-context',
        selected: false,
      });
    }
  });
  return findings;
}
