'use client'

import { useEffect, useState } from 'react'

export const detectEmbeddedWebView = () => {
  if (typeof window === 'undefined') return false

  const userAgent = window.navigator.userAgent.toLowerCase()
  const isAndroidWebView = userAgent.includes(' wv') || userAgent.includes('; wv') || userAgent.includes('webview')
  const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
  const isIosWebView = isIosDevice && userAgent.includes('applewebkit') && !userAgent.includes('safari')
  const hasReactNativeWebViewBridge = 'ReactNativeWebView' in window

  return hasReactNativeWebViewBridge || isAndroidWebView || isIosWebView
}

export function useEmbeddedWebView() {
  const [isEmbeddedWebView, setIsEmbeddedWebView] = useState(false)

  useEffect(() => {
    setIsEmbeddedWebView(detectEmbeddedWebView())
  }, [])

  return isEmbeddedWebView
}
