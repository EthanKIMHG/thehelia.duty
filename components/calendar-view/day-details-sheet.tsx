import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { LogIn, LogOut } from 'lucide-react'
import type { CalendarDateEvents } from './types'

type DayDetailsSheetProps = {
  open: boolean
  selectedDate: Date | null
  events: CalendarDateEvents
  onOpenChange: (open: boolean) => void
}

export function DayDetailsSheet({ open, selectedDate, events, onOpenChange }: DayDetailsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-xl">
            <span className="rounded bg-primary px-3 py-1 text-primary-foreground">
              {selectedDate ? format(selectedDate, 'M월 d일 (E)', { locale: ko }) : '-'}
            </span>
            일정
          </SheetTitle>
          <SheetDescription>이 날의 입실 및 퇴실 예정 산모 목록입니다.</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <LogIn className="h-4 w-4 text-green-600" />
              <span>입실 예정</span>
              <Badge variant="secondary">{events.checkIns.length}</Badge>
            </div>

            {events.checkIns.length === 0 ? (
              <div className="rounded-lg border border-dashed py-3 text-center text-sm text-muted-foreground">입실 예정 없음</div>
            ) : (
              <div className="space-y-2">
                {events.checkIns.map((stay) => (
                  <div
                    key={stay.id}
                    className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20"
                  >
                    <div className="flex items-center gap-3">
                      <Badge className="bg-green-600">{stay.room_number}호</Badge>
                      <div>
                        <div className="font-medium">{stay.mother_name}</div>
                        <div className="text-xs text-muted-foreground">아기 {stay.baby_count}명 • ~{stay.check_out_date}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <LogOut className="h-4 w-4 text-red-600" />
              <span>퇴실 예정</span>
              <Badge variant="secondary">{events.checkOuts.length}</Badge>
            </div>

            {events.checkOuts.length === 0 ? (
              <div className="rounded-lg border border-dashed py-3 text-center text-sm text-muted-foreground">퇴실 예정 없음</div>
            ) : (
              <div className="space-y-2">
                {events.checkOuts.map((stay) => (
                  <div
                    key={stay.id}
                    className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20"
                  >
                    <div className="flex items-center gap-3">
                      <Badge className="bg-red-600">{stay.room_number}호</Badge>
                      <div>
                        <div className="font-medium">{stay.mother_name}</div>
                        <div className="text-xs text-muted-foreground">아기 {stay.baby_count}명 • {stay.check_in_date}~</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
