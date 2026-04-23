import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type StayStatus = 'upcoming' | 'active' | 'completed'

type DashboardStayRow = {
  id: string
  room_number: string
  mother_name: string
  baby_count: number
  baby_names?: string[] | null
  baby_profiles?: Array<{ name?: string | null; gender?: string | null; weight?: number | null }> | null
  gender?: string | null
  baby_weight?: number | null
  birth_hospital?: string | null
  check_in_date: string
  check_out_date: string
  edu_date?: string | null
  notes?: string | null
  status: StayStatus
  base_date: string
  is_today_checkin: boolean
  is_today_checkout: boolean
  is_tomorrow_checkin: boolean
  is_tomorrow_checkout: boolean
  is_census: boolean
}

type StayItem = {
  id: string
  room_number: string
  mother_name: string
  baby_count: number
  baby_names?: string[]
  baby_profiles?: Array<{ name?: string | null; gender?: string | null; weight?: number | null }>
  gender?: string | null
  baby_weight?: number | null
  birth_hospital?: string | null
  check_in_date: string
  check_out_date: string
  edu_date?: string
  notes?: string
  status: StayStatus
}

const toStayItem = (row: DashboardStayRow): StayItem => ({
  id: row.id,
  room_number: row.room_number,
  mother_name: row.mother_name,
  baby_count: row.baby_count,
  baby_names: row.baby_names || [],
  baby_profiles: row.baby_profiles || [],
  gender: row.gender || null,
  baby_weight: row.baby_weight ?? null,
  birth_hospital: row.birth_hospital || null,
  check_in_date: row.check_in_date,
  check_out_date: row.check_out_date,
  edu_date: row.edu_date || undefined,
  notes: row.notes || undefined,
  status: row.status
})

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('v_dashboard_stays_kst')
      .select('*')
      .order('room_number', { ascending: true })
      .order('check_in_date', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rows = (data || []) as DashboardStayRow[]
    const todayKst = rows[0]?.base_date || null

    const todayCheckIns = rows.filter((row) => row.is_today_checkin).map(toStayItem)
    const todayCheckOuts = rows.filter((row) => row.is_today_checkout).map(toStayItem)
    const tomorrowCheckIns = rows.filter((row) => row.is_tomorrow_checkin).map(toStayItem)
    const tomorrowCheckOuts = rows.filter((row) => row.is_tomorrow_checkout).map(toStayItem)
    const census = rows.filter((row) => row.is_census).map(toStayItem)

    const totalNewborns = census.reduce((acc, row) => acc + (row.baby_count || 0), 0)
    const totalMothers = census.length

    return NextResponse.json({
      today_kst: todayKst,
      today_checkins: todayCheckIns,
      today_checkouts: todayCheckOuts,
      tomorrow_checkins: tomorrowCheckIns,
      tomorrow_checkouts: tomorrowCheckOuts,
      census,
      totals: {
        newborns: totalNewborns,
        mothers: totalMothers
      }
    })
  } catch (e) {
    console.error('dashboard-stays error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

