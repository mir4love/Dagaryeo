# 다가려 기술 결정

## React Native 버전 조합

모바일과 Windows는 React Native 0.84.1을 사용한다. 2026년 9월 기준 React Native Windows 0.84가 활성 지원 버전이며 동일한 React Native 부 버전을 요구한다. macOS는 npm에 공개된 최신 안정 조합인 react-native-macos 0.81.9와 React Native 0.81.6을 별도 앱 셸로 사용한다. 버전 차이는 공통 TypeScript 패키지의 React Native 의존성을 없애 관리한다.

## 이미지 입력과 출력

사진 선택과 촬영은 `react-native-image-picker`를 사용한다. OCR은 `@react-native-ml-kit/text-recognition`의 한국어 스크립트를 기기 내에서 실행한다. 출력은 React Native Skia의 오프스크린 원본 크기 surface에 이미지를 그리고 선택 영역을 불투명 색으로 채운 뒤 새 PNG로 인코딩한다. 재인코딩 과정에서 EXIF와 기타 원본 메타데이터를 복사하지 않는다. `react-native-blob-util`은 새 캐시 파일 쓰기에, `react-native-share`는 검증된 결과 공유에 사용한다.

이 의존성들은 모두 MIT 라이선스다. 패키지 잠금 파일과 배포 전 SBOM에서 전이 의존성 라이선스를 다시 확인한다.

## OCR 후보

Android와 iOS 첫 구현은 Google ML Kit Text Recognition v2의 한국어 모델을 사용한다. Apple Vision은 iOS와 macOS의 대안이며, 동일 합성 샘플에서 좌표와 한국어 재현율을 비교한 뒤 iOS 기본 엔진 변경 여부를 결정한다. OCR 원문은 작업 메모리에만 두고 로그나 분석 이벤트에 넣지 않는다.

Windows에서는 Windows Media OCR과 ONNX 기반 로컬 OCR을 비교한다. 한국어 언어 팩 의존성과 배포 크기, 오프라인 동작을 실제 Windows POC에서 확인하기 전에는 엔진을 확정하지 않는다.

## PDF 엔진 후보와 라이선스

MuPDF는 실제 redaction 기능이 있으나 AGPL 또는 상업 라이선스가 필요하므로 상업 계약 전에는 제품에 포함하지 않는다. Apryse와 PSPDFKit 계열 상용 SDK는 네 플랫폼 기능과 기술 지원을 비교할 POC 후보지만 가격과 계약 검토가 필요하다. PDFium은 렌더러로 유용하지만 렌더링만으로 안전한 객체 제거가 되지 않으므로 단독 redaction 엔진으로 채택하지 않는다.

PDF POC는 다음 모두를 통과해야 한다.

1. 텍스트와 이미지 객체의 선택 영역 내용 제거
2. 주석, 폼, 첨부, 메타데이터와 이전 개정 데이터 정리
3. 암호화, 서명, 손상 문서의 명확한 차단
4. 새 파일 재열기, 텍스트 재추출, 검색과 복사, 리소스 검사
5. iOS, Android, macOS, Windows 상업 배포 권한 확인

## 배포 경로

iOS는 App Store와 StoreKit, Android는 Google Play와 Play Billing을 기본 경로로 둔다. Windows는 서명된 설치 패키지 직접 배포를 먼저 검토하고, macOS는 공증된 직접 배포와 Mac App Store를 샌드박스·결제 제약과 함께 비교한다. PC 라이선스 서버는 권한 확인만 수행하며 원본 파일이나 OCR 데이터를 받지 않는다.

## 근거

- React Native 0.84 릴리스와 Node.js 22 요구 사항: https://reactnative.dev/blog/2026/02/11/react-native-0.84
- React Native Windows 지원 정책: https://microsoft.github.io/react-native-windows/support/
- React Native macOS 시작 안내: https://microsoft.github.io/react-native-macos/docs/getting-started
- Google ML Kit 텍스트 인식: https://developers.google.com/ml-kit/vision/text-recognition/v2
- Apple Vision 텍스트 인식: https://developer.apple.com/documentation/vision/recognizing-text-in-images
- MuPDF 라이선스: https://mupdf.readthedocs.io/en/latest/license.html
