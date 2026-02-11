'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { authFetch } from '@/lib/api'
import { Staff } from '@/types'
import { useQuery } from '@tanstack/react-query'

export function StaffList() {
  const { isPending, error, data } = useQuery<Staff[]>({
    queryKey: ['staff'],
    queryFn: async () => {
        const res = await authFetch('/api/staff')
        if (!res.ok) throw new Error('Network response was not ok')
        return res.json()
    }
  })

  if (isPending) return <StaffListSkeleton />

  if (error) return <div className="text-red-500">An error has occurred: {error.message}</div>

  return (
    <div className="border rounded-lg bg-card text-card-foreground shadow-sm">
        <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">직원 목록</h3>
            <p className="text-sm text-muted-foreground">전체 직원 현황 및 정보</p>
        </div>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이름</TableHead>
              <TableHead>직종</TableHead>
              <TableHead>고용 형태</TableHead>
              <TableHead className="text-right">케어 인원</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.map((staff) => (
              <TableRow key={staff.id}>
                <TableCell className="font-medium">{staff.name}</TableCell>
                <TableCell>
                  <Badge variant={staff.job_title === 'nurse' ? 'default' : 'secondary'}>
                      {staff.job_title === 'nurse' ? '간호사' : '조무사'}
                  </Badge>
                </TableCell>
                <TableCell>{staff.employment_type === 'full-time' ? '정규직' : '파트타임'}</TableCell>
                <TableCell className="text-right">{staff.max_capacity}명</TableCell>
              </TableRow>
            ))}
            {data?.length === 0 && (
              <TableRow>
                  <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                      등록된 직원이 없습니다.
                  </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4 p-4">
        {data?.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
             등록된 직원이 없습니다.
          </div>
        )}
        {data?.map((staff) => (
          <Card key={staff.id} className="overflow-hidden">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base font-bold">{staff.name}</CardTitle>
              <Badge variant={staff.job_title === 'nurse' ? 'default' : 'secondary'}>
                  {staff.job_title === 'nurse' ? '간호사' : '조무사'}
              </Badge>
            </CardHeader>
            <CardContent className="p-4 pt-2 text-sm text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>고용 형태:</span>
                <span className="font-medium text-foreground">{staff.employment_type === 'full-time' ? '정규직' : '파트타임'}</span>
              </div>
              <div className="flex justify-between">
                <span>케어 인원:</span>
                <span className="font-medium text-foreground">{staff.max_capacity}명</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function StaffListSkeleton() {
    return (
        <div className="space-y-3">
             <Skeleton className="h-[125px] w-full rounded-xl" />
             <Skeleton className="h-[125px] w-full rounded-xl" />
        </div>
    )
}
