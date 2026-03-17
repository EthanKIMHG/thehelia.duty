# 객실현황 평면도 UX 핸드오프 문서 (AI Agent 전달용)

## 1) 목적
- 이 문서는 `객실현황(room view)` 평면도 UX의 현재 확정 상태를 AI 에이전트에게 정확히 전달하기 위한 기준 문서다.
- 이후 수정 시, 본 문서의 배치/크기/정렬 규칙을 우선 준수한다.

## 2) 적용 범위
- 대상 화면: `객실현황`의 `5F/6F 평면도`.
- 대상 컴포넌트:
  - `components/room-floorplan/constants.ts`
  - `components/room-floorplan/organisms/room-floorplan-board.tsx`
  - `components/room-floorplan/molecules/room-node.tsx`
  - `components/room-floorplan/molecules/shared-space-node.tsx`

## 3) 핵심 UX 원칙
- 객실 카드는 크게 유지한다. 축소 금지.
- 평면도는 가로 라인 방식이 아니라 좌/우 세로 라인 방식으로 배치한다.
- 중앙 공용공간은 시각적 중심 영역으로 두고, `bento` 구조로 구성한다.
- 텍스트가 잘리지 않도록 공용공간 설명은 줄바꿈 허용한다.

## 4) 확정 배치 규칙

### 4.1 5층 (5F)
- 중앙: `신생아실 1`, `신생아실 2` (세로 1열 정렬)
- 왼쪽 세로 라인: `502` -> `501` -> `사무실`
- 오른쪽 세로 라인: `508` -> `507` -> `506` -> `505` -> `503`
- 결번: `504` 제외

### 4.2 6층 (6F)
- 중앙: `다용도실`, `에스테틱`, `스파` (세로 1열, 동일 카드 크기)
- 왼쪽 세로 라인: `606` -> `605` -> `603` -> `602` -> `601`
- 오른쪽 세로 라인: `611` -> `610` -> `609` -> `608` -> `607`
- 결번: `604` 제외

## 5) 현재 구현 값 (중요)

### 5.1 객실 카드 크기 고정
- `room-floorplan-board.tsx`의 `roomSlotClass`:
  - `w-[260px] min-w-[260px]`
  - `md:w-[300px] md:min-w-[300px]`
  - `aspect-square min-h-[260px] md:min-h-[300px]`
- 위 크기는 객실, 빈 슬롯, 사무실 슬롯에 동일 적용한다.

### 5.2 중앙 공용영역
- 중앙 컨테이너:
  - `xl:min-h-[860px]`
  - 내부 여백: `p-4 md:p-6`
- 중앙 공용카드는 `bentoTileClass` 래퍼 안에 배치:
  - `rounded-2xl`
  - `bg-[linear-gradient(...)]`
  - `p-2 md:p-3`
- `bento` 래퍼는 border 없음 (이중 border 방지).

### 5.3 공용시설 카드 크기
- 5F 신생아실 카드:
  - `min-h-[340px] md:min-h-[400px]`
- 6F 공용시설 카드:
  - `다용도실`, `에스테틱`, `스파` 모두
  - `min-h-[260px] md:min-h-[300px]` (동일)

### 5.4 정렬 규칙
- 좌/우 객실 라인: `xl:self-start`로 상단 기준 시작.
- 특히 5F 왼쪽 `502-501-사무실` 라인은 상단부터 나열.
- 전체 3열 구조:
  - 좌: 객실 세로 라인
  - 중: 공용공간 bento
  - 우: 객실 세로 라인

## 6) 텍스트/가독성 규칙
- `shared-space-node.tsx` 설명 텍스트는 자르지 않는다.
- 금지:
  - `max-h` + `overflow-hidden`으로 설명 텍스트를 강제 절단

## 7) 코드 기준점
- 층별 슬롯 데이터: `constants.ts`
  - `OFFICE_SLOT`
  - `FLOORPLAN_LAYOUT.leftLine/rightLine`
- 레이아웃 렌더링 및 bento 구성: `room-floorplan-board.tsx`
- 객실 카드 기본 UI: `room-node.tsx`
- 공용시설 카드 UI: `shared-space-node.tsx`

## 8) 향후 확장 가이드 (다음 AI 에이전트 작업용)
- 목표: 공용공간(신생아실/다용도실/에스테틱/스파)에 어떤 산모가 있는지 추적 정보 표시.
- 권장 방향:
  - 공용공간 카드 내부에 `산모 리스트/카운트/상태` 섹션 추가
  - 모바일에서는 카드 내부 정보 밀도를 줄이고, 상세는 Sheet/Tooltip로 분리
  - 객실 카드 크기(`260/300`)는 유지하고 중앙 공용영역 내부만 확장

## 9) 변경 시 금지사항
- 객실 카드 크기를 임의 축소하지 말 것.
- 5F/6F 확정 배치 순서를 변경하지 말 것.
- 결번(`504`, `604`)을 슬롯에 되살리지 말 것.
- 공용공간 카드 이중 border를 재도입하지 말 것.
