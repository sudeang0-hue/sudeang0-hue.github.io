# 게임랩 UI 리디자인 사례 편집 안내

## 범위

`generate.mjs`의 `game1`은 리디자인 배경 → 로비 전후 → 마감 오류 두 사례 → 전장 보기 → 담당·검증 범위 순서입니다. 다른 사례와 공통 메뉴는 유지합니다.

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

로비 전후는 기존 `gamelab-lobby-before.png`, `gamelab-lobby-after.png`를 유지합니다. 적용 후 이미지는 10월 5일 구현 검토이며 난이도·계정 레벨이 다릅니다. 보상 두 장은 오류 수정 전후가 아니라 **개선 후 기능의 서로 다른 상태**입니다.

표시 검증용 상태를 구성한 장면을 자연 발생 업적·최종 플레이어 빌드 촬영으로 표현하지 않습니다. 기존 문서의 검사 횟수는 당시 기록이며 이번 사이트 편집에서 Unity 검사를 새로 실행한 것은 아닙니다.

## 수정 전 상태와 되돌리기

이번 편집 전 사이트 기준 커밋은 `0c0b8bb8ba8d54d42ff1a397b11ac3dfe520510f`입니다. 전체 소스 ZIP 및 변경 전 파일 사본은 별도 비공개 작업 폴더에 보관합니다. 백업과 원본 검증 기록은 공개 저장소에 추가하지 않습니다.

공개 후 되돌릴 때는 이번 사이트 변경 커밋만 `git revert <해당 커밋>`으로 취소하는 새 커밋을 만들어 검토 후 올리면 자동 배포됩니다. 이후 다른 작업을 덮어쓰는 전체 초기화는 사용하지 않습니다.
