'use client'

import { ExcelView } from '@/components/excel-view'
import { useEmbeddedWebView } from '@/hooks/use-embedded-webview'

export default function ExcelPage() {
  const isEmbeddedWebView = useEmbeddedWebView()

  return <ExcelView compactLayout={isEmbeddedWebView} />
}
