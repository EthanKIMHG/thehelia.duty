THE_HELIA_SYSTEM_DESIGN.md (Updated)
1. 프로젝트 개요 (Overview)
프로젝트명: The Helia (프리미엄 산후조리원 통합 관리 시스템)

핵심 목표: * 간호사 근무표와 객실 현황 통합 관리.

인력 배치 최적화: 파트타이머 우선 배치 후 정규직 배치 로직 구현.

케어 가용량 계산: 직종별(간호사 1:6, 조무사 1:4) 신생아 케어 가능 인원 실시간 계산 및 UI 시각화.

2. 기술 스택 (Tech Stack)
Framework: Next.js (App Router)

Language: TypeScript

Database/Auth: Supabase (PostgreSQL + Realtime)

Styling: Tailwind CSS + Shadcn UI

State Management: TanStack Query (React Query)

3. 데이터베이스 및 ERD 설계
3.1 ERD (Entity Relationship Diagram)
코드 스니펫
erDiagram
    STAFF ||--o{ SCHEDULE : "manages"
    ROOM ||--o{ STAY : "houses"
    
    STAFF {
        uuid id PK
        string name
        string job_title "nurse(간호사), assistant(조무사)"
        string employment_type "full-time(정규직), part-time(파트타이머)"
        integer max_capacity "간호사:6, 조무사:4 (자동설정)"
    }

    SCHEDULE {
        uuid id PK
        uuid staff_id FK
        date work_date
        string duty_type "D, E, N, /"
    }

    STAY {
        uuid id PK
        string room_number FK
        integer baby_count
        date check_in_date
        date check_out_date
        string status "upcoming, active, completed"
    }

3.2 SQL Schema (Supabase)
SQL
-- 스태프 테이블
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  role TEXT DEFAULT 'nurse',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 근무 일정 (UNIQUE 제약으로 중복 방지)
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID REFERENCES staff(id),
  work_date DATE NOT NULL,
  duty_type TEXT CHECK (duty_type IN ('D', 'E', 'N', '/')),
  is_ot BOOLEAN DEFAULT false,
  ot_hours NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, work_date)
);

-- 객실 및 입실 현황
CREATE TABLE rooms (
  room_number TEXT PRIMARY KEY,
  room_type TEXT NOT NULL,
  floor INTEGER
);

CREATE TABLE stays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_number TEXT REFERENCES rooms(room_number),
  mother_name TEXT NOT NULL,
  baby_count INTEGER DEFAULT 1,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  edu_date DATE,
  notes TEXT,
  status TEXT DEFAULT 'active',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

3.3 핵심 DB 필드 추가
SQL
ALTER TABLE staff ADD COLUMN job_title TEXT CHECK (job_title IN ('nurse', 'assistant'));
ALTER TABLE staff ADD COLUMN employment_type TEXT CHECK (employment_type IN ('full-time', 'part-time'));
ALTER TABLE staff ADD COLUMN max_capacity INTEGER;

-- 직종에 따른 케어 가능 인원 자동 설정 트리거
CREATE OR REPLACE FUNCTION set_max_capacity() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.job_title = 'nurse' THEN NEW.max_capacity := 6;
  ELSIF NEW.job_title = 'assistant' THEN NEW.max_capacity := 4;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_capacity BEFORE INSERT OR UPDATE ON staff
FOR EACH ROW EXECUTE FUNCTION set_max_capacity();

4. 핵심 비즈니스 로직: 인력 배치 알고리즘
4.1 배치 우선순위 (Priority Placement)
1단계 (Part-timers): 지정된 날짜의 빈자리에 employment_type = 'part-time'인 인원을 먼저 할당.

2단계 (Full-timers): 남은 필수 근무 인원을 employment_type = 'full-time'인 인원으로 충당.

4.2 실시간 인력 충족도 계산 (Staffing Ratio)
공식: Total Capacity = Σ(근무 중인 staff의 max_capacity)

조건: Total Capacity >= Total Baby Count (해당 시점의 실제 신생아 수)

UI 반영: 만약 가용량보다 신생아가 많으면 해당 날짜의 배경을 빨간색으로 경고 표시.

5. UI/UX 요구사항
5.1 스태프 등록 및 관리
간호사 등록 시 '간호사/조무사' 및 '정규직/파트타이머' 선택 필수.

선택과 동시에 '케어 가능 신생아 수'가 UI 상에 표시됨.

5.2 근무표 배치 UI (Smart Scheduling)
배치 가이드: "오늘 신생아는 14명입니다. (필요 케어 용량: 14)" 메시지 노출.

인원 요약 배지: * 현재 가용량: 16 (여유) -> 초록색 배지

현재 가용량: 10 (인원 부족) -> 빨간색 배지

임의 배치 버튼: '파트타이머 우선 자동 배치' 클릭 시 알고리즘에 따라 근무표 자동 프리셋팅.

6. AI 바이브 코딩용 마스터 프롬프트 (Master Prompt)
Context: 너는 3년 차 React 개발자의 파트너야. 조리원 ERP의 '인력 배치 최적화' 기능을 구현해야 해.

Instructions:

Data Model: staff 테이블에 job_title(간호사/조무사)과 employment_type(정규직/파트타이머) 필드를 반영하고, 직종별 max_capacity(6/4) 로직을 적용해줘.

Staffing Logic: 특정 날짜의 stays 테이블에서 active 상태인 총 신생아 수(baby_count 합계)를 계산하는 API를 만들어줘.

Smart Dashboard: > - 근무표 상단에 "실시간 인력 충족 상태" 인디케이터를 제작해.

(근무자들의 max_capacity 합계) vs (현재 신생아 수)를 비교해서 시각화해줘.

Auto-Fill Feature: 파트타이머를 우선순위로 두고 남은 자리에 정규직을 배치하는 '임의 배치' 함수를 작성해.

Validation: 특정 교대 시간(D/E/N)에 케어 가능 인원이 부족하면 UI에 강력한 경고(Red Alert)를 띄워줘.