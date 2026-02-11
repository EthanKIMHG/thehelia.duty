'use client'

import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface StaffingMeterProps {
  totalNewborns: number
  totalNurses: number
  totalAssistants: number
}

export function StaffingMeter({ totalNewborns, totalNurses, totalAssistants }: StaffingMeterProps) {
  // Logic: Everyone handles 4 newborns
  const capacity = (totalNurses + totalAssistants) * 4 
  const ratio = totalNewborns > 0 ? capacity / totalNewborns : 1;
  const percentage = Math.min(Math.max(ratio * 100, 0), 100);
  
  // Safe: Ratio >= 1.0 (Capacity meets demand)
  // Caution: 0.8 <= Ratio < 1.0
  // Danger: Ratio < 0.8
  
  let status: 'Safe' | 'Caution' | 'Danger' = 'Safe'
  let colorClass = "bg-green-500"
  let label = "적정"

  if (ratio < 0.8) {
    status = 'Danger'
    colorClass = "bg-red-500"
    label = "부족"
  } else if (ratio < 1.0) {
    status = 'Caution'
    colorClass = "bg-yellow-500"
    label = "주의"
  }

  return (
    <Card className={cn(
      "p-4 border-l-4 border-l-primary bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      // Mobile: Fixed at bottom, above nav, with some margin
      "fixed bottom-[5.5rem] left-4 right-4 z-40 shadow-xl", 
      // Desktop: Sticky at top, normal flow
      "md:sticky md:top-0 md:bottom-auto md:left-auto md:right-auto md:shadow-sm md:mb-4 md:block" // Force block/flex handling if needed
    )}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-blur-sm backdrop-blur-sm">
        <div className="space-y-1">
           <h3 className="font-bold text-lg flex items-center gap-2">
             인력 안전 지수 (Safety Index)
             <span className={cn(
               "text-xs px-2 py-0.5 rounded-full text-white",
               status === 'Safe' ? "bg-green-600" :
               status === 'Caution' ? "bg-yellow-600" : "bg-red-600"
             )}>
               {label}
             </span>
           </h3>
           <p className="text-sm text-muted-foreground">
             신생아 {totalNewborns}명 vs 가용 인력 {(totalNurses + totalAssistants)}명 (최대 {capacity}명 케어 가능)
           </p>
        </div>
        
        <div className="flex-1 max-w-md space-y-2">
           <div className="flex justify-between text-xs font-medium">
             <span>부족</span>
             <span>적정 (1:4)</span>
            <span>여유</span>
          </div>
          <Progress value={percentage} className="h-3" indicatorClassName={colorClass} />
        </div>
      </div>
    </Card>
  )
}
