'use client'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { authFetch } from '@/lib/api'
import { Staff } from '@/types'
import { useQuery } from '@tanstack/react-query'
import { Baby, Users } from 'lucide-react'

export function StaffBento() {
  const { isPending, error, data } = useQuery<Staff[]>({
    queryKey: ['staff'],
    queryFn: async () => {
        const res = await authFetch('/api/staff')
        if (!res.ok) throw new Error('Network response was not ok')
        return res.json()
    }
  })

  if (isPending) return <StaffBentoSkeleton />
  if (error) return <div className="text-red-500">Error: {error.message}</div>

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {data?.map((staff) => (
        <Card key={staff.id} className="hover:shadow-md transition-all duration-200 border-l-4 border-l-primary/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
            <CardTitle className="text-base font-bold truncate">
              {staff.name}
            </CardTitle>
            <Badge variant={staff.job_title === 'nurse' ? 'default' : 'secondary'} className="text-xs">
              {staff.job_title === 'nurse' ? '간호사' : '조무사'}
            </Badge>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center gap-4">
                <Avatar className="h-10 w-10 border">
                  <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                    {staff.name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1 w-full">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>{staff.employment_type === 'full-time' ? '정규직' : '파트타임'}</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-xs font-medium">
                         <div className="flex items-center gap-1 text-primary">
                            <Baby className="h-3 w-3" />
                            <span>최대 {staff.max_capacity}명</span>
                        </div>
                    </div>
                </div>
            </div>
          </CardContent>
        </Card>
      ))}
       {data?.length === 0 && (
        <div className="col-span-full text-center p-8 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>등록된 직원이 없습니다.</p>
        </div>
      )}
    </div>
  )
}

function StaffBentoSkeleton() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => (
                <Skeleton key={i} className="h-[100px] w-full rounded-xl" />
            ))}
        </div>
    )
}
