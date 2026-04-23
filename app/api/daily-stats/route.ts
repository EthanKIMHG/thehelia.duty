import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('v_dashboard_stats_kst')
      .select('total_newborns, total_mothers')
      .single()

    if (error) {
      console.error('Error fetching dashboard stats:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      total_newborns: data?.total_newborns ?? 0,
      total_mothers: data?.total_mothers ?? 0
    })

  } catch (e) {
    console.error('Request error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
