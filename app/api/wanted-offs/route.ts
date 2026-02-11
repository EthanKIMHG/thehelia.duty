
import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// GET: Fetch wanted offs for a specific month
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') // YYYY-MM
  const staffId = searchParams.get('staff_id')

  let query = supabase.from('wanted_offs').select('*')

  if (month) {
    const startDate = `${month}-01`
    const endDate = new Date(new Date(month).getFullYear(), new Date(month).getMonth() + 1, 0).toISOString().split('T')[0]
    query = query.gte('wanted_date', startDate).lte('wanted_date', endDate)
  }

  if (staffId) {
    query = query.eq('staff_id', staffId)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST: Add a wanted off date
export async function POST(request: Request) {
  try {
    const { staff_id, date } = await request.json()

    if (!staff_id || !date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check count for this month
    const d = new Date(date)
    const year = d.getFullYear()
    const month = d.getMonth() + 1
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0] // Last day of month

    const { count, error: countError } = await supabase
      .from('wanted_offs')
      .select('*', { count: 'exact', head: true }) // count only
      .eq('staff_id', staff_id)
      .gte('wanted_date', startDate)
      .lte('wanted_date', endDate)

    if (countError) throw countError

    if (count !== null && count >= 2) {
      return NextResponse.json({ error: 'Monthly limit reached (Max 2)' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('wanted_offs')
      .insert({ staff_id, wanted_date: date })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') { // Unique violation
        return NextResponse.json({ error: 'Already requested' }, { status: 400 })
      }
      throw error
    }

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 })
  }
}

// DELETE: Remove a wanted off date
export async function DELETE(request: Request) {
  try {
    const { staff_id, date } = await request.json()

    if (!staff_id || !date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { error } = await supabase
      .from('wanted_offs')
      .delete()
      .eq('staff_id', staff_id)
      .eq('wanted_date', date)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 })
  }
}
