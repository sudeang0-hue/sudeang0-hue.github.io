# 수정과 자동 배포 안내

- 사이트: https://sudeang0-hue.github.io/
- 저장소: https://github.com/sudeang0-hue/sudeang0-hue.github.io
- 배포 확인: https://github.com/sudeang0-hue/sudeang0-hue.github.io/actions

## 가장 간단한 문구 수정

1. 저장소에서 `generate.mjs`를 열고 연필 버튼으로 수정합니다.
2. 변경 내용을 검토하고 `main`에 저장합니다. 변경 파일과 커밋 메시지를 먼저 확인합니다.
3. Actions의 `Portfolio Pages`가 초록색으로 완료되면 사이트를 새로고침합니다.

생성된 `dist/*.html`만 고치면 다음 배포에서 덮어씁니다. 문구는 `generate.mjs`, 굿즈 내용은 `goods-content.json`, Steam·STOVE 주소는 `project-links.json`을 수정합니다. Notion과 자동 동기화되지는 않습니다.

## 이미지·영상·디자인 수정

- 이미지·영상: `dist/assets/`의 파일을 교체하거나 추가합니다. 새 파일명이면 `generate.mjs`의 참조도 바꿉니다.
- 이미지 크기: `asset-sizes.json`도 함께 갱신합니다.
- 색·간격·모바일 배치: `dist/styles.css`를 수정합니다.
- 화면 모드: `dist/theme.js`, 확대·복사 동작: `dist/app.js`를 수정합니다.
- 굿즈 자료 추가: `GOODS-EDITING.md`를 참고합니다.

여러 파일을 바꿀 때에는 GitHub Desktop에서 이 저장소를 열어 수정 → 변경 검토 → 커밋 → Push origin 순서로 올리는 것이 편합니다. 다른 저장소와 혼동하지 않도록 저장소 이름을 확인합니다.

## 배포 전 확인

로컬에서는 `node generate.mjs`, `python check_site.py`를 실행합니다. Actions도 같은 생성·연결·제목·이미지 설명·검색 제외 검사를 수행합니다. 실패하면 새 버전은 배포하지 않으며 Actions에서 오류를 확인합니다. 화면 정렬과 영상 소리는 별도로 직접 확인합니다.

## 잘못 수정했을 때

문제가 있는 커밋을 GitHub Desktop의 History에서 선택해 `Revert changes in commit`으로 되돌리고 Push합니다. 기록을 삭제하는 강제 업로드 대신 되돌리기 커밋이 남습니다. 여러 사람이 같은 부분을 수정했다면 되돌리기 전에 변경 범위를 확인합니다. 같은 소스로 재배포만 하려면 Actions → Portfolio Pages → Run workflow에서 `main`을 선택합니다.

## 공개 범위와 권한

`main`에 올린 변경은 공개 사이트에 자동 반영됩니다. 소스·커밋 기록도 공개됩니다. API 키·개인 문서·비밀번호·백업 파일은 올리지 않습니다. 작성자 이메일은 GitHub의 비공개용 주소를 사용합니다. 사이트의 `noindex,nofollow`는 검색 제외 요청이며 접근 차단이나 검색 결과 제거를 보장하지 않습니다.

배포 설정은 `.github/workflows/pages.yml`에 있습니다. GitHub 공식 작업을 고정 버전으로 사용하며 별도 배포 서비스 계정이나 저장된 배포 토큰이 필요하지 않습니다. Pages 설정은 저장소 Settings → Pages → Source가 `GitHub Actions`인 상태를 유지합니다.

## 참고

- [GitHub Pages 공식 자동 배포 안내](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [커밋 작성자 이메일 설정](https://docs.github.com/en/account-and-profile/how-tos/email-preferences/setting-your-commit-email-address)
