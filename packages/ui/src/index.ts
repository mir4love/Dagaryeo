export const colors = {
  background: '#F4FBFC',
  surface: '#FFFFFF',
  surfaceMint: '#EAFBFA',
  surfaceBlue: '#EEF8FC',
  primary: '#00A9B7',
  primaryDark: '#007E8A',
  navy: '#172B4D',
  muted: '#607087',
  border: '#D7E8EC',
  coral: '#FF725E',
  success: '#16B9A5',
  danger: '#D64545',
  mask: '#072F35',
} as const;

export const spacing = {xs: 4, sm: 8, md: 16, lg: 24, xl: 32} as const;
export const radius = {sm: 8, md: 14, lg: 22, pill: 999} as const;

export const piiLabels = {
  'resident-registration-number': '주민등록번호',
  'phone-number': '전화번호',
  email: '이메일',
  'business-registration-number': '사업자등록번호',
  'name-candidate': '이름 후보',
  'address-candidate': '주소 후보',
  manual: '수동 지정',
} as const;
