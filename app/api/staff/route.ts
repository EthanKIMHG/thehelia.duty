import { supabase } from '@/lib/supabase';
import { Staff } from '@/types';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  let { data, error } = await supabase
    .from('staff')
    .select('*')
    .order('display_order', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true });

  // Backward compatibility before display_order migration is applied.
  if (error && error.message.includes('display_order')) {
    const fallback = await supabase
      .from('staff')
      .select('*')
      .order('name', { ascending: true });
    data = fallback.data;
    error = fallback.error;
  }

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

    const insertPayload: Partial<Staff> = { ...body };

    // If display_order exists, append new staff to the end.
    const maxOrderRes = await supabase
      .from('staff')
      .select('display_order')
      .order('display_order', { ascending: false, nullsFirst: false })
      .limit(1);

    if (!maxOrderRes.error) {
      const currentMax = Number(maxOrderRes.data?.[0]?.display_order ?? 0);
      insertPayload.display_order = Number.isFinite(currentMax) ? currentMax + 1 : 1;
    }

    const { data, error } = await supabase
      .from('staff')
      .insert([insertPayload])
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

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    // Delete related records first to avoid FK constraint errors
    await supabase.from('wanted_offs').delete().eq('staff_id', id);
    await supabase.from('schedules').delete().eq('staff_id', id);

    const { error } = await supabase
      .from('staff')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body: {
      id?: string;
      name?: string;
      employment_type?: Staff['employment_type'];
      ordered_ids?: string[];
    } = await request.json();

    if (Array.isArray(body.ordered_ids)) {
      const uniqueOrderedIds = Array.from(
        new Set(
          body.ordered_ids
            .map((id) => (typeof id === 'string' ? id.trim() : ''))
            .filter(Boolean)
        )
      );

      if (!uniqueOrderedIds.length) {
        return NextResponse.json({ error: 'ordered_ids is empty' }, { status: 400 });
      }

      const { data: currentStaff, error: currentStaffError } = await supabase
        .from('staff')
        .select('id, display_order');

      if (currentStaffError) {
        return NextResponse.json({ error: currentStaffError.message }, { status: 500 });
      }

      const existingIds = new Set((currentStaff || []).map((staff) => staff.id));
      const orderedExistingIds = uniqueOrderedIds.filter((id) => existingIds.has(id));
      const providedIdSet = new Set(orderedExistingIds);

      const remainder = (currentStaff || [])
        .filter((staff) => !providedIdSet.has(staff.id))
        .sort((a, b) => {
          const aOrder = typeof a.display_order === 'number' ? a.display_order : Number.MAX_SAFE_INTEGER;
          const bOrder = typeof b.display_order === 'number' ? b.display_order : Number.MAX_SAFE_INTEGER;
          if (aOrder !== bOrder) return aOrder - bOrder;
          return a.id.localeCompare(b.id);
        })
        .map((staff) => staff.id);

      const finalOrderIds = [...orderedExistingIds, ...remainder];

      for (let idx = 0; idx < finalOrderIds.length; idx += 1) {
        const staffId = finalOrderIds[idx];
        const { error: updateError } = await supabase
          .from('staff')
          .update({ display_order: idx + 1 })
          .eq('id', staffId);

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }
      }

      return NextResponse.json({
        success: true,
        ordered_count: finalOrderIds.length
      });
    }

    const id = body.id;

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const updates: Partial<Pick<Staff, 'name' | 'employment_type'>> = {};

    if (typeof body.name === 'string') {
      const normalizedName = body.name.trim();
      if (!normalizedName) {
        return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
      }
      updates.name = normalizedName;
    }

    if (body.employment_type !== undefined) {
      if (body.employment_type !== 'full-time' && body.employment_type !== 'part-time') {
        return NextResponse.json({ error: 'Invalid employment_type' }, { status: 400 });
      }
      updates.employment_type = body.employment_type;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('staff')
      .update(updates)
      .eq('id', id)
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
