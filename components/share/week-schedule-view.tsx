'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { useEffect } from 'react'

type ShiftGroupItem = {
  staffId: string
  name: string
  jobTitle: 'nurse' | 'assistant'
  employmentType: 'full-time' | 'part-time'
  dutyCode: string
}

type ShareDayItem = {
  date: string
  dateLabel: string
  dayLabel: string
  isToday: boolean
  groups: Record<'D' | 'E' | 'N' | 'M' | 'DE' | 'OFF', ShiftGroupItem[]>
  staffEntries: Array<{
    staffId: string
    name: string
    dutyCode: string
    shiftType: 'D' | 'E' | 'N' | 'M' | 'DE' | '/'
  }>
}

type ShareWeekResponse = {
  month: string
  week: number
  weekStart: string
  weekEnd: string
  staffId: string | null
  staffCount: number
  staff: Array<{
    id: string
    name: string
    jobTitle: 'nurse' | 'assistant'
    employmentType: 'full-time' | 'part-time'
  }>
  days: ShareDayItem[]
  generatedAt: string
}

type WeekScheduleViewProps = {
  month: string
  week: number
  staffId?: string | null
}

const SHIFT_META: Record<'D' | 'E' | 'N' | 'M' | 'DE' | 'OFF', { label: string; className: string }> = {
  D: { label: '데이', className: 'bg-amber-100 text-amber-900 border-amber-200' },
  E: { label: '이브닝', className: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
  N: { label: '나이트', className: 'bg-blue-100 text-blue-900 border-blue-200' },
  M: { label: '미들', className: 'bg-violet-100 text-violet-900 border-violet-200' },
  DE: { label: 'DE', className: 'bg-indigo-100 text-indigo-900 border-indigo-200' },
  OFF: { label: '휴무', className: 'bg-slate-100 text-slate-700 border-slate-200' },
}

const SHIFT_LABEL: Record<'D' | 'E' | 'N' | 'M' | 'DE' | '/', string> = {
  D: '데이',
  E: '이브닝',
  N: '나이트',
  M: '미들',
  DE: 'DE',
  '/': '휴무',
}

function formatSyncTime(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function monthToLabel(month: string) {
  const monthNum = Number.parseInt(month.split('-')[1] ?? '1', 10)
  return `${monthNum}월`
}

async function fetchWeekSchedule({ month, week, staffId }: WeekScheduleViewProps): Promise<ShareWeekResponse> {
  const query = new URLSearchParams({
    month,
    week: String(week),
  })

  if (staffId) {
    query.set('staff_id', staffId)
  }

  const res = await fetch(`/api/share/schedule?${query.toString()}`, {
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error || '공유 근무표를 불러오지 못했습니다.')
  }

  return res.json()
}

export function WeekScheduleView({ month, week, staffId }: WeekScheduleViewProps) {
  const query = useQuery({
    queryKey: ['share-week-schedule', month, week, staffId ?? 'all'],
    queryFn: () => fetchWeekSchedule({ month, week, staffId }),
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })
  const refetch = query.refetch

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        refetch()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refetch])

  const data = query.data
  const isSingleStaff = Boolean(data && data.staff.length === 1)
  const singleStaff = isSingleStaff ? data?.staff[0] : null
  const shouldShowGroupView = Boolean(data && !data.staffId && data.staff.length > 1)
  const title = isSingleStaff && singleStaff
    ? `${singleStaff.name} 선생님 근무표`
    : '주간 근무표'

  if (query.isPending) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
        <div className="animate-pulse space-y-3">
          <div className="h-24 rounded-2xl bg-slate-200" />
          <div className="h-40 rounded-2xl bg-slate-100" />
          <div className="h-40 rounded-2xl bg-slate-100" />
        </div>
      </main>
    )
  }

  if (query.isError || !data) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900">
          <h1 className="text-2xl font-black">근무표를 불러오지 못했습니다</h1>
          <p className="mt-2 text-base">{query.error instanceof Error ? query.error.message : '잠시 후 다시 시도해 주세요.'}</p>
          <Button
            type="button"
            className="mt-4 h-12 px-5 text-base font-bold"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
          >
            {query.isFetching ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            다시 불러오기
          </Button>
        </section>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-4xl space-y-4 px-4 py-5 sm:px-6 sm:py-8">
      <section className="rounded-3xl border-2 border-sky-200 bg-gradient-to-b from-sky-50 to-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-extrabold tracking-[0.14em] text-slate-500">THE HELIA DUTY</p>
        <h1 className="mt-2 text-3xl font-black leading-tight text-slate-900 sm:text-4xl">
          {monthToLabel(data.month)} {data.week}주차 {title}
        </h1>
        <p className="mt-2 text-base font-semibold text-slate-700">
          {data.weekStart} ~ {data.weekEnd}
        </p>
        <p className="mt-1 text-sm text-slate-600">화면으로 다시 돌아오면 최신 근무표로 자동 갱신됩니다.</p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            className="h-12 rounded-xl px-5 text-base font-bold"
          >
            {query.isFetching ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            지금 새로고침
          </Button>
          <span className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-700">
            최근 동기화: {formatSyncTime(data.generatedAt)}
          </span>
        </div>
      </section>

      {data.staffCount === 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
          <p className="text-xl font-black">표시할 근무표가 없습니다</p>
          <p className="mt-2 text-base font-semibold">링크가 오래되었거나 잘못된 직원 링크일 수 있습니다.</p>
        </section>
      ) : null}

      {isSingleStaff && singleStaff ? (
        <section className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
          <p className="text-lg font-black text-slate-900">{singleStaff.name} 선생님 이번 주 한눈에 보기</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-7">
            {data.days.map((day) => {
              const entry = day.staffEntries[0]
              const shiftType = entry?.shiftType ?? '/'
              return (
                <div key={day.date} className="rounded-xl border bg-slate-50 p-3">
                  <p className="text-sm font-bold text-slate-700">
                    {day.dateLabel} ({day.dayLabel})
                  </p>
                  <p className={cn('mt-2 rounded-lg border px-2 py-1 text-center text-lg font-black', shiftBadgeClass(shiftType))}>
                    {entry?.dutyCode || '/'}
                  </p>
                  <p className="mt-1 text-center text-sm font-semibold text-slate-700">{SHIFT_LABEL[shiftType]}</p>
                </div>
              )
            })}
          </div>
        </section>
      ) : null}

      {shouldShowGroupView ? (
        <div className="space-y-3">
          {data.days.map((day) => (
            <section key={day.date} className={cn('rounded-2xl border bg-white p-4 shadow-sm sm:p-5', day.isToday && 'border-blue-300 ring-2 ring-blue-100')}>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-2xl font-black text-slate-900">
                  {day.dateLabel} ({day.dayLabel})
                </p>
                {day.isToday ? <span className="rounded-md bg-blue-100 px-2 py-1 text-sm font-bold text-blue-900">오늘</span> : null}
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {(['D', 'E', 'N', 'M', 'DE'] as const).map((shiftType) => {
                  const members = day.groups[shiftType]
                  return (
                    <article key={shiftType} className={cn('rounded-xl border p-3', SHIFT_META[shiftType].className)}>
                      <div className="flex items-center justify-between">
                        <p className="text-lg font-black">{SHIFT_META[shiftType].label}</p>
                        <p className="text-base font-extrabold">{members.length}명</p>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {members.length > 0 ? (
                          members.map((member) => (
                            <span key={member.staffId} className="rounded-lg bg-white/80 px-2 py-1 text-sm font-bold">
                              {member.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm font-semibold opacity-80">배정 없음</span>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>

              <p className="mt-3 text-sm font-semibold text-slate-600">휴무: {day.groups.OFF.length}명</p>
            </section>
          ))}
        </div>
      ) : null}
    </main>
  )
}

function shiftBadgeClass(type: 'D' | 'E' | 'N' | 'M' | 'DE' | '/') {
  if (type === 'D') return 'bg-amber-100 text-amber-900 border-amber-200'
  if (type === 'E') return 'bg-emerald-100 text-emerald-900 border-emerald-200'
  if (type === 'N') return 'bg-blue-100 text-blue-900 border-blue-200'
  if (type === 'M') return 'bg-violet-100 text-violet-900 border-violet-200'
  if (type === 'DE') return 'bg-indigo-100 text-indigo-900 border-indigo-200'
  return 'bg-slate-100 text-slate-700 border-slate-200'
}
