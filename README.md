# 다가려

다가려는 사진과 PDF 속 개인정보 후보를 기기 안에서 찾아 사용자가 검토한 뒤, 원본과 별개의 사본에 선택 영역을 불투명하게 덮어 저장하는 React Native 앱입니다.

현재 구현은 단계 A의 이미지 흐름에 집중합니다. PDF 안전 내보내기는 실제 객체 제거와 잔존 정보 검증을 통과할 엔진이 결정될 때까지 비활성입니다.

## 저장소 구조

- `apps/mobile`: iOS와 Android 앱
- `apps/macos`: macOS 앱 셸
- `apps/windows`: Windows 앱 셸
- `packages/pii-core`: 개인정보 후보 규칙과 좌표 변환
- `packages/workflow`: 작업 상태기계와 내보내기 가드
- `packages/ui`: 공통 디자인 토큰과 표시 모델
- `docs`: 구현 계획, 기술 결정, 보안 기준

## 시작

Node.js 22 이상과 pnpm 11이 필요합니다.

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm mobile:ios
```

iOS는 첫 실행 전에 `apps/mobile/ios`에서 CocoaPods 설치가 필요합니다. Android는 Android Studio SDK와 실행 중인 에뮬레이터 또는 실제 기기가 필요합니다. OCR은 기기 내 ML Kit를 사용하므로 실제 기기 검증을 권장합니다.

앱 식별자는 모든 모바일 빌드에서 `com.jamsuni.dagaryeo`를 사용합니다. ML Kit iOS 바이너리는 Apple Silicon 시뮬레이터 아키텍처를 제외하므로 iOS의 OCR 포함 빌드는 실제 기기에서 실행 검증해야 합니다.

## 현재 검증 결과

- 개인정보 규칙, 좌표 변환, 작업 상태 단위 테스트 통과
- 모바일·macOS·Windows TypeScript 형 검사 통과
- Android 디버그 APK 빌드 통과
- iOS 시뮬레이터 대상 네이티브 컴파일 통과
- macOS Apple Silicon 네이티브 빌드 통과
- Windows 네이티브 솔루션 생성과 빌드는 Windows 11 개발 환경에서 검증 필요

## 안전 원칙

- 원본, OCR 문자열, 후보 원문은 네트워크나 로그로 보내지 않습니다.
- 원본 파일은 덮어쓰지 않습니다.
- 검증된 결과는 사용자가 `사진에 저장`을 누를 때만 `Pictures/Dagaryeo`에 영구 저장합니다.
- `원본도 함께 저장`은 기본으로 꺼져 있으며, 켜면 개인정보가 남아 있는 원본 사본도 별도로 저장합니다.
- 자동 후보가 0건이어도 안전을 보장하지 않으며 사용자가 직접 확인해야 합니다.
- 출력 파일을 다시 열어 크기와 형식, 선택 영역 적용을 확인한 뒤에만 공유를 허용합니다.
- PDF는 안전한 redaction과 sanitization이 검증되기 전까지 내보내지 않습니다.
