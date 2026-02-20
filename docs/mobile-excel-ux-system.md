# Mobile Excel UX System v2

## 0. 문서 목적
이 문서는 `The Helia` 모바일 엑셀 뷰를 운영자(관리자) 중심으로 재설계하기 위한 UI/UX 시스템 가이드다.  
Frontend Engineer가 바로 구현할 수 있도록 정보 구조, 컴포넌트, 상태, 인터랙션, 접근성 기준을 정의한다.

---

## 1. 문제 정의 (Current Pain Points)
1. 모바일에서 한 주만 표시되며, 이전 주/다음 주 탐색이 어렵다.
2. 7일 각각이 근무자 리스트까지 한 번에 펼쳐져 정보 밀도가 과도하다.
3. 특정 간호사/직원의 상세 정보(휴무, 주간/월간 일정) 진입 경로가 부족하다.

---

## 2. 목표 UX
1. 관리자가 모바일에서 `지난주 / 이번주 / 다음주`를 빠르게 탐색할 수 있어야 한다.
2. 1차 화면은 `일자 요약`만 보여주고, 탭 시 `상세 인력 리스트`를 확인하는 2단계 구조여야 한다.
3. 상세 화면에서 직원을 탭하면 `직원 프로필 + 휴무/일정 상세`를 확인할 수 있어야 한다.

---

## 3. 정보 구조 (IA)
### 3.1 3-Depth 구조
1. `Week Overview` (기본 화면)
2. `Day Detail Sheet` (일자 상세)
3. `Staff Detail Sheet` (직원 상세)

### 3.2 화면 책임
1. Week Overview:
   - 7일 요약만 노출
   - 부족/적정 상태 빠른 파악
2. Day Detail Sheet:
   - 선택한 날짜의 D/E/N/M 근무자 리스트
   - 부족 인력 원인 파악
3. Staff Detail Sheet:
   - 해당 직원의 오늘/이번주/이번달 근무 통계
   - 휴무(희망휴무 포함) 및 근무 타입 상세

---

## 4. 핵심 사용자 흐름
1. 관리자가 모바일 엑셀 진입
2. 주차 네비게이터로 원하는 주 이동
3. 요약 카드에서 `인력 부족`인 날짜 탭
4. Day Detail Sheet에서 Shift별 배치 확인
5. 특정 직원 탭
6. Staff Detail Sheet에서 휴무/근무 상세 확인

---

## 5. 컴포넌트 시스템
### 5.1 `MobileWeekNavigator`
### 목적
주차 이동과 기준 주(이번주) 복귀.

### UI 요소
1. 좌측: 이전 주 버튼
2. 중앙: `2026.02.16 - 02.22` 범위 라벨
3. 우측: 다음 주 버튼
4. 보조 버튼: `이번주`

### 규격
1. 버튼 높이 `h-11` (44px)
2. 가운데 라벨은 `min-w-0 truncate`
3. 전체 컨테이너 `rounded-xl border bg-card p-2`

### Tailwind 패턴
```tsx
<div className="flex items-center gap-2 rounded-xl border bg-card p-2">
  <Button variant="outline" size="icon" className="h-11 w-11" />
  <div className="min-w-0 flex-1 text-center text-sm font-semibold truncate" />
  <Button variant="outline" size="icon" className="h-11 w-11" />
  <Button variant="ghost" className="h-11 shrink-0 px-3 text-xs">이번주</Button>
</div>
```

---

### 5.2 `WeekDaySummaryList`
### 목적
7일을 한 번에 "요약 정보만" 보여주고, 탭으로 상세 진입.

### 카드당 노출 정보
1. 날짜: `화 2/20`
2. 상태 배지: `적정 | 주의 | 부족`
3. 핵심 수치:
   - 신생아 수
   - 필요 인력(shift 기준)
   - 배치 인력(D/E/N 중 최저 충족 기준)

### 인터랙션
1. 카드 전체 탭 가능 (`button` role)
2. 탭 시 `Day Detail Sheet` 오픈
3. 오늘 날짜는 시각 강조(ring + tone)

### 상태 색상
1. `적정`: 녹색 계열
2. `주의`: 앰버 계열
3. `부족`: 레드 계열

### 성능 원칙
1. 리스트 아이템은 요약 계산만 수행
2. 근무자 상세 데이터 렌더링은 Sheet 오픈 시점에 수행

---

### 5.3 `Day Detail Sheet`
### 목적
선택 날짜의 인력 배치를 Shift 단위로 상세 확인.

### 구조
1. Header:
   - 날짜
   - 상태 배지
   - 닫기 버튼
2. Summary Block:
   - 신생아 / 입실 / 퇴실 / 필요인력
