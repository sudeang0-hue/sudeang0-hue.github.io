# 게임랩 Figma 흐름 설계·UI 리디자인 편집 안내

## 고정 사례 목차

게임랩의 5개 사례와 TaskTown의 4개 사례 목차는 `generate.mjs`의 `gameCaseMenus`에서 관리합니다. 기존 프로젝트 이동 메뉴 바로 아래에 고정합니다. `dist/app.js`의 공통 사례 선택 로직은 굿즈와 두 게임 페이지에서 함께 사용하며 실제 헤더 높이에 맞춰 제목 가림과 현재 선택을 계산합니다. 모바일은 3열로 배치하고 긴 이름은 줄바꿈합니다. 본문 중간의 중복 목차는 제거했습니다.

## 범위

`generate.mjs`의 `game1`은 리디자인 배경 → 로비·전투·도감·스킬 전후 → 마감 오류 두 사례 → 전장 보기 → 담당·검증 범위 순서입니다. 다른 사례와 공통 메뉴는 유지합니다.

- 디자인 방향: 초기 다크 판타지, 가용 유닛 에셋과 UI 표현 차이, 정보 가독성·시선 흐름 피드백.
- 로비의 표현 기준: 실제 픽셀 캐릭터, 제목·캐릭터·설명 구획, 제목 명조/본문 고딕, 공통 하단 메뉴.
- 마감: 말풍선·업적의 배경 돌출과 결과 숫자 주변 잔여 글리프.
- 플레이 흐름: 전장 보기에서 시너지 확인, 보상 보기로 돌아와 기존 후보 선택, 상태별 입력 차단.

생성 뒤 `python check_site.py`를 실행하고 PC·390px·320px에서 정렬, 캡션, 확대 보기와 테마를 확인합니다.

## 팀 통합 근거

공식 PR의 2026.10.14 병합 기록과 로컬 팀 브랜치 포함 기록을 기준으로 합니다. 작업·캡처는 10월 13일이며, 팀 통합 날짜와 구분합니다. 최종 플레이어 빌드에 대한 검증은 별도입니다.

