# The Helia Room Floorplan Design System (Frontend Handoff)

## 0. 목적
이 문서는 `/Users/ethan/Desktop/thehelia.duty/docs/room-floorplan-ui-ux-spec.md`를 구현 가능한 디자인 시스템 형태로 정리한 Frontend Engineer 전달 문서다.

핵심 목표:
1. 기존 `RoomView` 기능(상세 편집, 드래그 이동/스왑, 필터, 통계, 히스토리)을 유지한다.
2. 객실 뷰를 단순 카드 그리드에서 `평면도형 레이아웃`으로 전환한다.
3. 5F/6F의 중앙 공용공간 인지를 강화한다.

---

## 1. 적용 범위
### 포함
1. 객실 평면도 레이아웃 시스템
2. 객실 노드/공용공간 노드 컴포넌트 규격
3. 상태/색상/아이콘 규칙
4. 층 전환/필터/범례 컴포넌트 규칙
5. 반응형 동작(Desktop/Tablet/Mobile)

### 제외
1. DB 스키마 변경
2. 기존 `StayFormDrawer` 내부 폼 로직 변경
3. 스케줄러(엑셀/캘린더) 구조 변경

---

## 2. 정보 구조 (IA)
1. Header Zone:
   - 오늘 요약 카드(입실/퇴실/신생아/산모)
   - 필터 칩(`전체`, `Prestige`, `VIP`, `VVIP`, `퇴실임박`)
   - 층 전환(`5F`, `6F`)
2. Floorplan Zone:
   - 선택 층 평면도 보드
   - 객실 노드(상호작용 가능)
   - 공용공간 노드(정보성)
   - 코어(계단/엘리베이터/복도) 시각 요소
3. Support Zone:
   - 상태 범례
   - 드래그 안내 메시지(모바일 비활성 안내 포함)

---

## 3. 레이아웃 시스템
### 3.1 공통 원칙
1. 실측 재현이 아닌 `상대 위치 인지`가 목적이다.
2. 객실 카드는 모두 동일 크기다.
3. 결번(`504`, `604`)은 노드로 렌더링하지 않는다.
4. 여백/복도/공용공간을 활용해 결번이 자연스럽게 보이지 않게 한다.

### 3.2 Floor Template
평면도 보드는 아래 3개 레이어로 구성한다.
1. `Top Room Line`
2. `Central Shared/Core Area`
3. `Bottom Room Line`

### 권장 컨테이너
```tsx
<section className="rounded-2xl border bg-[hsl(var(--surface))] p-4 md:p-6">
  <div className="grid gap-4 md:gap-6">
    <TopRoomLine />
    <CoreArea />
    <BottomRoomLine />
  </div>
</section>
```

---

## 4. 층별 배치 규칙
### 4.1 5F
1. 중심 공용공간: `신생아실` 노드(우선순위 가장 높음)
2. 객실 라인은 5xx 상대 순서를 유지해 배치한다.
3. 코어(계단/엘리베이터/복도)는 중앙 좌측~중앙부 인지 구조로 고정한다.

### 4.2 6F
1. 중심 공용공간: `다용도실`, `에스테틱`, `스파` 3분할 블록
2. 객실 라인은 6xx 상대 순서를 유지한다.
3. 코어 구조는 5F와 유사하게 맞춘다(층 전환 시 인지 일관성).

---

## 5. 객실 타입/번호 규칙 (고정)
1. `Prestige`: `501`, `502`
2. `VVIP`: `607` ~ `611`
3. 그 외: `VIP`
4. 결번: `504`, `604` 제외

UI 매핑:
1. 타입 배지는 항상 노출한다.
2. 타입 컬러는 즉시 구분되되 상태 배지보다 시각 우선순위가 낮아야 한다.

---

## 6. 컴포넌트 디자인 시스템
### 6.1 `RoomFloorplanBoard`
역할:
1. 층별 레이아웃 구조 렌더
2. RoomNode/SharedSpaceNode 배치
3. Drag & Drop overlay 컨트롤

Props(권장):
1. `floor: '5F' | '6F'`
2. `rooms: Room[]`
3. `onRoomClick(roomNumber)`
4. `onRoomDragStart/onRoomDrop/onRoomDragOver/onRoomDragEnd`
5. `isFinePointerDevice`

### 6.2 `RoomNode`
필수 정보:
1. 객실 번호
2. 상태 배지(입실중/비어있음/퇴실임박)
3. 산모명(입실중일 때)
4. 보조 정보(신생아수, 다음 입실)

상태 우선순위:
1. D-Day/D-1 (red) > D-2 (yellow) > 입실중 > 비어있음

크기:
1. `w-full min-h-[136px] md:min-h-[148px]`
2. 내부 텍스트는 `truncate`/`line-clamp` 적용

