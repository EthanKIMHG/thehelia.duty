'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { authFetch } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Staff } from '@/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { GripVertical, Loader2, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

export function StaffList() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  // State for Dialogs
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  const [newName, setNewName] = useState('')
  const [newEmploymentType, setNewEmploymentType] = useState<Staff['employment_type']>('full-time')
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [orderedStaff, setOrderedStaff] = useState<Staff[]>([])
  const [draggingStaffId, setDraggingStaffId] = useState<string | null>(null)
  const [dragOverStaffId, setDragOverStaffId] = useState<string | null>(null)
  const [dragHandleStaffId, setDragHandleStaffId] = useState<string | null>(null)

  const { isPending, error, data } = useQuery<Staff[]>({
    queryKey: ['staff'],
    queryFn: async () => {
        const res = await authFetch('/api/staff')
        if (!res.ok) throw new Error('Network response was not ok')
        return res.json()
    }
  })

  // Mutations
  const updateMutation = useMutation({
    mutationFn: async ({ id, name, employment_type }: { id: string, name: string, employment_type: Staff['employment_type'] }) => {
        const res = await authFetch('/api/staff', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, name, employment_type }),
        })
        if (!res.ok) throw new Error('Failed to update staff')
        return res.json()
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['staff'] })
        toast({ title: "수정 완료", description: "직원 정보가 수정되었습니다." })
        setIsEditDialogOpen(false)
    },
    onError: () => {
        toast({ variant: "destructive", title: "오류 발생", description: "직원 정보 수정 중 오류가 발생했습니다." })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
        const res = await authFetch(`/api/staff?id=${id}`, {
            method: 'DELETE',
        })
        if (!res.ok) throw new Error('Failed to delete staff')
        return res.json()
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['staff'] })
        toast({ title: "삭제 완료", description: "직원이 삭제되었습니다." })
        setIsDeleteDialogOpen(false)
    },
    onError: () => {
        toast({ variant: "destructive", title: "오류 발생", description: "직원 삭제 중 오류가 발생했습니다." })
    }
  })

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const res = await authFetch('/api/staff', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ordered_ids: orderedIds })
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || 'Failed to reorder staff')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
    },
    onError: () => {
      toast({ variant: "destructive", title: "오류 발생", description: "직원 순서 저장 중 오류가 발생했습니다." })
      setOrderedStaff(data || [])
    }
  })

  const handleEditClick = (staff: Staff) => {
      setSelectedStaff(staff)
      setNewName(staff.name)
      setNewEmploymentType(staff.employment_type)
      setIsEditDialogOpen(true)
  }

  const handleDeleteClick = (staff: Staff) => {
      setSelectedStaff(staff)
      setIsDeleteDialogOpen(true)
  }

  const handleUpdateConfirm = () => {
      if (selectedStaff && newName.trim()) {
          updateMutation.mutate({
            id: selectedStaff.id,
            name: newName.trim(),
            employment_type: newEmploymentType
          })
      }
  }

  const handleDeleteConfirm = () => {
      if (selectedStaff) {
          deleteMutation.mutate(selectedStaff.id)
      }
  }

  useEffect(() => {
    setOrderedStaff(data || [])
  }, [data])

  const getReorderedStaff = (sourceId: string, targetId: string) => {
    if (!sourceId || !targetId || sourceId === targetId) return

    const sourceIndex = orderedStaff.findIndex((staff) => staff.id === sourceId)
    const targetIndex = orderedStaff.findIndex((staff) => staff.id === targetId)
    if (sourceIndex < 0 || targetIndex < 0) return

    const next = [...orderedStaff]
    const [moved] = next.splice(sourceIndex, 1)
    next.splice(targetIndex, 0, moved)
    return next
  }

  const persistReorder = async (sourceId: string, targetId: string) => {
    const next = getReorderedStaff(sourceId, targetId)
    if (!next) return

    setOrderedStaff(next)
    await reorderMutation.mutateAsync(next.map((staff) => staff.id))
  }

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
              <TableHead className="w-[100px] text-center">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orderedStaff.map((staff) => (
              <TableRow
                key={staff.id}
                draggable={dragHandleStaffId === staff.id}
                onDragStart={(e) => {
                  if (dragHandleStaffId !== staff.id) {
                    e.preventDefault()
                    return
                  }
                  setDraggingStaffId(staff.id)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onDragOver={(e) => {
                  if (!draggingStaffId || draggingStaffId === staff.id) return
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  setDragOverStaffId(staff.id)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  if (!draggingStaffId || draggingStaffId === staff.id) return
                  void persistReorder(draggingStaffId, staff.id)
                  setDragOverStaffId(null)
                }}
                onDragEnd={() => {
                  setDraggingStaffId(null)
                  setDragOverStaffId(null)
                  setDragHandleStaffId(null)
                }}
                className={cn(
                  draggingStaffId === staff.id && 'opacity-50',
                  dragOverStaffId === staff.id && draggingStaffId !== staff.id && 'bg-primary/10'
                )}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
                      onMouseDown={() => setDragHandleStaffId(staff.id)}
                      onMouseUp={() => setDragHandleStaffId(null)}
                      onMouseLeave={() => {
                        if (draggingStaffId !== staff.id) {
                          setDragHandleStaffId(null)
                        }
                      }}
                      title="드래그해서 순서 변경"
                    >
                      <GripVertical className="h-4 w-4" />
                    </Button>
                    <span>{staff.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={staff.job_title === 'nurse' ? 'default' : 'secondary'}>
                      {staff.job_title === 'nurse' ? '간호사' : '조무사'}
                  </Badge>
                </TableCell>
                <TableCell>{staff.employment_type === 'full-time' ? '정규직' : '계약직'}</TableCell>
                <TableCell className="text-right">{staff.max_capacity}명</TableCell>
                <TableCell>
                    <div className="flex items-center justify-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick(staff)}>
                            <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteClick(staff)}>
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                    </div>
                </TableCell>
              </TableRow>
            ))}
            {orderedStaff.length === 0 && (
              <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                      등록된 직원이 없습니다.
                  </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4 p-4">
        {orderedStaff.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
             등록된 직원이 없습니다.
          </div>
        )}
        {orderedStaff.map((staff) => (
          <Card
            key={staff.id}
            className={cn(
              "overflow-hidden",
              draggingStaffId === staff.id && 'opacity-50',
              dragOverStaffId === staff.id && draggingStaffId !== staff.id && 'bg-primary/10'
            )}
            draggable={dragHandleStaffId === staff.id}
            onDragStart={(e) => {
              if (dragHandleStaffId !== staff.id) {
                e.preventDefault()
                return
              }
              setDraggingStaffId(staff.id)
              e.dataTransfer.effectAllowed = 'move'
            }}
            onDragOver={(e) => {
              if (!draggingStaffId || draggingStaffId === staff.id) return
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
              setDragOverStaffId(staff.id)
            }}
            onDrop={(e) => {
              e.preventDefault()
              if (!draggingStaffId || draggingStaffId === staff.id) return
              void persistReorder(draggingStaffId, staff.id)
              setDragOverStaffId(null)
            }}
            onDragEnd={() => {
              setDraggingStaffId(null)
              setDragOverStaffId(null)
              setDragHandleStaffId(null)
            }}
          >
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
                    onMouseDown={() => setDragHandleStaffId(staff.id)}
                    onMouseUp={() => setDragHandleStaffId(null)}
                    onMouseLeave={() => {
                      if (draggingStaffId !== staff.id) {
                        setDragHandleStaffId(null)
                      }
                    }}
                    title="드래그해서 순서 변경"
                  >
                    <GripVertical className="h-4 w-4" />
                  </Button>
                  <CardTitle className="text-base font-bold">{staff.name}</CardTitle>
                  <Badge variant={staff.job_title === 'nurse' ? 'default' : 'secondary'}>
                      {staff.job_title === 'nurse' ? '간호사' : '조무사'}
                  </Badge>
              </div>
              <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick(staff)}>
                      <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteClick(staff)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2 text-sm text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>고용 형태:</span>
                <span className="font-medium text-foreground">{staff.employment_type === 'full-time' ? '정규직' : '계약직'}</span>
              </div>
              <div className="flex justify-between">
                <span>케어 인원:</span>
                <span className="font-medium text-foreground">{staff.max_capacity}명</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>직원 정보 수정</DialogTitle>
                  <DialogDescription>
                      직원의 이름과 고용 형태를 수정합니다.
                  </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">
                          이름
                      </Label>
                      <Input
                          id="name"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className="col-span-3"
                      />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="employment_type" className="text-right">
                          고용 형태
                      </Label>
                      <div className="col-span-3">
                        <Select
                          value={newEmploymentType}
                          onValueChange={(value) => setNewEmploymentType(value as Staff['employment_type'])}
                        >
                          <SelectTrigger id="employment_type">
                            <SelectValue placeholder="고용 형태 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full-time">정규직</SelectItem>
                            <SelectItem value="part-time">계약직</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                  </div>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>취소</Button>
                  <Button onClick={handleUpdateConfirm} disabled={updateMutation.isPending}>
                      {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      저장
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>직원 삭제</DialogTitle>
                  <DialogDescription>
                      정말로 <span className="font-bold text-foreground mx-1">{selectedStaff?.name}</span> 직원을 삭제하시겠습니까? <br/>
                      이 작업은 되돌릴 수 없으며, 모든 근무 기록이 함께 삭제될 수 있습니다.
                  </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>취소</Button>
                  <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleteMutation.isPending}>
                      {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      삭제
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
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
