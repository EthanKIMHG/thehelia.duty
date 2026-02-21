import { normalizeShareMonth, normalizeShareWeek, resolveShareWeekRange } from '@/lib/share-schedule'
import { parseShift } from '@/lib/shift-utils'
import type { Staff } from '@/types'
import { createClient } from '@supabase/supabase-js'
import { eachDayOfInterval, format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
)

type StaffShareRow = Pick<Staff, 'id' | 'name' | 'job_title' | 'employment_type' | 'display_order'>
type ScheduleShareRow = {
  staff_id: string
  work_date: string
  duty_type: string
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const month = normalizeShareMonth(searchParams.get('month'))
  const week = normalizeShareWeek(searchParams.get('week'))
  const staffId = searchParams.get('staff_id')?.trim() || null
  const { weekStart, weekEnd, weekNumber } = resolveShareWeekRange(month, week)
  const startDate = format(weekStart, 'yyyy-MM-dd')
  const endDate = format(weekEnd, 'yyyy-MM-dd')

  let staffQuery = supabaseAdmin
    .from('staff')
    .select('id,name,job_title,employment_type,display_order')
    .order('display_order', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true })

  if (staffId) {
    staffQuery = staffQuery.eq('id', staffId)
  }

  let staffResult = await staffQuery
  if (staffResult.error?.message.includes('display_order')) {
    let fallback = supabaseAdmin
      .from('staff')
      .select('id,name,job_title,employment_type,display_order')
      .order('name', { ascending: true })

    if (staffId) {
      fallback = fallback.eq('id', staffId)
    }

    staffResult = await fallback
  }

  if (staffResult.error) {
    return NextResponse.json({ error: staffResult.error.message }, { status: 500 })
  }

  const staffRows = (staffResult.data || []) as StaffShareRow[]
  const staffIds = staffRows.map((staff) => staff.id)

  const scheduleMap = new Map<string, string>()
  if (staffIds.length > 0) {
    const { data, error } = await supabaseAdmin
      .from('schedules')
      .select('staff_id,work_date,duty_type')
      .in('staff_id', staffIds)
      .gte('work_date', startDate)
      .lte('work_date', endDate)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    ;((data || []) as ScheduleShareRow[]).forEach((row) => {
      scheduleMap.set(`${row.staff_id}|${row.work_date}`, row.duty_type || '/')
    })
  }

  const days = eachDayOfInterval({ start: weekStart, end: weekEnd }).map((date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const groups: Record<'D' | 'E' | 'N' | 'M' | 'DE' | 'OFF', Array<{
      staffId: string
      name: string
      jobTitle: Staff['job_title']
      employmentType: Staff['employment_type']
      dutyCode: string
    }>> = {
      D: [],
      E: [],
      N: [],
      M: [],
      DE: [],
      OFF: [],
    }

    const staffEntries = staffRows.map((staff) => {
      const dutyCode = scheduleMap.get(`${staff.id}|${dateStr}`) || '/'
      const parsed = parseShift(dutyCode)
      const item = {
        staffId: staff.id,
        name: staff.name,
        jobTitle: staff.job_title,
        employmentType: staff.employment_type,
        dutyCode: parsed.original || dutyCode || '/',
      }

      if (parsed.type === 'D') groups.D.push(item)
      else if (parsed.type === 'E') groups.E.push(item)
      else if (parsed.type === 'N') groups.N.push(item)
      else if (parsed.type === 'M') groups.M.push(item)
      else if (parsed.type === 'DE') groups.DE.push(item)
      else groups.OFF.push(item)

      return {
        staffId: staff.id,
        name: staff.name,
        dutyCode: item.dutyCode,
        shiftType: parsed.type,
      }
    })

    return {
      date: dateStr,
      dateLabel: format(date, 'M월 d일'),
      dayLabel: format(date, 'EEE', { locale: ko }),
      isToday: format(new Date(), 'yyyy-MM-dd') === dateStr,
      groups,
      staffEntries,
    }
  })

  return NextResponse.json({
    month,
    week: weekNumber,
    weekStart: startDate,
    weekEnd: endDate,
    staffId,
    staffCount: staffRows.length,
    staff: staffRows.map((staff) => ({
      id: staff.id,
      name: staff.name,
      jobTitle: staff.job_title,
      employmentType: staff.employment_type,
    })),
    days,
    generatedAt: new Date().toISOString(),
  })
}
