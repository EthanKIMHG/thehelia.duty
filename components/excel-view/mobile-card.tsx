'use client'

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { parseShift } from "@/lib/shift-utils"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { AlertTriangle, Baby, CheckCircle2 } from 'lucide-react'
import type { DailyWarningMap, StaffScheduleViewModel } from "./types"

interface MobileCardProps {
  date: Date
  schedules: StaffScheduleViewModel[]
  dailyWarnings?: DailyWarningMap
}

export function MobileCard({ date, schedules, dailyWarnings }: MobileCardProps) {
  const dateStr = format(date, 'yyyy-MM-dd')
  const formattedDate = format(date, 'M월 d일 (EEE)', { locale: ko })

  // Get stats for this day
  const stats = dailyWarnings?.get(dateStr)
  const isUnderstaffed = (stats?.dDiff || 0) < 0 || (stats?.eDiff || 0) < 0 || (stats?.nDiff || 0) < 0

  // Group by shift
  const dayShift = schedules.filter(s => {
      const type = s.schedule.find((scheduleEntry) => scheduleEntry.date === dateStr)?.type
      // Check for D or DE or M (if M counts as Day coverage? Usually separate)
      // User said M (11-18) covers peak.
      // Let's keep M separate as requested by plan, but user logic might imply M helps D/E.
      // For list display, show M separately or in D/E? 
      // User: "M is usually used... M+2, M+1...". 
      // "DE 근무자일경우 day evening 칸에 하나씩...". 
      // I will add a separate M section for clarity.
      return parseShift(type).type === 'D' || parseShift(type).type === 'DE'
  })
  const eveningShift = schedules.filter(s => {
      const type = s.schedule.find((scheduleEntry) => scheduleEntry.date === dateStr)?.type
      return parseShift(type).type === 'E' || parseShift(type).type === 'DE'
  })
  const nightShift = schedules.filter(s => {
      const type = s.schedule.find((scheduleEntry) => scheduleEntry.date === dateStr)?.type
      return parseShift(type).type === 'N'
  })
  const midtermShift = schedules.filter(s => {
      const type = s.schedule.find((scheduleEntry) => scheduleEntry.date === dateStr)?.type
      return parseShift(type).type === 'M'
  })

  return (
    <div className="space-y-3">
      {/* Date Header */}
      <h3 className="text-lg font-bold sticky top-0 bg-background/95 backdrop-blur py-3 z-10 border-b flex justify-between items-center">
        <span>{formattedDate}</span>
        {isUnderstaffed ? (
             <Badge variant="destructive" className="gap-1 animate-pulse">
                <AlertTriangle className="h-3 w-3" />
                인력 부족
             </Badge>
        ) : (
            <Badge variant="outline" className="gap-1 text-green-600 border-green-200 bg-green-50">
                <CheckCircle2 className="h-3 w-3" />
                적정
             </Badge>
        )}
      </h3>

      {/* Stats Summary Card */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-muted/30 rounded-lg p-3 text-center border">
            <div className="text-xs text-muted-foreground mb-1">신생아</div>
            <div className="font-bold text-lg flex items-center justify-center gap-1">
                <Baby className="h-4 w-4 text-primary" />
                {stats?.newborns || 0}
            </div>
        </div>
        <div className="bg-muted/30 rounded-lg p-3 text-center border">
             <div className="text-xs text-muted-foreground mb-1">입/퇴실</div>
             <div className="font-bold text-sm">
                +{stats?.checkins || 0} / -{stats?.checkouts || 0}
             </div>
        </div>
        <div className="bg-muted/30 rounded-lg p-3 text-center border">
             <div className="text-xs text-muted-foreground mb-1">필요인력</div>
             <div className="font-bold text-lg">
                {stats?.requiredPerShift || 0}
                <span className="text-xs font-normal text-muted-foreground">/shift</span>
             </div>
        </div>
      </div>
      
      {/* Staff Lists */}
      <div className="grid gap-3">
        <ShiftGroup 
            title="Day (낮)" 
            staff={dayShift} 
            color="bg-yellow-50 text-yellow-900 border-yellow-200" 
            badge="default"
            required={stats?.requiredPerShift}
        />
        {/* Midterm section */}
        {midtermShift.length > 0 && (
            <ShiftGroup 
                title="Midterm (중간)" 
                staff={midtermShift} 
                color="bg-purple-50 text-purple-900 border-purple-200" 
                badge="outline"
                required={0} // M shift doesn't usually have a fixed required count in this simple logic
            />
        )}
        <ShiftGroup 
            title="Evening (저녁)" 
            staff={eveningShift} 
            color="bg-green-50 text-green-900 border-green-200" 
            badge="secondary"
            required={stats?.requiredPerShift}
        />
        <ShiftGroup 
            title="Night (밤)" 
            staff={nightShift} 
            color="bg-blue-50 text-blue-900 border-blue-200" 
            badge="outline"
            required={stats?.requiredPerShift}
        />
      </div>
    </div>
  )
}

function ShiftGroup({
  title,
  staff,
  color,
  badge,
  required,
}: {
  title: string
  staff: StaffScheduleViewModel[]
  color: string
  badge: 'default' | 'secondary' | 'outline' | 'destructive'
  required?: number
}) {
  // Always render, even if empty
  const isShort = required ? staff.length < required : false

  return (
    <Card className="border-none shadow-sm overflow-hidden">
      <CardHeader className={`px-4 py-3 font-semibold text-sm border-b flex flex-row justify-between items-center ${color}`}>
        <span>{title}</span>
        <span className={isShort ? "text-red-600 font-bold" : ""}>
            {staff.length}명 / {required || '-'}명
        </span>
      </CardHeader>
      <CardContent className="p-0">
        {staff.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground bg-muted/10">
                배정된 근무자가 없습니다.
            </div>
        ) : (
            <div className="divide-y relative">
                {staff.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8 border">
                            <AvatarFallback className="text-xs">{s.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="text-sm font-medium">{s.name}</div>
                            <div className="text-xs text-muted-foreground">{s.role === 'Nurse' ? '간호사' : '조무사'}</div>
                        </div>
                    </div>
                    <Badge variant={badge} className="text-[10px] h-5">
                        {s.role === 'Nurse' ? 'RN' : 'AN'}
                    </Badge>
                </div>
                ))}
            </div>
        )}
      </CardContent>
    </Card>
  )
}
