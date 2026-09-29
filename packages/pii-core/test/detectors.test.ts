import {describe, expect, it} from 'vitest';
import {
  detectFindings,
  isValidBusinessRegistrationNumber,
  isValidEmail,
  isValidKoreanPhoneNumber,
  isValidResidentRegistrationNumber,
} from '../src';

describe('Korean PII validators', () => {
  it('validates resident registration checksum', () => {
    expect(isValidResidentRegistrationNumber('900101-1234568')).toBe(true);
    expect(isValidResidentRegistrationNumber('900101-1234569')).toBe(false);
  });

  it('validates business registration checksum', () => {
    expect(isValidBusinessRegistrationNumber('220-81-62517')).toBe(true);
    expect(isValidBusinessRegistrationNumber('220-81-62518')).toBe(false);
  });

  it('validates phone and email formats', () => {
    expect(isValidKoreanPhoneNumber('010-1234-5678')).toBe(true);
    expect(isValidKoreanPhoneNumber('010-12-5678')).toBe(false);
    expect(isValidEmail('hello@example.kr')).toBe(true);
  });
});

describe('candidate detection', () => {
  it('keeps rule matches selected and contextual candidates unselected', () => {
    const findings = detectFindings([
      {text: '연락처 010-1234-5678', frame: {x: 20, y: 40, width: 300, height: 40}},
      {text: '주소 서울특별시 마포구', frame: {x: 20, y: 100, width: 500, height: 40}},
    ], 1000, 1000);
    expect(findings[0]).toMatchObject({kind: 'phone-number', selected: true});
    expect(findings[1]).toMatchObject({kind: 'address-candidate', selected: false});
  });
});
