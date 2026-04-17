export type AppView = 'excel' | 'calendar' | 'room-floor'

export const APP_VIEW_ITEMS: Array<{
  href: string
  label: string
  mobileLabel: string
  view: AppView
}> = [
  {
    view: 'excel',
    href: '/excel',
    label: '엑셀 뷰',
    mobileLabel: '엑셀 뷰',
  },
  {
    view: 'calendar',
    href: '/calendar',
    label: '캘린더 뷰',
    mobileLabel: '캘린더',
  },
  {
    view: 'room-floor',
    href: '/room-floor',
    label: '객실 현황',
    mobileLabel: '객실 현황',
  },
]

export const getAppViewFromPathname = (pathname: string): AppView => {
  if (pathname.startsWith('/calendar')) return 'calendar'
  if (pathname.startsWith('/room-floor')) return 'room-floor'
  return 'excel'
}
