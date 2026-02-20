export interface CalendarStay {
  id: string
  room_number: string
  mother_name: string
  baby_count: number
  check_in_date: string
  check_out_date: string
  status: string
}

export type CalendarEventType = 'in' | 'out'

export interface CalendarStayEvent extends CalendarStay {
  type: CalendarEventType
}

export interface CalendarDateEvents {
  checkIns: CalendarStay[]
  checkOuts: CalendarStay[]
}
