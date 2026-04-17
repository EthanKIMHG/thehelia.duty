export type ShiftType = 'D' | 'E' | 'N' | 'M' | '/' | 'DE'

export interface ParsedShift {
  original: string
  type: ShiftType
  otHours: number
  otPreHours: number
  otPostHours: number
  otPosition: 'pre' | 'post' | 'both' | 'none'
}

export function parseShift(shift: string | null | undefined): ParsedShift {
  if (!shift || shift === '') {
    return { original: '', type: '/', otHours: 0, otPreHours: 0, otPostHours: 0, otPosition: 'none' }
  }

  // Check for simple types including DE
  if (['D', 'E', 'N', 'M', '/', 'DE'].includes(shift)) {
    return {
      original: shift,
      type: shift as ShiftType,
      otHours: 0,
      otPreHours: 0,
      otPostHours: 0,
      otPosition: 'none',
    }
  }

  // Check for Pre+Post OT: "2+N+2", "1+M+3", "2+DE+1"
  const bothMatch = shift.match(/^(\d+)\+([DENM]{1,2})\+(\d+)$/)
  if (bothMatch) {
    const otPreHours = parseInt(bothMatch[1], 10)
    const otPostHours = parseInt(bothMatch[3], 10)
    return {
      original: shift,
      type: bothMatch[2] as ShiftType,
      otHours: otPreHours + otPostHours,
      otPreHours,
      otPostHours,
      otPosition: 'both'
    }
  }

  // Check for Pre-OT: "4+E", "1+N", "2+M"
  const preMatch = shift.match(/^(\d+)\+([DENM]{1,2})$/)
  if (preMatch) {
    const otPreHours = parseInt(preMatch[1], 10)
    return {
      original: shift,
      type: preMatch[2] as ShiftType,
      otHours: otPreHours,
      otPreHours,
      otPostHours: 0,
      otPosition: 'pre'
    }
  }

  // Check for Post-OT: "N+2", "M+1", "DE+2"
  const postMatch = shift.match(/^([DENM]{1,2})\+(\d+)$/)
  if (postMatch) {
    const otPostHours = parseInt(postMatch[2], 10)
    return {
      original: shift,
      type: postMatch[1] as ShiftType,
      otHours: otPostHours,
      otPreHours: 0,
      otPostHours,
      otPosition: 'post'
    }
  }

  // Fallback
  return { original: shift, type: '/', otHours: 0, otPreHours: 0, otPostHours: 0, otPosition: 'none' }
}

export interface MonthlyStats {
  workDays: number
  offDays: number
  totalOT: number
}

export function calculateMonthlyStats(schedule: { type: string }[]): MonthlyStats {
  let workDays = 0
  let offDays = 0
  let totalOT = 0

  schedule.forEach(day => {
    const parsed = parseShift(day.type)

    if (parsed.type === '/') {
      offDays++
    } else {
      workDays++
    }

    totalOT += parsed.otHours
  })

  return { workDays, offDays, totalOT }
}
