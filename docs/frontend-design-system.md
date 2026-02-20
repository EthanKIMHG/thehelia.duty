# The Helia Frontend Design System

## 0. 목적
이 문서는 `The Helia` 프론트엔드 엔지니어가 동일한 기준으로 UI를 구현/개선하기 위한 실무 기준서다.  
현재 우선순위는 아래 2가지다.

1. 모바일 `엑셀 뷰` 툴바의 가로 오버플로우(버튼 영역이 화면 폭 초과)
2. 사용자 상호작용 피드백 부족(`alert/confirm` 의존, Toast/확인 모달 체계 부재)

모바일 엑셀의 구조 개편(주차 이동, 요약-상세 드릴다운, 직원 상세 시트)은 아래 문서를 기준으로 구현한다.

1. `docs/mobile-excel-ux-system.md`

---

## 1. 제품 UX 원칙
1. 모바일 우선(Mobile First): 정보 우선순위와 조작을 작은 화면 기준으로 먼저 설계한다.
2. 오류 예방: 위험/비가역 액션은 사전 확인 모달을 거친다.
3. 즉시 피드백: 액션 결과는 Toast로 즉시 안내한다.
4. 일관성: 동일 유형 액션은 동일 컴포넌트와 동일 문구 패턴을 사용한다.

---

## 2. 레이아웃 & 반응형 기준
### 2.1 Breakpoint 기준
1. Mobile: `< 768px`
2. Desktop: `>= 768px`

### 2.2 공통 규칙
1. 모바일에서 툴바/버튼 그룹은 기본 `세로 스택`으로 배치한다.
2. 액션 버튼은 모바일에서 `w-full`을 기본으로 한다.
3. 부모/자식 flex 컨테이너에 `min-w-0`을 적용해 텍스트 길이로 인한 폭 팽창을 방지한다.
4. 테이블은 스크롤 허용 가능하나, 툴바/CTA는 가로 스크롤을 금지한다.

---

## 3. 필수 이슈 #1: 모바일 엑셀 툴바 오버플로우
### 3.1 현재 문제 지점
`/Users/ethan/Desktop/thehelia.duty/components/excel-view.tsx`에서 툴바가 `flex` 단일 행으로 배치되어 모바일에서 버튼 3개가 한 줄에 고정된다.

### 3.2 목표 UX
1. 모바일: 월 표시 + 액션 버튼을 세로 구조로 배치.
2. 데스크톱: 기존과 같이 가로 정렬 유지.
3. 어떤 디바이스에서도 수평 스크롤이 발생하지 않아야 한다.

### 3.3 권장 Tailwind 패턴
```tsx
<div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center md:justify-between">
  <div className="shrink-0 text-lg font-bold">{monthLabel}</div>

  <div className="grid min-w-0 w-full grid-cols-1 gap-2 sm:grid-cols-3 md:flex md:w-auto">
    <Button className="h-11 w-full md:h-9 md:w-auto">CSV 내보내기</Button>
    <Button className="h-11 w-full md:h-9 md:w-auto">CSV 가져오기</Button>
    <Button className="h-11 w-full md:h-9 md:w-auto">AI 자동 배치</Button>
  </div>
</div>
```

### 3.4 버튼 텍스트 규칙
1. 모바일에서는 긴 텍스트를 축약한다. 예: `AI 자동 배치` -> `자동 배치`
2. 아이콘은 `shrink-0` 처리한다.
3. 버튼 높이는 모바일 최소 `44px` 이상(`h-11`)으로 통일한다.

---

## 4. 필수 이슈 #2: Toast / 확인 모달 시스템
### 4.1 현재 문제 지점
다수 화면에서 `alert()` / `confirm()` 사용 중이며, 결과 피드백과 사전 확인 UX가 브라우저 기본 UI에 의존한다.

