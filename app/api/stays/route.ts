import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Create Admin client to bypass RLS for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

type StayStatus = 'upcoming' | 'active' | 'completed'

type BabyProfilePayload = {
  name?: string | null
  gender?: string | null
  weight?: string | number | null
}

type StayPayload = {
  id?: string
  room_number?: string
  mother_name?: string
  baby_count?: number
  baby_names?: string[]
  baby_profiles?: BabyProfilePayload[] | null
  check_in_date?: string
  check_out_date?: string
  edu_date?: string | null
  notes?: string | null
  gender?: string | null
  baby_weight?: string | number | null
  birth_hospital?: string | null
  status?: StayStatus
}

type StayEditableSnapshot = {
  room_number: string | null
  mother_name: string | null
  baby_count: number | null
  baby_names: string[] | null
  baby_profiles: BabyProfilePayload[] | null
  check_in_date: string | null
  check_out_date: string | null
  edu_date: string | null
  notes: string | null
  gender: string | null
  baby_weight: number | null
  birth_hospital: string | null
  status: StayStatus | null
}

type StaySyncCandidate = {
  id: string
  room_number: string
  mother_name: string
  check_in_date: string
}

function normalizeStayPayload(payload: StayPayload) {
  const babyNames = Array.isArray(payload.baby_names)
    ? payload.baby_names.map((name) => name?.trim()).filter(Boolean)
    : undefined

  const mappedBabyProfiles = Array.isArray(payload.baby_profiles)
    ? payload.baby_profiles.map((profile) => {
      const rawWeight = profile?.weight
      const parsedWeight =
        rawWeight === '' || rawWeight === null || rawWeight === undefined
          ? null
          : Number(rawWeight)

      return {
        name: profile?.name?.trim() || null,
        gender: profile?.gender?.trim() || null,
        weight: Number.isFinite(parsedWeight) ? parsedWeight : null,
      }
    })
    : undefined

  const babyProfiles = mappedBabyProfiles && mappedBabyProfiles.length > 0
    ? mappedBabyProfiles
    : undefined

  const rawWeight = payload.baby_weight
  const parsedWeight =
    rawWeight === '' || rawWeight === null || rawWeight === undefined
      ? null
      : Number(rawWeight)

  const derivedBabyNames = babyProfiles
    ?.map((profile) => profile.name)
    .filter((name): name is string => Boolean(name))

  const derivedGenders = babyProfiles
    ?.map((profile) => profile.gender)
    .filter((gender): gender is string => Boolean(gender))

  const mergedGender = derivedGenders && derivedGenders.length > 0
    ? derivedGenders.join('/')
    : null

  const hasBabyProfiles = Boolean(babyProfiles && babyProfiles.length > 0)
  const normalizedWeight = hasBabyProfiles
    ? babyProfiles?.[0]?.weight ?? null
    : (Number.isFinite(parsedWeight) ? parsedWeight : null)

  return {
    ...payload,
    baby_names: babyNames ?? derivedBabyNames,
    baby_profiles: babyProfiles,
    edu_date: payload.edu_date || null,
    notes: payload.notes || null,
    gender: mergedGender || payload.gender || null,
    birth_hospital: payload.birth_hospital || null,
    baby_weight: normalizedWeight,
  }
}

