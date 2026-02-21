import { ImageResponse } from 'next/og'

type ShareOgParams = {
  month: string
  week: string
}

type ShareOgProps = {
  params: Promise<ShareOgParams>
}

export const runtime = 'edge'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

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

export default async function Image({ params }: ShareOgProps) {
  const resolved = await params
  const month = normalizeMonth(resolved.month)
  const week = normalizeWeek(resolved.week)
  const monthLabel = monthToKoreanLabel(month)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '56px 64px',
          background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdfa 100%)',
          color: '#0f172a',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: '#475569',
          }}
        >
          THE HELIA DUTY
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', fontSize: 70, fontWeight: 900, lineHeight: 1.1 }}>
            [{monthLabel} {week}주차] 더헬리아 근무표 업데이트 완료!
          </div>
          <div style={{ display: 'flex', fontSize: 34, fontWeight: 600, color: '#334155' }}>
            최신 스케줄이 반영되었습니다.
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: 24, color: '#64748b' }}>새로고침 후 최신 근무표를 확인하세요.</div>
      </div>
    ),
    {
      ...size,
    },
  )
}
