'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { authFetch } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

interface StayHistory {
  id: string
  room_number: string
  mother_name: string
  baby_names?: string[]
  gender?: string | null
  baby_weight?: number | null
  birth_hospital?: string | null
  check_in_date: string
  check_out_date: string
  edu_date?: string | null
  notes?: string | null
  status: 'upcoming' | 'active' | 'completed'
}

const formatWeight = (value?: number | null) => {
  if (value === undefined || value === null) return '-'
  return `${value}kg`
}

export function StayHistoryView() {
  const [keyword, setKeyword] = useState('')

  const { data, isLoading } = useQuery<StayHistory[]>({
    queryKey: ['stays', 'history', 'completed'],
    queryFn: async () => {
      const res = await authFetch('/api/stays?status=completed')
      if (!res.ok) throw new Error('Failed to fetch stay history')
      return res.json()
    }
  })

  const filteredRows = useMemo(() => {
    if (!data) return []
    const search = keyword.trim().toLowerCase()
    if (!search) return data

    return data.filter((stay) => {
      const babyNames = stay.baby_names?.join(' ') || ''
      const haystack = `${stay.room_number} ${stay.mother_name} ${babyNames} ${stay.birth_hospital || ''}`.toLowerCase()
      return haystack.includes(search)
    })
  }, [data, keyword])

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <CardTitle>과거 데이터</CardTitle>
          <div className="text-sm text-muted-foreground">
            총 {filteredRows.length}건
          </div>
        </div>
        <Input
          placeholder="산모명 / 객실 / 태명 / 출산병원 검색"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="max-w-md"
        />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center border rounded-lg border-dashed">
            표시할 과거 데이터가 없습니다.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>퇴실일자</TableHead>
                <TableHead>객실</TableHead>
                <TableHead>산모명</TableHead>
                <TableHead>태명</TableHead>
                <TableHead>성별</TableHead>
                <TableHead>몸무게</TableHead>
                <TableHead>출산병원</TableHead>
                <TableHead>입실일자</TableHead>
                <TableHead>교육일자</TableHead>
                <TableHead>메모</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((stay) => (
                <TableRow key={stay.id}>
                  <TableCell>{stay.check_out_date}</TableCell>
                  <TableCell>{stay.room_number}호</TableCell>
                  <TableCell className="font-medium">{stay.mother_name}</TableCell>
                  <TableCell>{stay.baby_names?.filter(name => name.trim() !== '').join(', ') || '-'}</TableCell>
                  <TableCell>{stay.gender || '-'}</TableCell>
                  <TableCell>{formatWeight(stay.baby_weight)}</TableCell>
                  <TableCell>{stay.birth_hospital || '-'}</TableCell>
                  <TableCell>{stay.check_in_date}</TableCell>
                  <TableCell>{stay.edu_date || '-'}</TableCell>
                  <TableCell className="max-w-[220px] truncate">{stay.notes || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