function getDateStringInTimeZone(timeZone: string, baseDate = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(baseDate)

  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value

  if (!year || !month || !day) return baseDate.toISOString().split('T')[0]
  return `${year}-${month}-${day}`
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month'); // YYYY-MM (optional)
  const status = searchParams.get('status');
  const roomNumber = searchParams.get('room_number');

  const sourceTable = status === 'completed' ? 'v_stay_history' : 'stays'
  let query = supabaseAdmin.from(sourceTable).select('*');

  if (month) {
    const [year, monthNum] = month.split('-').map(Number);
    if (!year || !monthNum || monthNum < 1 || monthNum > 12) {
      return NextResponse.json({ error: 'Invalid month format. Use YYYY-MM' }, { status: 400 });
    }

    const startDate = `${month}-01`;
    const endDate = new Date(year, monthNum, 0).toISOString().split('T')[0];

    // Date overlap with target month
    query = query
      .lte('check_in_date', endDate)
      .gte('check_out_date', startDate);
  }

  if (status && status !== 'completed') {
    query = query.eq('status', status);
  }

  if (roomNumber) {
    query = query.eq('room_number', roomNumber);
  }

  if (status === 'completed') {
    query = query.order('check_out_date', { ascending: false });
  } else {
    query = query.order('check_in_date', { ascending: true });
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as StayPayload;
    const payload = normalizeStayPayload(body);
    console.log('Creating stay with body:', body);

    // Use admin client for write
    const { data, error } = await supabaseAdmin
      .from('stays')
      .insert(payload)
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
    const body = await request.json() as StayPayload;
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Stay ID is required' }, { status: 400 });
    }

    const { data: existingStay, error: existingError } = await supabaseAdmin
      .from('stays')
      .select(
        'id, room_number, mother_name, baby_count, baby_names, baby_profiles, check_in_date, check_out_date, edu_date, notes, gender, baby_weight, birth_hospital, status'
      )
      .eq('id', id)
      .single();

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    const existingSnapshot = existingStay as unknown as StayEditableSnapshot
    const mergedPayload: StayPayload = {
      room_number: existingSnapshot.room_number ?? undefined,
      mother_name: existingSnapshot.mother_name ?? undefined,
      baby_count: existingSnapshot.baby_count ?? undefined,
      baby_names: existingSnapshot.baby_names ?? undefined,
      baby_profiles: existingSnapshot.baby_profiles ?? undefined,
      check_in_date: existingSnapshot.check_in_date ?? undefined,
      check_out_date: existingSnapshot.check_out_date ?? undefined,
      edu_date: existingSnapshot.edu_date ?? undefined,
      notes: existingSnapshot.notes ?? undefined,
      gender: existingSnapshot.gender ?? undefined,
      baby_weight: existingSnapshot.baby_weight ?? undefined,
      birth_hospital: existingSnapshot.birth_hospital ?? undefined,
      status: existingSnapshot.status ?? undefined,
      ...updateData,
    }

    const normalizedPayload = normalizeStayPayload(mergedPayload);

    // Use admin client for write
    const { data, error } = await supabaseAdmin
      .from('stays')
      .update(normalizedPayload)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If active stay is completed manually, automatically promote next upcoming stay.
    if (existingStay.status === 'active' && normalizedPayload.status === 'completed') {
      const { data: nextUpcoming, error: upcomingError } = await supabaseAdmin
        .from('stays')
        .select('id')
        .eq('room_number', existingStay.room_number)
        .eq('status', 'upcoming')
        .order('check_in_date', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (upcomingError) {
        console.error('Supabase upcoming fetch error:', upcomingError);
        return NextResponse.json({ error: upcomingError.message }, { status: 500 });
      }

      if (nextUpcoming?.id) {
        const { error: promoteError } = await supabaseAdmin
          .from('stays')
          .update({ status: 'active' })
          .eq('id', nextUpcoming.id);

        if (promoteError) {
          console.error('Supabase promote error:', promoteError);
          return NextResponse.json({ error: promoteError.message }, { status: 500 });
        }
      }
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error('Request error:', e);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

export async function PATCH() {
  try {
    const todayKst = getDateStringInTimeZone('Asia/Seoul')
    // 1) Complete active stays that have checkout date today or earlier
    const { data: checkoutRows, error: checkoutRowsError } = await supabaseAdmin
      .from('stays')
      .select('id, room_number, mother_name, check_out_date')
      .eq('status', 'active')
      .lte('check_out_date', todayKst)

    if (checkoutRowsError) {
      return NextResponse.json({ error: checkoutRowsError.message }, { status: 500 })
    }

    const completedTargets = (checkoutRows || [])
      .filter((row) => row.id)
      .map((row) => ({
        id: row.id as string,
        room_number: (row.room_number as string) || '',
        mother_name: (row.mother_name as string) || '',
        check_out_date: (row.check_out_date as string) || '',
      }))

    const completedIds = completedTargets.map((row) => row.id)

    if (completedIds.length > 0) {
      const { error: completeError } = await supabaseAdmin
        .from('stays')
        .update({ status: 'completed' })
        .in('id', completedIds)

      if (completeError) {
        return NextResponse.json({ error: completeError.message }, { status: 500 })
      }
    }

    // 2) Promote upcoming stays that should already be checked in
    const { data: activeRows, error: activeRowsError } = await supabaseAdmin
      .from('stays')
      .select('room_number')
      .eq('status', 'active')

    if (activeRowsError) {
      return NextResponse.json({ error: activeRowsError.message }, { status: 500 })
    }

    const activeRoomSet = new Set(
      (activeRows || [])
        .map((row) => row.room_number)
        .filter((roomNumber): roomNumber is string => Boolean(roomNumber))
    )

    const { data: upcomingRows, error: upcomingError } = await supabaseAdmin
      .from('stays')
      .select('id, room_number, mother_name, check_in_date')
      .eq('status', 'upcoming')
      .lte('check_in_date', todayKst)
      .order('check_in_date', { ascending: true })

    if (upcomingError) {
      return NextResponse.json({ error: upcomingError.message }, { status: 500 })
    }

    const promoteByRoom = new Map<string, StaySyncCandidate>()

    for (const rawStay of upcomingRows || []) {
      const stay = rawStay as StaySyncCandidate
      if (!stay.id || !stay.room_number) continue
      if (activeRoomSet.has(stay.room_number)) continue
      if (promoteByRoom.has(stay.room_number)) continue
      promoteByRoom.set(stay.room_number, stay)
    }

    const promoteTargets = Array.from(promoteByRoom.values())
    const promoteTargetIds = promoteTargets.map((stay) => stay.id)

    if (promoteTargetIds.length > 0) {
      const { error: promoteError } = await supabaseAdmin
        .from('stays')
        .update({ status: 'active' })
        .in('id', promoteTargetIds)

      if (promoteError) {
        return NextResponse.json({ error: promoteError.message }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      today_kst: todayKst,
      completed_count: completedTargets.length,
      completed: completedTargets,
      promoted_count: promoteTargets.length,
      promoted: promoteTargets.map((stay) => ({
        id: stay.id,
        room_number: stay.room_number,
        mother_name: stay.mother_name,
        check_in_date: stay.check_in_date,
      })),
    })
  } catch (e) {
    console.error('PATCH sync error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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
