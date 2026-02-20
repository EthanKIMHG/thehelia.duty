'use client'

import { AuthGuard } from '@/components/auth-guard'
import { MobileNav } from '@/components/mobile-nav'
import { Button } from '@/components/ui/button'
import { ViewSwitcher } from '@/components/view-switcher'
import { clearSession } from '@/lib/auth'
import { LogOut, UserPlus } from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

const ViewLoadingFallback = () => (
  <div className="space-y-3">
    <div className="h-12 rounded-lg bg-muted/40 animate-pulse" />
    <div className="h-40 rounded-lg bg-muted/30 animate-pulse" />
    <div className="h-40 rounded-lg bg-muted/20 animate-pulse" />
  </div>
)

const ExcelView = dynamic(
  () => import('@/components/excel-view').then((mod) => mod.ExcelView),
  { ssr: false, loading: ViewLoadingFallback }
)
const CalendarView = dynamic(
  () => import('@/components/calendar-view').then((mod) => mod.CalendarView),
  { ssr: false, loading: ViewLoadingFallback }
)
const RoomView = dynamic(
  () => import('@/components/room-view').then((mod) => mod.RoomView),
  { ssr: false, loading: ViewLoadingFallback }
)

export default function Home() {
  const [currentView, setCurrentView] = useState<'excel' | 'calendar' | 'room'>('excel')
  const router = useRouter()

  const todayKstText = useMemo(() => {
    const parts = new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    }).format(new Date())

    return parts
  }, [])

  const handleLogout = () => {
    clearSession()
    router.replace('/login')
  }

  return (
    <AuthGuard>
      <main className="container mx-auto py-6 md:py-10 space-y-6 md:space-y-8 pb-32 md:pb-10 md:px-10 px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1 md:space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">The Helia (더 헬리아)</h1>
            <p className="text-sm md:text-base text-muted-foreground">직원 관리 및 일정 계획</p>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
            <div className="hidden md:block">
              <ViewSwitcher currentView={currentView} onViewChange={setCurrentView} />
            </div>
            <div className="flex gap-2 ml-auto md:ml-0">
              {currentView === 'excel' && (
                <Button asChild size="sm" className="h-9">
                  <Link href="/staff/register">
                    <UserPlus className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">직원 등록</span>
                    <span className="sm:hidden">등록</span>
                  </Link>
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={handleLogout} title="로그아웃">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-gradient-to-r from-primary/15 via-primary/5 to-background px-4 py-4 md:px-6 md:py-5">
          <p className="text-[11px] md:text-xs tracking-[0.16em] text-muted-foreground">TODAY · KST</p>
          <p className="mt-1 text-3xl md:text-5xl font-black tracking-tight leading-none">{todayKstText}</p>
        </div>

        <div className="w-full">
          {currentView === 'excel' && <ExcelView />}
          {currentView === 'calendar' && <CalendarView />}
          {currentView === 'room' && <RoomView />}
        </div>
      </main>
      <MobileNav currentView={currentView} onViewChange={setCurrentView} />
    </AuthGuard>
  )
}
