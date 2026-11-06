import React, { useEffect } from 'react'
import { fetchMediaByIds, uploadValueToId, type MediaDoc } from '../lib/livePreviewMedia'
import { assetUrl } from '../lib/payload'
import { toPlainShareTitle } from '../lib/seo'

export const LivePreviewListener: React.FC = () => {
  useEffect(() => {
    // Notify parent CMS window that the preview iframe is ready using Payload 3 protocol
    const sendReady = () => {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'payload-live-preview', ready: true }, '*')
      }
    }

    sendReady()
    const readyInterval = setInterval(sendReady, 500)
    const stopReadyTimeout = setTimeout(() => clearInterval(readyInterval), 3000)

    const mediaUrlOf = (media: MediaDoc | null | undefined): string | null =>
      media?.sizes?.hero?.url || media?.url || null

    // featuredImage 在 live preview 裡通常只是媒體 ID，要打一次 API 才拿得到 URL
    const applyCover = async (featuredImage: unknown) => {
      let url = mediaUrlOf(featuredImage as MediaDoc)
      if (!url && typeof featuredImage === 'string' && !/^\d+$/.test(featuredImage)) {
        url = featuredImage
      }
      if (!url) {
        const id = uploadValueToId(featuredImage)
        if (id === null) return
        const media = await fetchMediaByIds([id])
        url = mediaUrlOf(media.get(String(id)))
      }
      if (!url) return
      const heroImg = document.getElementById('post-hero-image') as HTMLImageElement | null
      if (heroImg) heroImg.src = assetUrl(url)
    }

    const handleMessage = (event: MessageEvent) => {
      // Check for Payload Live Preview message events
      if (
        event.data &&
        typeof event.data === 'object' &&
        (event.data.type === 'payload-live-preview' || event.data.data)
      ) {
        const data = event.data.data || event.data

        // 1. Update Title
        if (data.title) {
          const cleanTitle = toPlainShareTitle(data.title)
          const titleEl = document.getElementById('post-title')
          if (titleEl) titleEl.textContent = cleanTitle
          document.title = `${cleanTitle} | SORAI ESPORTS`
        }

        // 2. Update Excerpt / Description
        if (data.excerpt !== undefined) {
          const descEl = document.getElementById('post-description')
          if (descEl) {
            descEl.textContent = data.excerpt || ''
            descEl.style.display = data.excerpt ? 'block' : 'none'
          }
        }

        // 3. Update Hero Cover Image
        void applyCover(data.featuredImage)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => {
      clearInterval(readyInterval)
      clearTimeout(stopReadyTimeout)
      window.removeEventListener('message', handleMessage)
    }
  }, [])

  return null
}
