import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Create Admin client to bypass RLS for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month'); // YYYY-MM

  if (!month) {
    return NextResponse.json({ error: 'Month is required (YYYY-MM)' }, { status: 400 });
  }

  const startDate = `${month}-01`;
  const [year, monthNum] = month.split('-');
  const endDate = new Date(parseInt(year), parseInt(monthNum), 0).toISOString().split('T')[0];

  // Fetch stays where check_in_date OR check_out_date falls within the month
  const { data, error } = await supabaseAdmin
    .from('stays')
    .select('*')
    .or(`check_in_date.gte.${startDate},check_out_date.gte.${startDate}`)
    .or(`check_in_date.lte.${endDate},check_out_date.lte.${endDate}`);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Creating stay with body:', body);

    // Use admin client for write
    const { data, error } = await supabaseAdmin
      .from('stays')
      .insert(body)
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('Stay created:', data);
    return NextResponse.json(data);
  } catch (e) {
    console.error('Request error:', e);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Stay ID is required' }, { status: 400 });
    }

    // Use admin client for write
    const { data, error } = await supabaseAdmin
      .from('stays')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error('Request error:', e);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    console.log('DELETE request received for stay id:', id);

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Use admin client for delete to bypass RLS
    const { error } = await supabaseAdmin
      .from('stays')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase DELETE error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('Stay deleted successfully:', id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('DELETE Request error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
