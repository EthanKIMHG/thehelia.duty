# The Helia Duty

더헬리아 산후조리원 내부 운영을 위한 근무표 및 객실 현황 관리 웹 대시보드입니다.

직원 근무표 작성, 희망 휴무 관리, 자동 근무 배정, CSV 가져오기/내보내기, 입퇴실 캘린더, 객실별 산모/신생아 현황, 주간 근무표 공유를 하나의 관리자 화면에서 처리합니다. Next.js App Router와 Supabase 기반으로 로그인, API 라우트, 운영 데이터 CRUD, 모바일/데스크톱 반응형 화면을 구성했습니다.

## Pages

- Login: 관리자 로그인
- Excel: 월별 근무표 편집, 직원별 근무 입력, CSV import/export, 자동 배정
- Staff Register: 직원 등록, 직무/고용 형태/표시 순서 관리
- Calendar: 월별 입실/퇴실 일정 확인
- Room Floor: 객실 도면/목록, 재실/예정 산모, 객실 이동, 입실 정보 관리
- Share Schedule: 주간 근무표 공유 페이지 및 Open Graph 이미지

## Core Features

- 직원 등록, 수정, 삭제, 드래그 정렬
- 정직원/파트타임 기준 월별 근무표 관리
- 희망 휴무 등록 및 월 2회 제한
- 입실 인원 기준 D/E/N 근무 자동 배정
- 객실별 현재/예정 입실 정보와 산모/신생아 상세 관리
- 주간 근무표 링크 생성 및 카카오 공유
- Supabase 기반 관리자 계정, 근무표, 입실 정보, 객실 데이터 관리

## Tech Stack

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui, Radix UI, lucide-react
- TanStack Query
- Supabase
- date-fns, date-holidays
- Kakao JavaScript SDK

## Project Structure

- `app`: App Router pages, dashboard routes, API routes, layout, middleware
- `components`: dashboard shell, schedule/calendar/room views, shared UI components
- `hooks`: toast and embedded webview helpers
- `lib`: Supabase clients, auth/session helpers, API wrapper, auto scheduler, date utilities
- `supabase`: schema and database update SQL
- `docs`: architecture and feature design documents
- `types`: shared TypeScript domain types
- `public`: static assets

## Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SHARE_BASE_URL=
NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY=
```

`NEXT_PUBLIC_SHARE_BASE_URL` and `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY` are used for public schedule sharing and Kakao share integration.

## Getting Started

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000 in your browser.

## Link

Repository: `thehelia.duty`
