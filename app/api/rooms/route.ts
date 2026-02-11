import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { data, error } = await supabase
    .from('rooms')
    .select(`
      *,
      stays(*)
    `)
    .order('room_number');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Separate active and upcoming stays
  const roomsWithStays = data.map((room: any) => {
    const activeStay = room.stays?.find((stay: any) => stay.status === 'active') || null;
    const upcomingStays = room.stays?.filter((stay: any) => stay.status === 'upcoming') || [];

    return {
      ...room,
      active_stay: activeStay,
      upcoming_stays: upcomingStays,
      // Keep current_stay for backward compatibility
      current_stay: activeStay
    };
  });

  return NextResponse.json(roomsWithStays);
}
