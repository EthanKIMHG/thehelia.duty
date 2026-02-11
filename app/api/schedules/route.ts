import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month'); // YYYY-MM

  if (!month) {
    return NextResponse.json({ error: 'Month is required (YYYY-MM)' }, { status: 400 });
  }

  const startDate = `${month}-01`;
  // Calculate end of month
  const [year, monthNum] = month.split('-');
  const endDate = new Date(parseInt(year), parseInt(monthNum), 0).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .gte('work_date', startDate)
    .lte('work_date', endDate);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Expecting an array of schedules or a single object
    const schedules = Array.isArray(body) ? body : [body];

    const { data, error } = await supabase
      .from('schedules')
      .upsert(schedules, { onConflict: 'staff_id, work_date' })
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
