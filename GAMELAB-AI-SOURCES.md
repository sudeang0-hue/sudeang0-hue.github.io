# 게임랩 05절 근거와 표현 범위

검토일: 2026.10.22. 본문 데이터는 `gamelab-ai-workflow.json`, 배치는 `gamelab-ai.mjs`에서 관리합니다.

## 근거 구분

- 개인 지침: 로컬 `AGENTS.md`와 등록한 Git 커밋 지침, 사용자가 설명한 에이전트 활용 과정. `AGENTS.md`는 Git 제외이므로 전체 파일이나 가짜 공개 링크를 추가하지 않습니다. 공개 본문은 선별한 발췌·요약만 사용합니다.
- 실제 작업·산출물: 고정 팀 통합 커밋의 문서·도구와 실제 브랜치·커밋, 로컬 PNG·JSON 기록을 대조했습니다.
- AI가 브랜치 생성·커밋 초안을 보조했다는 설명은 사용자 진술을 근거로 합니다. Git 기록만으로 실행 주체를 입증하지 않습니다. 독립 CI나 명명 규칙 강제 시스템, 시간 절감률을 주장하지 않습니다.

## 공개 근거

| ID | 확인한 내용 | 직접 근거 |
|---|---|---|
| hudScope | HUD 수정 범위·보존 기록 | [HUD 수정 범위·보존 기록](https://github.com/OZ-GAME-LAB/OZGL2_1/blob/8a4fa074257c1b0e784ce36943e51f82b9805da2/Docs/UI/CombatSkillHud.md#L51) |
| branchRecord | 작업 브랜치·팀 통합 기록 | [작업 브랜치·팀 통합 기록](https://github.com/OZ-GAME-LAB/OZGL2_1/blob/8a4fa074257c1b0e784ce36943e51f82b9805da2/Docs/UI/HeraldrySupplement.md#L5) |
| actualCommit | 실제 커밋 d372aaa | [실제 커밋 d372aaa](https://github.com/OZ-GAME-LAB/OZGL2_1/commit/d372aaa72fd498fdcb78e2ea9f662e9851e872ad) |
| commitScope | 커밋 대상·승인 절차 기록 | [커밋 대상·승인 절차 기록](https://github.com/OZ-GAME-LAB/OZGL2_1/blob/8a4fa074257c1b0e784ce36943e51f82b9805da2/Docs/FontAssetSharing.md#L11) |
| artScript | 리소스 정렬 스크립트 | [리소스 정렬 스크립트](https://github.com/OZ-GAME-LAB/OZGL2_1/blob/8a4fa074257c1b0e784ce36943e51f82b9805da2/Tools/Art/PrepareSkillRosterArt.ps1#L44) |
| rosterGuide | 스킬 화면 조립·확인 절차 | [스킬 화면 조립·확인 절차](https://github.com/OZ-GAME-LAB/OZGL2_1/blob/8a4fa074257c1b0e784ce36943e51f82b9805da2/Docs/UI/SkillRoster_v2.md#L33) |
| rosterBuilder | 대상을 제한한 UI 조립 도구 | [대상을 제한한 UI 조립 도구](https://github.com/OZ-GAME-LAB/OZGL2_1/blob/8a4fa074257c1b0e784ce36943e51f82b9805da2/Assets/00.Project/01.Scripts/Editor/LobbySkillRosterBuilder.cs#L49) |
| validationGuide | 표시 검증 방법·확인 범위 | [표시 검증 방법·확인 범위](https://github.com/OZ-GAME-LAB/OZGL2_1/blob/8a4fa074257c1b0e784ce36943e51f82b9805da2/Docs/UI/HeraldrySupplement.md#L53) |
| validationTool | 임시 Scene 검증·복원 코드 | [임시 Scene 검증·복원 코드](https://github.com/OZ-GAME-LAB/OZGL2_1/blob/8a4fa074257c1b0e784ce36943e51f82b9805da2/Assets/Editor/HeraldrySupplementPreviewValidator.cs#L42) |
| artPrompt | 아트 수정 조건·검수 기록 | [아트 수정 조건·검수 기록](https://github.com/OZ-GAME-LAB/OZGL2_1/blob/4a102b39733ccf71b7cc05c59eb54ebd7709d975/Tools/Art/Sources/BattleCardShells_v2/ExpansionCellArtGeneration.json) |

## 개인 지침 발췌

- 요청한 프로젝트와 작업 범위 안에서 수정하고, 범위 밖 변경은 제안으로 남깁니다.
- 클래스·메서드는 PascalCase, private 필드는 _camelCase 등 정한 네이밍을 따릅니다.
- Runtime과 Editor 코드를 분리하고 Runtime에서 UnityEditor를 참조하지 않습니다.
- Scene·Prefab·Meta를 텍스트로 직접 편집하지 않고, 공유 자산 변경 전 영향과 승인을 확인합니다.
- 기존 변경과 기준 브랜치를 확인하고 작업 유형에 맞는 브랜치 이름을 정합니다.
- 변경 파일·Inspector 참조·검증 결과·추가 확인 항목을 보고합니다.

개인 로컬 작업 지침을 발췌·요약했습니다. 확인 기준 2026.10.22.

## 검증 결과 발췌

- `dist/assets/gamelab-ai-validation-summary.json`은 Git 제외된 로컬 `Preview_1080p/validation.json`에서 필요한 필드만 추출했습니다. 원본 SHA256과 상대 경로를 함께 기록합니다.
- 실제 PNG 30개와 기록의 capturedImageCount=30을 대조했습니다. 30종 테스트나 전투 30회 완주로 표현하지 않습니다.
- 두 출력 크기의 캡처 수와 실제 배치 해상도를 구분합니다. 다른 Play Mode 17개 검사나 HUD 자동 입력 12개를 합산하지 않습니다.
- 파일의 sourceSHA256은 출처 대조용이며 원본 전체가 공개 저장소에 있다는 의미가 아닙니다.

## 보존·이동

- 홈페이지의 05 AI 아트 제작을 새 본문으로 교체하며 기존 `#ai` 앵커를 유지합니다.
- 기존 L형 아트 비교는 하단 보조 사례로 유지합니다.
- Notion의 02절 아트 토글과 추가 구현의 AI 협업 토글은 새 05절로 통합합니다. 다른 구현 사례와 미디어를 보존합니다.

## 수정 전 백업

- 사이트 기준: `55c0eaa08cba8870f2025ef064a89c0188e232c5`. 전체 ZIP과 Notion 원문은 비공개 작업 폴더에 보관합니다.
- Notion 전체 비공개 백업과 원문을 별도로 보관합니다. 링크는 사용자 완료 안내와 비공개 작업 기록에 남깁니다.
- 사이트 공개 후에는 해당 변경 커밋만 승인 후 revert하고 다시 배포합니다. Notion은 백업의 02절 아트 토글·AI 협업 토글을 원래 위치에 복원하고 새 05절을 제거해 되돌릴 수 있습니다.

## 채용 검토에 따른 본문 정리 — 2026.10.22
- 직접 정한 범위, Git 반영 검토, 디자인 선택, 검사 결과 확인을 기본 본문에서 읽도록 축약했습니다.
- 실제 지침·커밋·도구·검증 기록과 출처는 각 단계의 접기에 보존합니다. 표시 검사와 전체 플레이·빌드 검증의 구분은 접기 밖에도 표시합니다.
- 새로운 성과 수치나 AI 실행 주체를 입증하는 주장을 추가하지 않았습니다. 과거 검증 JSON 발췌는 변경하지 않습니다.
- 문장 정리 전 사이트 기준: `e277937b6e9deb39f55768690895a3a8128ac0dd`. 별도 전체 소스 백업과 Notion 비공개 백업을 보관합니다.

## TaskTown과 설명 구분 — 2026.10.22

- 게임랩의 기본 본문은 작업 지침·Git 준비·반복 처리·표시 기록에 집중합니다. HUD 수정 범위는 첫 근거 접기에 보존합니다.
- TaskTown에는 팀 기능 연결·동시 Scene 작업을 고려한 코드 변경·사운드 리뷰 경험을 배치합니다.
- 기존 출처·실제 커밋·처리 수치·검증 JSON은 변경하지 않았습니다. 새 자동화 성과나 전체 검증 완료를 주장하지 않습니다.
- 수정 전 기준: `4f0a9a9a3be550bc23fa0f952601cc3bda0a971d`. 전체 사이트와 Notion 두 페이지를 비공개로 백업했습니다.