- 말풍선·업적 경계, 결과 숫자/패널 마감: [`d372aaa`](https://github.com/OZ-GAME-LAB/OZGL2_1/commit/d372aaa)
- 전장 보기·보상 보기: [`91bb69f`](https://github.com/OZ-GAME-LAB/OZGL2_1/commit/91bb69f)
- 팀 통합: [PR #101](https://github.com/OZ-GAME-LAB/OZGL2_1/pull/101), 2026.10.14 병합 `8a4fa074257c1b0e784ce36943e51f82b9805da2`
- 원인과 검증: [HeraldrySupplement.md](https://github.com/OZ-GAME-LAB/OZGL2_1/blob/8a4fa07/Docs/UI/HeraldrySupplement.md)

`4a102b3`의 후속 경험치 Fill·결과 바 끝단·스킬 설명 줄바꿈은 이 절의 팀 통합 성과에 포함하지 않습니다. 이전에 있던 10월 19일 5슬롯 보충 화면도 이 절에서는 제외해 팀 통합 사례에 집중했습니다. 파일 자체는 보존합니다.

## 이미지 출처와 캡션

이미지는 2026.10.13 당시 캡처를 그대로 복사했습니다. AI 재생성, 오류 재현용 그림 조작, 덧그리기는 하지 않았습니다. Discord의 비공개 대화·이름·첨부 접근 토큰은 공개하지 않습니다.

| 공개 파일 | Unity 프로젝트 내 원본 | 성격 |
|---|---|---|
| `gamelab-dialogue-before.png` | `Builds/UIPlayScreenshots_20261013/06_TutorialBubble.png` | 표시 검증용 상태의 이전 Game View |
| `gamelab-dialogue-after.png` | `Builds/UIVisualPolish_20261013/Live_1080p/02_Tutorial_Right.png` | 같은 말풍선 문구, 전장 데이터는 다른 수정 후 Game View |
| `gamelab-number-before.png` | `Builds/UIFeedback_20261013/Result/Result_Padding_True.png` | 동일 결과 Prefab·동일 수치, 추가 여백 켜짐 |
| `gamelab-number-after.png` | `Builds/UIFeedback_20261013/Result/Result_Padding_False.png` | 동일 결과 Prefab·동일 수치, 추가 여백 꺼짐 |
| `gamelab-reward-expanded.png` | `Builds/RewardInspection_20261013/Final_1080p/01_Reward_Expanded.png` | 개선 후 보상 후보 화면 |
| `gamelab-reward-inspection.png` | `Builds/RewardInspection_20261013/Final_1080p/03_Collapsed_Synergy_Tooltip.png` | 개선 후 카드를 접고 시너지 확인 |

모든 원본은 1920×1080입니다. 말풍선 영역은 x760,y600,w840,h230, 숫자 영역은 x1035,y405,w230,h80을 CSS로 확대 표시합니다. `redesignDetail`의 버튼을 누르면 잘리지 않은 원본 전체 캡처가 열립니다. `.redesign-crop`의 위치/비율을 바꿀 때는 원본 영역도 함께 확인합니다.

초기 로비는 `gamelab-lobby-before.png`를 유지합니다. 적용 후 로비·도감·스킬 화면은 아래 최신 캡처 갱신 항목을 기준으로 하며 전투는 기존 실행 캡처를 유지합니다. 이전 10월 5일 검토 이미지는 파일과 과거 변경 기록에만 보존합니다. 보상 두 장은 오류 수정 전후가 아니라 **개선 후 기능의 서로 다른 상태**입니다.

표시 검증용 상태를 구성한 장면을 자연 발생 업적·최종 플레이어 빌드 촬영으로 표현하지 않습니다. 말풍선·결과 숫자·전장 보기의 검사 횟수는 당시 기록이며, 아래 최신 화면 촬영과 구분합니다.

## 수정 전 상태와 되돌리기

이번 편집 전 사이트 기준 커밋은 `0c0b8bb8ba8d54d42ff1a397b11ac3dfe520510f`입니다. 전체 소스 ZIP 및 변경 전 파일 사본은 별도 비공개 작업 폴더에 보관합니다. 백업과 원본 검증 기록은 공개 저장소에 추가하지 않습니다.

공개 후 되돌릴 때는 이번 사이트 변경 커밋만 `git revert <해당 커밋>`으로 취소하는 새 커밋을 만들어 검토 후 올리면 자동 배포됩니다. 이후 다른 작업을 덮어쓰는 전체 초기화는 사용하지 않습니다.


## 01 Figma UI 흐름 설계 추가 — 2026.10.21

- 새 `#flow` 절을 기존 리디자인 앞에 배치했습니다. `#redesign/#hud/#result/#ai` 주소는 보존하고 화면 번호는 02/03/04/05로 변경했습니다.
- `gamelab-figma-flow.png`는 사용자가 제공한 초기 프로토타입 연결 캔버스(1264×804) 그대로입니다. 원본에 참고 게임 화면과 메모가 함께 있습니다. 실제 게임 완성 화면이나 새로 생성한 구조도로 소개하지 않습니다.
- Figma 파일의 실제 시작점은 `3:2`(Flow 1, Game Main Loby)와 `31:8`(Flow 2, Game Play - 대기)입니다. 원본의 `flowStartingPoints`와 클릭/오버레이/복귀 연결을 읽기 전용으로 확인했습니다. Figma 파일·공유 설정을 수정하지 않았습니다.
- 로비의 특성·스킬 세팅·도감·설정은 `OVERLAY`, 전투 준비는 `NAVIGATE`입니다. 전투 결과 `95:889`/`95:900`의 로비 복귀 연결은 `3:2`입니다. 증강 선택·확률 설명·설정의 닫기 연결도 있습니다.
- 초기 프로토타입에는 `Game Loby - 미정`과 예시 수치가 있습니다. 게임 규칙·저장·전투 전체를 검증했다는 의미로 확대하지 않습니다.

### 재생·설정

`generate.mjs`의 `figmaFlowURLs`와 `figmaLobby/figmaBattle`이 원본 파일 키와 시작점을 관리합니다. 버튼의 데이터 속성이 iframe 주소와 외부 재생 링크를 함께 제공합니다. `dist/figma-prototype.js`는 재생 요청 전에는 iframe 주소를 설정하지 않고, 재생·시작점 전환·선택 흐름 재시작만 담당합니다.

공식 URL은 `https://embed.figma.com/proto/<fileKey>?node-id=...&starting-point-node-id=...&embed-host=sudeang-portfolio`를 사용합니다. 별도 OAuth 앱 등록이나 토큰은 사용하지 않습니다. Figma의 원본 공개 권한을 그대로 따르며 공유 설정을 우회하지 않습니다. 외부 재생·원본 링크는 iframe과 별도로 유지합니다.

- [Figma 공식 프로토타입 임베드](https://developers.figma.com/docs/embeds/embed-figma-prototype/)
- [임베드 접근 규칙](https://developers.figma.com/docs/embeds/security-access/)
- [임베드 문제 해결](https://developers.figma.com/docs/embeds/troubleshooting/)
- [설계 원본](https://www.figma.com/design/Kz3TNcpjEhLXT7lGoCWinf?node-id=0-1)

사용자가 재생을 요청하면 Figma 콘텐츠를 외부에서 불러옵니다. 해당 서비스의 쿠키·접근 정책이나 브라우저 설정에 따라 재생 화면이 열리지 않을 수 있으므로 외부 재생 링크를 지우지 않습니다. 초기 공개 검수에서는 로그인 없는 로비와 전투 시작 화면·임베드 표시를 직접 확인합니다. iframe의 load 이벤트만으로 정상 재생을 판정하지 않습니다.

### 원본 보존

추가 전 사이트 기준은 `89a8793d8ae745a3350b02bdb3a443e87a45ef5b`입니다. 전체 소스 ZIP과 수정 전 파일은 별도 비공개 작업 폴더에 보관합니다. 이미지·문구와 시작점을 바꿀 때에는 링크·선택 상태·재시작·PC/390px/320px·라이트/다크·원본 이미지 확대를 확인합니다. 기존 UI 리디자인 본문과 검증 이미지는 유지합니다.

## 흐름 설계와 리디자인 연결 검토 — 2026.10.21

설계 도입과 로비·전투 설명의 반복을 줄이고 실제 에셋·팀 피드백은 리디자인 도입에서 설명합니다. 두 절을 잇던 짧은 문장과 다음 절 링크는 2026.10.22 사용자 요청으로 제거했습니다. 작은 화면에서는 시작점 선택 바로 아래의 크게 재생 링크를 사용할 수 있습니다. 이미지 확대의 원본 크기와 화면에 맞추기도 함께 확인합니다. 이번 수정 전 기준은 `048eb855ed0ff4575cc63c50a9110f6184c9d754`이며, 전체 ZIP은 비공개 작업 폴더에 보관합니다.

## 이전 문구·전후 비교 구성 기록 (2026.10.22, 최신 캡처 교체 전)

- 흐름 설계 마지막 전환 문장·다음 링크와 그 안의 추가 구분선을 제거했습니다. 절 구분선은 유지합니다.
- 초기 기획(마왕군 플레이·용사군 적), AI 시안 제작, 실제 에셋과 표현 차이·팀 피드백·여러 시안 공유를 도입에 반영했습니다.
- 숫자 캡션의 ‘사진값’은 이미지 내용에 맞게 ‘시간값’으로 정리했습니다.
- 말풍선은 분리형 교체 편의와 경계 조정의 부담을 설명하고 일체형 표시·좌우 반전·본문 여백·업적 적용으로 연결했습니다. 기존 배경과 Tail 오브젝트를 실제 삭제했다거나 성능이 개선됐다는 주장은 하지 않습니다.
- 실제 구현 근거: Unity 프로젝트의 `Docs/UI/HeraldrySupplement.md:77`, `Assets/01.Scripts/Tutorial/TutorialDirector.cs:874`, `Assets/00.Project/01.Scripts/UI/Shared/UIHeraldryDialogueImage.cs:6`, `Assets/01.Scripts/UIBridge/AchievementToast.cs:115`.

전후 화면은 `gamelab-comparison.json`에서 관리하며 원본 비율을 유지합니다. 위 Before와 아래 After가 같은 화면 종류로 함께 이동하고 개별 사진 클릭으로 확대합니다. 자동 재생은 하지 않습니다. 기존 말풍선·숫자의 세부 오류 비교와 전장 보기 이미지는 유지합니다.

| 화면 | 초기 원본 (Unity 프로젝트 LocalStaging 기준) | 적용 후 원본 | 표시 범위 |
|---|---|---|---|
| 로비 | 기존 `gamelab-lobby-before.png` | 기존 `gamelab-lobby-after.png` | 10/5 구현 검토, 선택 난이도·계정 차이 |
| 전투 | `게임랩2기1팀_사용한 리소스 팩/03_현재 적용된 인게임 캡처/InGame/02_InGame_Combat.png` | `Recordings/STOVE_Showcase_20261014/Delivery/Images/01_Combat.png` | 초기 준비 프로토타입과 10/14 Play Mode, 전장 상태 차이 |
| 도감 | 같은 초기 루트 `Lobby/04_Lobby_UnitCodex.png` | `Heraldry_Codex_Review_20261005/codex-demon-final.png` | 10/5 검토, 양쪽 발견 3/6 |
| 스킬 | 같은 초기 루트 `Lobby/03_Lobby_Skills.png` | `Heraldry_Skills_Review_20261005/skills-final.png` | 10/5 당시 3슬롯, 이후 5슬롯 구현과 구분 |

초기 파일 수정 시각을 확정 촬영일로 쓰지 않습니다. 이 갤러리 전체를 동일 데이터의 오류 검증이나 최종 빌드 전후로 설명하지 않습니다. 공개 사본 5장은 원본과 바이트가 같습니다. 수정 전 전체 백업은 비공개 작업 폴더에 보관하며 기준 커밋은 `3fb12fdb560ef13c991e511c9c9c8468a17352ff`입니다.


## 최신 화면·두 화면 동시 표시 (2026.10.22)

현재 적용 후 로비·도감·스킬·업적은 `gamelab-ui-latest-lobby.png`, `gamelab-ui-latest-codex.png`, `gamelab-ui-latest-skills.png`, `gamelab-ui-latest-achievements.png`입니다. 2026.10.22 Unity MCP에서 현재 `Builds/Lobby`를 실제 실행하고 기존 화면 열기 경로로 촬영한 1920×1080 원본을 그대로 사용합니다. 전투는 사용자 요청에 따라 기존 `gamelab-combat.png`를 유지합니다. 기존 전투 원본은 2026.10.14 `Recordings/STOVE_Showcase_20261014/Delivery/Images/01_Combat.png`이며 새 촬영으로 표현하지 않습니다. 상세 촬영 상태와 원본 경로는 비공개 검수 기록에서 관리하며, 이전 10월 5일 검토 화면은 위 과거 기록으로 보존합니다. 화면에 날짜·3슬롯/5슬롯 구분이나 긴 상태 설명은 표시하지 않습니다.

PC에서는 각 Before/After 줄에 최대 두 종류를 보여주고, 한 번 누르거나 드래그할 때 한 종류씩 이동합니다. 로비·전투 → 전투·도감 → 도감·스킬 세팅 → 스킬 세팅·업적 → 업적 → 처음 순서입니다. 마지막 한 장은 같은 크기로 왼쪽에 표시합니다. 640px 이하에서는 한 종류씩 표시합니다. 기존 종류 선택 버튼은 제거하고 좌우 화살표·드래그·방향키·Home/End를 사용합니다. 위아래는 같은 종류로 함께 이동하며, 화면 폭을 바꿔도 보고 있던 화면이 포함된 묶음을 유지합니다. 사진 클릭은 원본 확대입니다. 자동 재생은 하지 않습니다.

이 변경 전 사이트 기준은 `b24607e2c64333c574fa864709ff383411a5f072`이며 수정 전 전체 ZIP은 별도 비공개 작업 폴더에 보관합니다.

## 본문과 줄바꿈 직접 편집하기

1. GitHub 저장소에서 [`generate.mjs`](https://github.com/sudeang0-hue/sudeang0-hue.github.io/blob/main/generate.mjs)를 열고 연필(Edit) 버튼으로 편집합니다. 로컬에서는 같은 파일을 엽니다.
2. 파일 안에서 `const game1=section('redesign'`을 찾으면 UI 리디자인 본문이 시작됩니다. 세부 비교 제목은 `redesign-comparison-title`, 말풍선 설명은 ‘기존 프로토타입에 새 Sprite’로 찾습니다. 다른 사례는 `gameFlow`(Figma), `game2`(HUD), `game3`(결과), `game4`(AI)에서 수정합니다.
3. **단락을 나누려면 `<p>...</p>`를 따로 작성**합니다. 같은 단락 안에서 반드시 줄을 바꿀 위치에만 **`<br>`**를 넣습니다. 소스 파일에서 Enter만 누르는 것은 브라우저에서 줄바꿈으로 표시되지 않습니다.

```html
<p>처음 구성한 디자인과 실제 게임 리소스의 표현에 차이가 있었습니다.</p>
<p>팀 피드백을 반영해 읽는 순서와 화면 구성을 정리했습니다.</p>

<p>첫 번째 줄입니다.<br>이 부분부터 같은 단락의 다음 줄로 표시합니다.</p>
```

문장마다 `<br>`를 넣으면 모바일에서 한 줄이 다시 나뉘어 빈틈이 생길 수 있습니다. 대부분은 자동 줄바꿈에 맡기고, 의미가 바뀌는 곳은 새 `<p>`로 나누는 것을 권장합니다. 비교 사진의 제목·캡션은 [`gamelab-comparison.json`](https://github.com/sudeang0-hue/sudeang0-hue.github.io/blob/main/gamelab-comparison.json)에서 수정합니다. JSON 캡션 안의 `<br>`는 텍스트로 표시되므로 넣지 않습니다.

`dist/gamelab.html`은 생성 결과이므로 직접 수정하지 않습니다. 로컬에서 편집한 뒤 `node generate.mjs`, `python check_site.py`를 실행하고 `node preview.mjs`로 PC·390px·320px의 줄바꿈과 정렬을 확인합니다. GitHub에서 원본을 편집해 `main`에 저장하면 자동 배포 과정이 페이지를 다시 생성합니다. 수정을 되돌리려면 해당 변경 커밋을 취소하는 새 커밋으로 복원합니다.


## 업적 전후 화면 추가 — 2026.10.22

- 비교 순서는 로비·전투·도감·스킬 세팅·업적입니다. 업적 추가 당시에는 PC 두 화면 묶음으로 전환했으며, 현재는 위 안내처럼 한 이미지씩 전환합니다. 모바일은 한 화면씩 표시합니다.
- Before는 기존 초기 자료 팩의 `Lobby/05_Lobby_Achievements.png`, After는 현재 `Builds/Lobby` Play Mode에서 기존 `ReservedButton → UILobbyOverlayView.OpenOverlayPopup` 경로로 연 업적 화면을 Unity MCP로 새로 촬영했습니다. 두 공개 PNG는 1920×1080 원본과 바이트가 같습니다.
- 현재 업적은 실제 계정의 달성 상태 그대로입니다. 완료 수치·진행 값이 같은 조건의 전후 시험이라는 주장을 하지 않으며 초기 사진의 최초 촬영일은 확정하지 않습니다.
- 자료 출처·SHA256은 비공개 검수 기록에 남깁니다. 이번 추가 전 기준 커밋은 `b64727442db02c95c7905c92352d167a21c3c47d`이며 별도 전체 ZIP 백업을 보관합니다.


## 접이식 사례 목차와 한 이미지씩 전환 — 2026.10.22

게임랩·TaskTown의 사례 목차는 평소 접힌 상태입니다. PC에서는 상단 프로젝트 메뉴 영역에 마우스가 들어가면 그 페이지의 목차가 펼쳐지고, 메뉴를 벗어나면 닫힙니다. 모바일은 ‘목차’ 버튼으로 열고 닫습니다. 키보드 사용자는 프로젝트 링크에 초점을 두거나 목차 버튼에서 Enter/Space로 열 수 있고, Escape로 닫습니다. 사례 링크 선택과 메뉴 밖 클릭도 목차를 닫습니다.

펼친 목차는 프로젝트 메뉴 아래에 겹쳐 표시하므로 고정 헤더가 본문 높이를 더 차지하지 않습니다. 현재 읽는 영역의 색상·밑줄은 접힌 동안에도 갱신됩니다. 굿즈 목차는 기존 고정 방식을 유지합니다. JavaScript가 실행되지 않는 환경에서는 기존 목차를 그대로 보여줍니다.

- 메뉴 항목: `generate.mjs`의 `gameCaseMenus` / `shell`
- 열기·닫기, 초점·현재 영역 선택: `dist/app.js`
- 펼침 배치·모바일 버튼: `dist/styles.css`의 `.game-case-navigation`
- 전후 비교 이동: `dist/redesign-comparison.js` — PC 두 장 표시·모바일 한 장 표시를 유지하며 입력 한 번에 한 이미지씩 움직입니다.
- 공통 CSS·app.js와 비교 스크립트는 생성 시 파일 내용의 해시를 주소에 붙여 이전 배포 캐시와 구분합니다. 이미지·본문·외부 주소는 바꾸지 않습니다.

수정 전 기준은 `5e0b9eb093222c63378e273577e716f6491677c4`이며 전체 ZIP 백업과 검수 기록은 비공개 작업 폴더에 보관합니다.

## Figma 캔버스·설명 교체 — 2026.10.22

- 현재 공개 이미지는 사용자가 새로 제공한 `gamelab-figma-flow-overview.png`(1547×764)입니다. 로비 Scene과 전투 Scene, 화면 간 연결을 함께 보여주는 첨부 원본을 변형 없이 복사했습니다. 이전 `gamelab-figma-flow.png`도 보존합니다.
- `generate.mjs`의 `gameFlow` 도입을 ‘화면 구성·비율·기능 정리 → 프로토타입 연결 → 팀 공유·피드백 → UI 제작 기준’으로 정리했습니다. 팀 공유와 피드백은 사용자가 이번 요청에서 설명한 경험을 근거로 합니다.
- 로비·전투의 구체적인 설계 예시, 프로토타입 시작점·재생·외부 링크와 초기 설계 안내는 유지합니다. Figma 원본 파일이나 공유 설정은 수정하지 않습니다.
- 교체 전 기준은 `ddb2fa5ced42cd6c351edebc3b8b92e27525953c`이며 전체 소스 ZIP은 비공개 작업 폴더에 보관합니다.

## 프로토타입 하단 안내·공통 메뉴 여백 — 2026.10.22

- 초기 프로토타입 안내를 재생창 바로 아래 `.figma-player-status`로 옮겼습니다. 바깥의 중복 캡션과 시작점별 동작 안내 문장은 제거했습니다.
- `dist/figma-prototype.js`는 선택 상태·iframe 제목·외부 링크를 갱신하며 고정 안내를 덮어쓰지 않습니다. 시작 화면 변경은 버튼의 `aria-pressed`로도 구분합니다. 이 스크립트도 내용 해시를 주소에 붙여 이전 캐시와 구분합니다.
- `.site-header .category-subnav`의 안쪽 여백은 30px입니다. 모바일은 메뉴 컨테이너를 화면 너비로 표시해 첫 항목을 화면 왼쪽에서 30px 띄우고, 상위 분야 메뉴도 왼쪽 30px에 맞춥니다. 360px 이하 프로젝트 메뉴 간격은 한 줄 배치를 고려해 조정합니다.
- 같은 공통 규칙을 게임 개발·굿즈의 하위 메뉴와 전체 페이지의 모바일 상위 분야 메뉴에 적용합니다. 디자인 및 홍보처럼 현재 하위 메뉴가 없는 페이지에 새 항목을 만들지는 않습니다.
- 수정 전 기준은 `bc8ceb577753268914f892fd2bb6e3960a96c12e`이며 전체 ZIP은 비공개 작업 폴더에 보관합니다.
