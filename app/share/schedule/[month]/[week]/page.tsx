import { WeekScheduleView } from '@/components/share/week-schedule-view'
import { monthToKoreanLabel, normalizeShareMonth, normalizeShareWeek } from '@/lib/share-schedule'
import type { Metadata } from 'next'

type ShareSchedulePageParams = {
  month: string
  week: string
}

type ShareSchedulePageSearchParams = {
  staff_id?: string
}

type ShareSchedulePageProps = {
  params: Promise<ShareSchedulePageParams>
  searchParams: Promise<ShareSchedulePageSearchParams>
}

export const dynamic = 'force-dynamic'

function getPublicBaseUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_SHARE_BASE_URL?.trim()
  if (!fromEnv) return null
  const candidate = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(fromEnv) ? fromEnv : `https://${fromEnv}`
  try {
    return new URL(candidate).origin
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: ShareSchedulePageProps): Promise<Metadata> {
  const resolved = await params
  const month = normalizeShareMonth(resolved.month)
  const week = normalizeShareWeek(resolved.week)
  const monthLabel = monthToKoreanLabel(month)
  const title = `[${monthLabel} ${week}주차] 더헬리아 근무표 업데이트 완료!`
  const description = '최신 근무표가 반영되었습니다. 오래 켜 둔 탭이라면 새로고침 후 확인해주세요.'
  const baseUrl = getPublicBaseUrl()
  const sharePath = `/share/schedule/${month}/${week}`
  const absoluteShareUrl = baseUrl ? `${baseUrl}${sharePath}` : undefined
  const absoluteImageUrl = baseUrl ? `${baseUrl}${sharePath}/opengraph-image` : undefined

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: absoluteShareUrl,
      images: absoluteImageUrl ? [{ url: absoluteImageUrl, width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function ShareSchedulePage({ params, searchParams }: ShareSchedulePageProps) {
  const resolved = await params
  const resolvedSearch = await searchParams
  const month = normalizeShareMonth(resolved.month)
  const week = normalizeShareWeek(resolved.week)
  const staffId = resolvedSearch.staff_id?.trim() || null

  return <WeekScheduleView month={month} week={week} staffId={staffId} />
}