3. Shift Section:
   - `D`, `E`, `N`, `M` 그룹
   - 배치수/필요수
   - 직원 리스트

### 직원 행(Staff Row)
1. 좌: 아바타 + 이름 + 직종
2. 우: 근무 코드 배지 (`D`, `E`, `N`, `M`, `DE`)
3. 탭 시 `Staff Detail Sheet` 오픈

### 빈 상태
1. 배치 없음: `배정된 근무자가 없습니다`
2. 데이터 없음: `이 날짜의 근무 데이터가 없습니다`

---

### 5.4 `Staff Detail Sheet` (모바일 핵심 신규)
### 목적
모바일에서도 직원 단위의 휴무/일정 상세를 즉시 확인.

### 상단 프로필 영역
1. 이름, 직종, 고용형태
2. 월간 요약:
   - 근무일
   - 휴무일
   - OT 합계

### 탭 구조
1. `주간 일정` 탭:
   - 현재 선택 주 7일 근무 코드 타임라인
2. `휴무/희망휴무` 탭:
   - 월 기준 휴무 날짜 리스트
   - 희망휴무는 별도 배지/아이콘
3. `월간 일정` 탭:
   - 달력형 또는 리스트형 간략 보기

### CTA (선택)
1. `희망 휴무 수정` 버튼 (권한/정책 허용 시)
2. `일정 공유` 버튼 (기존 공유 기능 연결)

---

## 6. 데이터/상태 설계
### 6.1 주차 상태
1. `selectedWeekStart: Date`를 모바일 뷰의 단일 기준으로 사용
2. `오늘` 기준 초기화
3. 주 이동 시 `addWeeks/subWeeks`로 변경

### 6.2 조회 범위
현재 주가 월 경계를 넘을 수 있으므로 아래 중 하나를 채택한다.

1. 권장:
   - `from/to` 기반 조회 API 도입 (`/api/schedules?from=YYYY-MM-DD&to=YYYY-MM-DD`)
2. 대안:
   - 현재월 + 인접월 데이터 prefetch 후 클라이언트 merge

### 6.3 파생 데이터
1. `daySummaryMap`: 날짜별 status/newborn/required/assigned 집계
2. `dayStaffMap`: 날짜별 shift별 staff 배열
3. `staffDetailModel`: 선택 직원의 주간/월간/휴무 데이터

---

## 7. 인터랙션 디자인 원칙
1. Progressive Disclosure:
   - 기본은 요약, 상세는 필요할 때만 연다.
2. No Horizontal Cognitive Load:
   - 모바일에서 7일을 가로 확장하지 않고 세로 리스트로 유지.
3. Direct Drill-down:
   - 날짜 -> 직원으로 2번 탭이면 상세 접근 가능.
4. Context Preserve:
   - Sheet를 닫아도 선택한 주/날짜 상태를 유지한다.

---

## 8. 접근성/사용성 기준
1. 모든 탭 가능한 행/카드는 최소 `44px` 높이
2. `button`/`aria-expanded`/`aria-controls` 명시
3. 상태 배지 색상만으로 의미 전달하지 말고 텍스트 포함 (`적정`, `부족`)
4. Sheet 오픈 시 포커스 트랩 + ESC 닫기 지원

---

## 9. 구현 우선순위 (Frontend)
1. `MobileWeekNavigator` 추가 및 주차 상태 관리
2. 기존 `MobileCard` 구조를 `WeekDaySummaryList`로 교체
3. `Day Detail Sheet` 신규 구현
4. `Staff Detail Sheet` 신규 구현 (희망휴무/일정 상세 연결)
5. 월 경계 주차 데이터 처리(API 개선 또는 prefetch)

---

## 10. 수용 기준 (Acceptance Criteria)
1. 모바일에서 지난주/다음주 이동이 가능해야 한다.
2. 기본 화면은 날짜 요약 7개만 보여야 하며, 근무자 리스트는 기본 숨김 상태여야 한다.
3. 날짜 탭 시 해당 날짜의 근무자 리스트가 Sheet로 열려야 한다.
4. 근무자 탭 시 휴무/일정 상세가 포함된 Staff Detail Sheet가 열려야 한다.
5. 월 경계 주차(예: 2월 마지막 주 -> 3월 포함)에서도 데이터 누락 없이 보여야 한다.

---

## 11. 권장 컴포넌트 트리 (예시)
```tsx
<MobileExcelView>
  <MobileWeekNavigator />
  <WeekDaySummaryList onSelectDay={openDaySheet} />

  <DayDetailSheet open={daySheetOpen} day={selectedDay} onSelectStaff={openStaffSheet} />
  <StaffDetailSheet open={staffSheetOpen} staffId={selectedStaffId} weekStart={selectedWeekStart} />
</MobileExcelView>
```
