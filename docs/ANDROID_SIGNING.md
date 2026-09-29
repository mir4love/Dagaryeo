# Android 릴리즈 서명

다가려 Android 릴리즈는 코람데오 앱과 동일한 배포 인증서를 사용한다.

## 로컬 파일

다음 파일은 개발 장비의 프로젝트 안에 유지하지만 Git에는 커밋하지 않는다.

- `apps/mobile/android/app/mir4love.jks`: 배포 키 저장소
- `apps/mobile/android/local.properties`: 키 경로, 별칭과 비밀번호

`local.properties`에는 다음 네 속성이 있어야 한다.

```properties
SIGNED_STORE_FILE=mir4love.jks
SIGNED_STORE_PASSWORD=<비밀번호>
SIGNED_KEY_ALIAS=mir4love
SIGNED_KEY_PASSWORD=<비밀번호>
```

실제 비밀번호는 이 문서나 다른 버전 관리 파일에 기록하지 않는다. 두 로컬 파일은 `apps/mobile/.gitignore`의 `local.properties`와 `*.jks` 규칙으로 제외한다.

## 인증서 확인값

- 주체: `CN=Kenneth. Kim, O=jamsuni.com, L=Seoul, C=KR`
- SHA-256: `A4:6B:F4:F4:A4:70:C4:4C:0F:28:CC:AE:92:21:39:06:B7:50:9B:D6:42:94:7D:BB:83:ED:C5:F4:61:6A:94:EF`

이 지문이 다르면 기존 설치본을 데이터 유지 방식으로 업데이트할 수 없다.

## 빌드와 설치

`apps/mobile/android`에서 다음 명령으로 릴리즈 APK를 만든다.

```bash
./gradlew app:assembleRelease
```

결과 파일은 `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`이다. 연결 기기에는 다음과 같이 업데이트 설치한다.

```bash
adb install -r app/build/outputs/apk/release/app-release.apk
```

릴리즈 전에는 Android SDK의 `apksigner verify --print-certs`로 APK의 SHA-256 지문이 위 값과 같은지 확인한다.

## 보관 주의사항

키 저장소와 비밀번호 파일을 잃으면 동일한 인증서로 앱을 업데이트할 수 없다. 프로젝트 밖의 암호화된 백업에도 두 파일을 함께 보관한다. 키 저장소 형식을 변경하거나 새 키를 만들 때는 기존 설치본과의 업데이트 호환성을 먼저 확인한다.
