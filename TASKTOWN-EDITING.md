# TaskTown 통합·AI 협업 편집 안내

## 수정 위치

- `tasktown-collaboration.json`: 04절 제목·본문·접기 제목·세부 기록·직접 근거.
- `generate.mjs`의 `taskCollaborationSteps`와 `task4`: 표시 배치와 기존 실행 이미지·트레일러·Steam 연결.
- 기존 `#collaboration` 주소와 메뉴 이름은 유지합니다. 공통 근거 접기 스타일을 재사용합니다.
- JSON 문자열 안의 줄바꿈은 자동 단락이 되지 않습니다. 본문은 `body`, 근거 단락은 `details` 배열의 각 항목으로 나눕니다.

## 채용 관점의 구성

연결 지점과 담당 범위 → 공유 Scene을 피한 코드 수정 → 사운드 설정의 저장·복원 기준. 도구의 기능 나열을 줄이고 각각의 판단을 실제 사례로 설명합니다. 상세 근거는 접기에서 확인하며, 기존 실행 화면은 본문 뒤로 이동합니다.

## 직접 확인한 근거

| ID | 확인한 내용 | 출처 | 기록일(확인 가능 시) | 열람일 | 확인 상태 |
|---|---|---|---|---|---|
| integrationPR | MainScene 통합 · PR #43 | [직접 근거](https://github.com/sudeang0-hue/NookDuck_TaskTown/pull/43) | 2026-07-16 | 2026-10-22 | 직접 열람·소스/커밋 대조 |
| integrationReview | 통합 리뷰와 후속 의견 | [직접 근거](https://github.com/sudeang0-hue/NookDuck_TaskTown/pull/43#issuecomment-4988152437) | 별도 표시 없음 | 2026-10-22 | 직접 열람·소스/커밋 대조 |
| lineBreakCommit | Scene 변경 없는 줄바꿈 전용 커밋 | [직접 근거](https://github.com/sudeang0-hue/NookDuck_TaskTown/commit/271c44d573e2621443b3cfe119b9c6728fcff18c) | 2026-08-07 | 2026-10-22 | 직접 열람·소스/커밋 대조 |
| lineBreakTests | 줄바꿈 검사 코드 | [직접 근거](https://github.com/sudeang0-hue/NookDuck_TaskTown/blob/271c44d573e2621443b3cfe119b9c6728fcff18c/Assets/00.Project/Editor/Tests/Tutorial/TutorialTextLineBreakUtilityTests.cs#L10) | 별도 표시 없음 | 2026-10-22 | 직접 열람·소스/커밋 대조 |
| lineBreakPR | 줄바꿈 반영과 검사 상태 · PR #140 | [직접 근거](https://github.com/sudeang0-hue/NookDuck_TaskTown/pull/140) | 2026-08-07 | 2026-10-22 | 직접 열람·소스/커밋 대조 |
| lineBreakReview | 단어 끊김·폰트 리뷰 | [직접 근거](https://github.com/sudeang0-hue/NookDuck_TaskTown/pull/140#issuecomment-5215717725) | 별도 표시 없음 | 2026-10-22 | 직접 열람·소스/커밋 대조 |
| soundCommit | 사운드 참조 재연결 커밋 | [직접 근거](https://github.com/sudeang0-hue/NookDuck_TaskTown/commit/0531ecbdb92a59701ee421fb1cc3c140caf7be86) | 2026-07-10 | 2026-10-22 | 직접 열람·소스/커밋 대조 |
| soundPR | 사운드 적용·확인 항목 · PR #20 | [직접 근거](https://github.com/sudeang0-hue/NookDuck_TaskTown/pull/20) | 2026-07-10 | 2026-10-22 | 직접 열람·소스/커밋 대조 |
| soundReview | 재생·설정 복원 리뷰 | [직접 근거](https://github.com/sudeang0-hue/NookDuck_TaskTown/pull/20#issuecomment-4933950235) | 별도 표시 없음 | 2026-10-22 | 직접 열람·소스/커밋 대조 |
| readme | 전체 검증 상태와 재현 절차 | [직접 근거](https://github.com/sudeang0-hue/NookDuck_TaskTown/blob/04446f3d036fffe5acb47aa10f74570fdc52bcb3/README.md#L256) | 별도 표시 없음 | 2026-10-22 | 직접 열람·소스/커밋 대조 |

## 표현 범위

- 통합 PR #43과 각 리뷰는 작업 내용과 선별 확인 항목을 입증합니다. 팀 전체 기능의 원 구현이나 전체 통합·최적화 완료를 본인 성과로 확대하지 않습니다.
- 줄바꿈은 넓은 반영 커밋 `5888eb3` 대신 전용 커밋 `271c44d`로 변경 범위를 제시합니다. 넓은 PR에는 별도 Prefab·폰트 변경도 있으므로 PR 전체를 Scene·Prefab 무변경이라고 쓰지 않습니다.
- Editor 테스트 4개는 소스의 선언 수이며 통과 결과가 아닙니다. 테스트용 측정 함수, 실제 TMP 표시 리뷰, 전체 빌드 검증을 구분합니다.
- 사운드는 확인 항목과 팀 리뷰의 확인·보완 의견을 구분합니다. 모든 도구 검사가 자동으로 통과했다고 쓰지 않습니다.
- 전체 검증 상태는 고정 공개 커밋 `04446f3d036fffe5acb47aa10f74570fdc52bcb3`의 README를 기준으로 하며 2026.10.22에 읽었습니다.
- Codex·Unity MCP의 사용 과정과 공유 Scene 작업 상황은 기존 사용자 작업 기록·Notion 서술을 근거로 합니다. Git 기록만으로 AI 실행 주체를 입증하지 않습니다.
- 스크럼 재사용 프롬프트는 기존 Notion 보조 설명으로 보존합니다. 이번에 프롬프트 원문이나 실행 결과를 검증한 사례로 확대하지 않습니다.

## 보존·백업·검수

- 기준 사이트 커밋: `4b6692662735da353eefd554ca423e890731c2c8`. 전체 소스 ZIP과 Notion 비공개 전체 사본은 개인 작업 기록에 보관합니다.
- 홈페이지는 TaskTown 04절만 변경하고 01~03절·다른 여섯 페이지 본문과 이미지를 유지합니다.
- Notion은 흩어진 MainScene·AI 협업 설명을 04절로 모으고 스크럼 보조 기록은 별도 접기로 유지합니다. 다른 구현·미디어·기획 자료 참조를 보존합니다.
- 자동 연결 검사 후 PC·390px·320px, 라이트·다크와 접기·이미지 확대를 확인합니다. 실제 휴대폰 조작과 새 Unity 실행은 별도입니다.

