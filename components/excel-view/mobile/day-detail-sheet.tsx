import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { DayDetailModel, DayShiftStaffItem } from './types'
import { getStatusBadgeClass, getStatusLabel } from './status'

type DayDetailSheetProps = {
  open: boolean
  dayDetail: DayDetailModel | null
  onOpenChange: (open: boolean) => void
  onSelectStaff: (staffId: string) => void
}

export function DayDetailSheet({ open, dayDetail, onOpenChange, onSelectStaff }: DayDetailSheetProps) {
  const statusLabel = dayDetail ? getStatusLabel(dayDetail.status) : '-'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent id="mobile-day-detail-sheet" side="bottom" className="h-[86vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span>{dayDetail ? format(dayDetail.date, 'M월 d일 (EEE)', { locale: ko }) : '일정 상세'}</span>
            <Badge
              variant="outline"
              className={cn('h-6 border', dayDetail ? getStatusBadgeClass(dayDetail.status) : 'bg-muted')}
            >
              {statusLabel}
            </Badge>
          </SheetTitle>
          <SheetDescription>선택한 날짜의 D/E/N/M 근무자 상세 배치입니다.</SheetDescription>
        </SheetHeader>

        {dayDetail ? (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-4 gap-2">
              <SummaryTile label="신생아" value={`${dayDetail.newborns}명`} />
              <SummaryTile label="입실" value={`+${dayDetail.checkins}`} />
              <SummaryTile label="퇴실" value={`-${dayDetail.checkouts}`} />
              <SummaryTile label="필요" value={`${dayDetail.requiredPerShift}명`} />
            </div>

            <ShiftSection
              label="D (낮)"
              dutyCode="D"
              required={dayDetail.requiredPerShift}
              staff={dayDetail.shifts.D}
              onSelectStaff={onSelectStaff}
            />
            <ShiftSection
              label="E (저녁)"
              dutyCode="E"
              required={dayDetail.requiredPerShift}
              staff={dayDetail.shifts.E}
              onSelectStaff={onSelectStaff}
            />
            <ShiftSection
              label="N (밤)"
              dutyCode="N"
              required={dayDetail.requiredPerShift}
              staff={dayDetail.shifts.N}
              onSelectStaff={onSelectStaff}
            />
            <ShiftSection
              label="M (중간)"
              dutyCode="M"
              required={null}
              staff={dayDetail.shifts.M}
              onSelectStaff={onSelectStaff}
            />
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">이 날짜의 근무 데이터가 없습니다.</div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-h-11 rounded-lg border bg-muted/20 px-2 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  )
}

function ShiftSection({
  label,
  dutyCode,
  required,
  staff,
  onSelectStaff,
}: {
  label: string
  dutyCode: string
  required: number | null
  staff: DayShiftStaffItem[]
  onSelectStaff: (staffId: string) => void
}) {
  return (
    <section className="space-y-2 rounded-xl border bg-card p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="h-6 px-2">
            {dutyCode}
          </Badge>
          <h4 className="text-sm font-semibold">{label}</h4>
        </div>
        <p className="text-xs text-muted-foreground">
          배치 {staff.length}명 / 필요 {required === null ? '-' : `${required}명`}
        </p>
      </div>

      {staff.length === 0 ? (
        <div className="rounded-lg border border-dashed py-3 text-center text-sm text-muted-foreground">
          배정된 근무자가 없습니다
        </div>
      ) : (
        <div className="space-y-2">
          {staff.map((staffItem) => (
            <button
              key={`${dutyCode}-${staffItem.staffId}-${staffItem.dutyCode}`}
              type="button"
              onClick={() => onSelectStaff(staffItem.staffId)}
              className="flex min-h-11 w-full items-center justify-between rounded-lg border px-2.5 py-2 text-left hover:bg-muted/20"
            >
              <div className="min-w-0 flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">{staffItem.name[0] ?? '?'}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{staffItem.name}</p>
                  <p className="text-xs text-muted-foreground">{staffItem.roleLabel}</p>
                </div>
              </div>

              <Badge variant="outline" className="shrink-0">
                {staffItem.dutyCode}
              </Badge>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
