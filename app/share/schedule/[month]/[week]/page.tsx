import type { Metadata } from 'next'

type ShareSchedulePageParams = {
  month: string
  week: string
}

type ShareSchedulePageProps = {
  params: Promise<ShareSchedulePageParams>
}

const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/

function getCurrentMonthKey() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function normalizeMonth(month: string) {
  if (MONTH_REGEX.test(month)) return month
  return getCurrentMonthKey()
}

function normalizeWeek(week: string) {
  const parsed = Number.parseInt(week, 10)
  if (Number.isNaN(parsed)) return 1
  return Math.min(6, Math.max(1, parsed))
}

function monthToKoreanLabel(month: string) {
  const monthNum = Number.parseInt(month.split('-')[1] ?? '1', 10)
  return `${monthNum}월`
}

export async function generateMetadata({ params }: ShareSchedulePageProps): Promise<Metadata> {
  const resolved = await params
  const month = normalizeMonth(resolved.month)
  const week = normalizeWeek(resolved.week)
  const monthLabel = monthToKoreanLabel(month)
  const title = `[${monthLabel} ${week}주차] 더헬리아 근무표 업데이트 완료!`
  const description = '최신 근무표가 반영되었습니다. 오래 켜 둔 탭이라면 새로고침 후 확인해주세요.'

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function ShareSchedulePage({ params }: ShareSchedulePageProps) {
  const resolved = await params
  const month = normalizeMonth(resolved.month)
  const week = normalizeWeek(resolved.week)
  const monthLabel = monthToKoreanLabel(month)

  return (
    <main className="min-h-screen bg-gradient-to-b from-cyan-50 to-white px-6 py-16">
      <section className="mx-auto w-full max-w-xl rounded-3xl border bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.16em] text-slate-500">THE HELIA DUTY</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
          {monthLabel} {week}주차 근무표 업데이트
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-600">
          최신 스케줄이 반영되었습니다.
          <br />
          오래 열어 둔 브라우저 탭이라면 새로고침 후 확인해 주세요.
        </p>
      </section>
    </main>
  )
}
