export type StaffRole = 'nurse' | 'assistant';
export type EmploymentType = 'full-time' | 'part-time';

export interface Staff {
  id: string;
  name: string;
  job_title: StaffRole;
  employment_type: EmploymentType;
  max_capacity: number;
  created_at?: string;
}

export type DutyType = 'D' | 'E' | 'N' | '/';

export interface Schedule {
  id: string;
  staff_id: string;
  work_date: string; // YYYY-MM-DD
  duty_type: DutyType;
  is_ot: boolean;
  ot_hours: number;
}

export interface Room {
  room_number: string;
  room_type: string;
  floor: number;
}

export type StayStatus = 'upcoming' | 'active' | 'completed';

export interface BabyProfile {
  name?: string | null;
  gender?: string | null;
  weight?: number | null;
}

export interface Stay {
  id: string;
  room_number: string;
  mother_name: string;
  baby_count: number;
  baby_names?: string[];
  baby_profiles?: BabyProfile[];
  gender?: string | null;
  baby_weight?: number | null;
  birth_hospital?: string | null;
  check_in_date: string;
  check_out_date: string;
  edu_date?: string;
  notes?: string;
  status: StayStatus;
}