인터랙션:
1. Click -> `StayFormDrawer` 오픈
2. Desktop drag -> 이동/스왑
3. Keyboard -> `tabIndex=0`, Enter/Space 활성화

### 6.3 `SharedSpaceNode`
대상:
1. 5F: 신생아실
2. 6F: 다용도실/에스테틱/스파

규칙:
1. 클릭 편집 액션 없음
2. Tooltip/Popover만 허용
3. RoomNode보다 낮은 대비/약한 테두리 사용

### 6.4 `CoreNode`
대상:
1. 계단
2. 엘리베이터
3. 복도

규칙:
1. purely informational
2. 시각적 앵커 역할만 수행

### 6.5 `FloorSwitch`
1. Segmented control 형태(`5F`, `6F`)
2. active floor는 채움 배경 + 굵은 폰트
3. 비활성 floor는 outline 톤

### 6.6 `RoomStatusLegend`
항목:
1. 입실중
2. 비어있음
3. 퇴실임박 D-2
4. 퇴실임박 D-1/D-Day
5. 입실예정

---

## 7. 시각 토큰 시스템
### 7.1 Semantic Tokens
```css
--fp-bg
--fp-surface
--fp-border
--fp-core

--room-occupied-bg
--room-occupied-border
--room-empty-bg
--room-empty-border
--room-upcoming-bg
--room-upcoming-border
--room-checkout-yellow-bg
--room-checkout-yellow-border
--room-checkout-red-bg
--room-checkout-red-border
```

### 7.2 상태 표현 규칙
1. 색상 + 아이콘 + 라벨을 같이 사용한다.
2. 색상만으로 상태를 구분하지 않는다.
3. 위험 상태(D-1/D-Day)는 배경보다 테두리/배지 대비를 우선 강화한다.

---

## 8. 반응형 가이드
### 8.1 Desktop (>=1024px)
1. 평면도 기본 노출
2. 드래그 이동 활성
3. 범례와 안내를 동시에 노출

### 8.2 Tablet (768~1023px)
1. 평면도 유지
2. 카드 내부 정보를 1줄 축약
3. 밀집 구간은 spacing 축소

### 8.3 Mobile (<768px)
1. `리스트 우선` + `평면도 보조` 구조
2. 평면도는 별도 탭 또는 접기/펼치기 섹션
3. 드래그 이동 비활성
4. 탭으로 상세 시트 오픈은 동일

---

## 9. 상태 머신/인터랙션
### 9.1 RoomNode state
1. `default`
2. `hover` (desktop only)
3. `focus-visible`
4. `drag-source`
5. `drag-over-target`
6. `disabled` (moving during mutation)

### 9.2 Drag/Swap UX
1. 드래그 시작 시 source 노드 반투명 처리
2. drop target은 ring 강조
3. drop 후 스왑 여부에 따라 확인 다이얼로그
4. 완료/실패 피드백은 Toast 사용

---

## 10. 접근성 기준
1. 클릭 가능 노드 최소 터치영역 `44x44`
2. 키보드 순서: 상단 컨트롤 -> 평면도 노드 -> 범례
3. 포커스 링은 모든 인터랙티브 노드에 필수
4. 상태 배지는 스크린리더용 텍스트 제공

권장 속성:
1. `aria-label="501호 객실, 입실중, 산모 홍길동"`
2. `aria-describedby`로 보조정보 연결

---

## 11. 구현 연동 (현재 코드 기준)
참조 파일:
1. `/Users/ethan/Desktop/thehelia.duty/components/room-view.tsx`
2. `/Users/ethan/Desktop/thehelia.duty/components/stay-form-drawer.tsx`

유지해야 하는 액션:
1. `onRoomClick` -> 기존 Drawer open
2. `roomTransferMutation` -> 기존 API 흐름 유지
3. `filter`, `today stats`, `history tab` 유지

데이터 키:
1. `room_number`, `room_type`, `status`, `checkOutDday`, `upcoming_stays`
2. 층 분기: `room_number.startsWith('5'|'6')`

---

## 12. 개발 우선순위
1. `RoomFloorplanBoard` 뼈대 도입(5F/6F 템플릿)
2. `RoomNode`를 기존 `RoomCard` 기반으로 교체
3. `SharedSpaceNode/CoreNode` 추가
4. 층 전환 + 범례 + 안내 정리
5. 모바일 리스트 우선 모드 추가
6. QA(드래그/상세/필터 회귀 테스트)

---

## 13. QA 체크리스트
1. 5F/6F 전환 시 노드 위치 체계가 일관적인가
2. 결번 504/604가 렌더링되지 않는가
3. 객실 카드 크기가 모두 동일한가
4. 클릭 시 기존 Drawer가 정상 동작하는가
5. Desktop에서만 드래그/스왑이 가능한가
6. Mobile에서 리스트 우선 UI가 적용되는가
7. 상태 라벨/아이콘/색상이 모두 일치하는가
