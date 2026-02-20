import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { parseShift } from '@/lib/shift-utils'
import type { StaffDetailModel } from './types'

type StaffDetailSheetProps = {
  open: boolean
  model: StaffDetailModel | null
  onOpenChange: (open: boolean) => void
}

export function StaffDetailSheet({ open, model, onOpenChange }: StaffDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[88vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{model?.name || '직원 상세'}</SheetTitle>
          <SheetDescription>휴무/일정 상세를 확인할 수 있습니다.</SheetDescription>
        </SheetHeader>

        {model ? (
          <div className="space-y-4 py-4">
            <section className="space-y-2 rounded-xl border bg-card p-3">
              <div className="flex items-center gap-2">
                <Badge>{model.roleLabel}</Badge>
                <Badge variant="outline">{model.employmentLabel}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <MetricCell label="근무일" value={`${model.workDays}일`} />
                <MetricCell label="휴무일" value={`${model.offDays}일`} />
                <MetricCell label="OT" value={model.totalOT > 0 ? `${model.totalOT}h` : '-'} />
              </div>
            </section>

            <Tabs defaultValue="week" className="space-y-3">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="week">주간 일정</TabsTrigger>
                <TabsTrigger value="off">휴무/희망휴무</TabsTrigger>
                <TabsTrigger value="month">월간 일정</TabsTrigger>
              </TabsList>

              <TabsContent value="week" className="space-y-2">
                {model.weekEntries.map((entry) => (
                  <RowItem
                    key={entry.dateStr}
                    label={format(entry.date, 'EEE M/d', { locale: ko })}
                    dutyCode={entry.dutyCode}
                    wantedOff={entry.isWantedOff}
                  />
                ))}
              </TabsContent>

              <TabsContent value="off" className="space-y-3">
                <section className="space-y-2 rounded-xl border bg-card p-3">
                  <p className="text-xs font-semibold text-muted-foreground">휴무일 ({model.monthLabel})</p>
                  {model.offDates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">이번 달 휴무가 없습니다.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {model.offDates.map((date) => (
                        <Badge key={date} variant="outline">{date}</Badge>
                      ))}
                    </div>
                  )}
                </section>

                <section className="space-y-2 rounded-xl border bg-card p-3">
                  <p className="text-xs font-semibold text-muted-foreground">희망휴무 ({model.monthLabel})</p>
                  {model.wantedOffDates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">등록된 희망휴무가 없습니다.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {model.wantedOffDates.map((date) => (
                        <Badge key={date} className="bg-red-100 text-red-700 hover:bg-red-100">{date}</Badge>
                      ))}
                    </div>
                  )}
                </section>
              </TabsContent>

              <TabsContent value="month" className="space-y-2">
                {model.monthEntries.map((entry) => (
                  <RowItem
                    key={entry.dateStr}
                    label={format(entry.date, 'M/d (EEE)', { locale: ko })}
                    dutyCode={entry.dutyCode}
                    wantedOff={entry.isWantedOff}
                  />
                ))}
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">직원을 선택하면 상세 정보가 표시됩니다.</div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-h-11 rounded-lg border bg-muted/20 px-2 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  )
}

function RowItem({ label, dutyCode, wantedOff }: { label: string; dutyCode: string; wantedOff: boolean }) {
  const parsed = parseShift(dutyCode)
  const toneClass =
    parsed.type === 'D'
      ? 'bg-yellow-100 text-yellow-800'
      : parsed.type === 'E'
        ? 'bg-green-100 text-green-800'
        : parsed.type === 'N'
          ? 'bg-blue-100 text-blue-800'
          : parsed.type === 'M'
            ? 'bg-purple-100 text-purple-800'
            : parsed.type === 'DE'
              ? 'bg-indigo-100 text-indigo-800'
              : 'bg-gray-100 text-gray-600'

  return (
    <div className="flex min-h-11 items-center justify-between rounded-lg border px-2.5 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {wantedOff ? <p className="text-xs text-red-600">희망휴무 등록일</p> : null}
      </div>
      <Badge variant="outline" className={cn('border-transparent', toneClass)}>
        {dutyCode || '/'}
      </Badge>
    </div>
  )
}
