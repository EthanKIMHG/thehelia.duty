'use client'

import { AuthGuard } from '@/components/auth-guard'
import { MobileNav } from '@/components/mobile-nav'
import { Button } from '@/components/ui/button'
import { ViewSwitcher } from '@/components/view-switcher'
import { useEmbeddedWebView } from '@/hooks/use-embedded-webview'
import { clearSession } from '@/lib/auth'
import { AppView, getAppViewFromPathname } from '@/lib/app-views'
import { cn } from '@/lib/utils'
import { LogOut, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useMemo } from 'react'

const getMainLayoutClassName = (currentView: AppView) => {
  if (currentView === 'room-floor') {
    return 'max-w-[1760px] space-y-6 px-4 py-6 pb-32 md:space-y-8 md:px-8 md:py-10 md:pb-10 xl:px-10';
  }

  return 'max-w-none space-y-6 px-4 py-6 pb-32 md:space-y-8 md:px-8 md:py-10 md:pb-10 xl:px-10';
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isEmbeddedWebView = useEmbeddedWebView()
  const currentView = getAppViewFromPathname(pathname)
  const isCompactExcelWebView = currentView === 'excel' && isEmbeddedWebView

  const todayKstText = useMemo(() => {
    return new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    }).format(new Date())
  }, [])

  const handleLogout = () => {
    clearSession()
    router.replace('/login')
  }

  return (
    <AuthGuard>
      <main className={cn('mx-auto w-full', getMainLayoutClassName(currentView))}>
        <div
          className={cn(
            'flex flex-col items-start justify-between gap-4 md:flex-row md:items-center',
            isCompactExcelWebView && 'gap-2 md:gap-3'
          )}
        >
          <div className={cn('space-y-1 md:space-y-2', isCompactExcelWebView && 'space-y-0.5')}>
            <h1
              className={cn(
                'font-bold tracking-tight',
                isCompactExcelWebView ? 'text-xl md:text-2xl' : 'text-2xl md:text-3xl'
              )}
            >
              The Helia (더 헬리아)
            </h1>
            {isCompactExcelWebView ? (
              <p className="text-[11px] text-muted-foreground md:text-sm">TODAY · KST {todayKstText}</p>
            ) : (
              <p className="text-sm text-muted-foreground md:text-base">직원 관리 및 일정 계획</p>
            )}
          </div>

          <div
            className={cn(
              'flex w-full items-center gap-2 overflow-x-auto hide-scrollbar md:w-auto',
              isCompactExcelWebView ? 'pb-0' : 'pb-1 md:pb-0'
            )}
          >
            <div className="hidden md:block">
              <ViewSwitcher currentView={currentView} />
            </div>
            <div className="ml-auto flex gap-2 md:ml-0">
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

        {!isCompactExcelWebView && (
          <div
            className={cn(
              'rounded-2xl border bg-gradient-to-r from-primary/15 via-primary/5 to-background',
              currentView === 'excel' ? 'px-4 py-4 md:px-5 md:py-5' : 'px-4 py-4 md:px-6 md:py-5'
            )}
          >
            <p className="text-[11px] tracking-[0.16em] text-muted-foreground md:text-xs">TODAY · KST</p>
            <p className="mt-1 text-3xl font-black leading-none tracking-tight md:text-5xl">{todayKstText}</p>
          </div>
        )}

        <div className="w-full">{children}</div>
      </main>
      <MobileNav currentView={currentView} />
    </AuthGuard>
  )
}
