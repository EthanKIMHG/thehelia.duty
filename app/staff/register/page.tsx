'use client'

import { AuthGuard } from '@/components/auth-guard'
import { StaffForm } from '@/components/staff-form'
import { StaffList } from '@/components/staff-list'

export default function RegisterStaffPage() {
  return (
    <AuthGuard>
      <div className="container mx-auto py-6 pb-24 md:py-10 max-w-6xl md:px-10 px-4">
        <div className="flex flex-col lg:flex-row gap-8 md:gap-12">
          {/* Left Column: Form */}
          <div className="w-full lg:w-1/3 min-w-[320px] space-y-6">
              <div>
                  <h1 className="text-3xl font-bold tracking-tight">직원 등록</h1>
                  <p className="text-muted-foreground">새로운 직원을시스템에 등록합니다.</p>
              </div>
              <StaffForm />
          </div>

          {/* Right Column: List */}
          <div className="w-full lg:w-2/3 space-y-6">
               <div className="flex items-center justify-between border-b pb-4">
                  <div>
                      <h2 className="text-2xl font-bold tracking-tight">등록된 직원 현황</h2>
                      <p className="text-muted-foreground">현재 근무 가능한 전체 인원 리스트입니다.</p>
                  </div>
              </div>
              {/* Replaced StaffBento with the new grid structure */}
              <div>
                  <StaffList />
              </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