예시 파일:
1. `/Users/ethan/Desktop/thehelia.duty/components/excel-view.tsx`
2. `/Users/ethan/Desktop/thehelia.duty/components/room-view.tsx`
3. `/Users/ethan/Desktop/thehelia.duty/components/stay-form-drawer.tsx`
4. `/Users/ethan/Desktop/thehelia.duty/components/excel-view/schedule-grid.tsx`

### 4.2 시스템 원칙
1. 성공/실패/경고/정보는 `Toast`로 안내한다.
2. 데이터 변경, 대량 처리, 삭제, 되돌리기 어려운 액션은 `확인 모달` 필수.
3. 브라우저 기본 `alert/confirm`은 사용 금지.

### 4.3 Toast 규격
1. `success`: 저장/적용/완료
2. `error`: 실패/네트워크/권한 문제
3. `info`: 진행 시작/조건 안내
4. 표시 시간:
   - success/info: 2~3초
   - error: 4~6초

### 4.4 확인 모달 규격
1. 타이틀: 무엇을 할지 명확히 (`CSV 파일 내보내기`)
2. 본문: 영향 범위/되돌리기 가능 여부 안내
3. CTA:
   - 취소(Secondary)
   - 실행(Primary 또는 Destructive)
4. 포커스 기본값은 `취소` 버튼

### 4.5 이 프로젝트의 필수 확인 모달 대상
1. CSV 내보내기 시작
2. CSV 가져오기 적용(일괄 반영)
3. AI 자동 배치 실행
4. 직원 삭제 / 산모 기록 삭제
5. 객실 이동(특히 swap 발생 가능 액션)

### 4.6 권장 사용자 문구 예시
1. CSV 내보내기 확인:
   - 제목: `CSV 파일을 내보내시겠습니까?`
   - 본문: `현재 월 근무표를 CSV로 다운로드합니다.`
2. 자동배치 확인:
   - 제목: `AI 자동 배치를 실행할까요?`
   - 본문: `이미 입력된 근무는 유지하고 비어 있는 일정만 채웁니다.`
3. 성공 Toast:
   - `자동 배치가 완료되었습니다. 32건 반영`
4. 실패 Toast:
   - `자동 배치 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.`

---

## 5. 구현 표준 (shadcn + Tailwind)
### 5.1 공통 컴포넌트
1. `AppConfirmDialog` (신규): 공통 확인 모달 래퍼
2. `useToast` + `Toaster`: 전역 피드백

### 5.2 전역 마운트 규칙
1. `Toaster`는 앱 루트 레이아웃에 1회만 마운트한다.
2. 페이지/컴포넌트에서는 `useToast`만 호출한다.

### 5.3 액션 플로우 표준
1. 사용자 클릭
2. 확인 모달 노출(필요 시)
3. API 실행
4. 성공/실패 Toast
5. 목록/쿼리 invalidate 및 UI 반영

---

## 6. 접근성 기준
1. 터치 타겟 최소 `44x44px`
2. 버튼/링크 포커스 링 유지(`focus-visible`)
3. 모달 오픈 시 포커스 트랩 동작
4. 모달 닫기: `ESC`, 외부 클릭(필요 정책에 따름), 취소 버튼 제공

---

## 7. QA 체크리스트 (이번 요구사항 전용)
1. `iPhone SE(375px)`에서 엑셀 툴바 수평 스크롤이 없어야 한다.
2. 모바일/데스크톱 모두 `AI 자동 배치` 버튼이 레이아웃을 밀어내지 않아야 한다.
3. `CSV 내보내기` 클릭 시 확인 모달이 먼저 노출되어야 한다.
4. 확인 후 성공/실패 Toast가 반드시 노출되어야 한다.
5. `alert/confirm` 문자열 검색 시 신규 코드에서 0건이어야 한다.

---

## 8. 우선 적용 순서
1. `Toaster` 전역 마운트
2. 엑셀 뷰 툴바 반응형 레이아웃 수정
3. CSV/자동배치/삭제/객실이동 액션에 확인 모달 적용
4. 기존 `alert/confirm` 제거 및 Toast 치환
