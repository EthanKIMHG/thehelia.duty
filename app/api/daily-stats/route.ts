import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  try {
    // Query stays table directly for consistent logic (bypassing potentially outdated view)
    const today = new Date().toISOString().split('T')[0]

    // Logic: Count stays where CheckIn <= Today AND CheckOut > Today.
    // This excludes babies checking out today (as they leave at 10am)
    // and includes babies checking in today (as they arrive at 11am).
    // This provides the "Peak/Afternoon Census".
    const { data: stays, error: staysError } = await supabase
      .from('stays')
      .select('baby_count')
      .eq('status', 'active')
      .lte('check_in_date', today)
      .gt('check_out_date', today)

    if (staysError) {
      console.error('Error fetching stays stats:', staysError)
      return NextResponse.json({ error: staysError.message }, { status: 500 })
    }

    const totalNewborns = stays?.reduce((acc, s) => acc + (s.baby_count || 0), 0) || 0
    const totalMothers = stays?.length || 0

    return NextResponse.json({ total_newborns: totalNewborns, total_mothers: totalMothers })

  } catch (e) {
    console.error('Request error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
