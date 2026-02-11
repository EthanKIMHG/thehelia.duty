import { supabase } from '@/lib/supabase';
import { Staff } from '@/types';
import { NextResponse } from 'next/server';

export async function GET() {
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .order('name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  try {
    const body: Partial<Staff> = await request.json();

    // Validate required fields
    if (!body.name || !body.job_title || !body.employment_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('staff')
      .insert([body])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
