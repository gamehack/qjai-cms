'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type PublishPreview = {
  draftCount?: number
  error?: string
}

type PublishResult = {
  draftCountBefore: number
  publishedCount: number
  failedCount: number
  skippedCount: number
  remainingDraftCount: number
  error?: string
}

async function readJson<T>(response: Response): Promise<T | null> {
  try {
    return await response.json() as T
  } catch {
    return null
  }
}

export function PublishAllDraftsButtonClient() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function publishAll() {
    if (busy) return
    setBusy(true)
    setMessage('')

    try {
      const previewResponse = await fetch('/api/articles/publish-all', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      })
      const preview = await readJson<PublishPreview>(previewResponse)

      if (!previewResponse.ok || typeof preview?.draftCount !== 'number') {
        setMessage('无法获取草稿数量，请刷新页面后重试。')
        return
      }

      if (preview.draftCount === 0) {
        setMessage('当前没有待发布的草稿。')
        return
      }

      const confirmed = window.confirm(
        `当前有 ${preview.draftCount} 篇草稿。确认全部发布到潜界 AI 网站吗？发布后将立即公开展示。`,
      )
      if (!confirmed) return

      const publishResponse = await fetch('/api/articles/publish-all', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
      })
      const result = await readJson<PublishResult>(publishResponse)

      if (!publishResponse.ok || !result) {
        setMessage('服务器未返回明确结果。请刷新文章列表检查状态，不要连续重复提交。')
        router.refresh()
        return
      }

      const parts = [
        `成功发布 ${result.publishedCount} 篇`,
        result.failedCount ? `失败 ${result.failedCount} 篇` : '',
        result.skippedCount ? `跳过 ${result.skippedCount} 篇` : '',
        result.remainingDraftCount ? `仍有 ${result.remainingDraftCount} 篇草稿` : '',
      ].filter(Boolean)

      setMessage(`批量发布完成：${parts.join('；')}。`)
      router.refresh()
    } catch {
      setMessage('请求未能完成。请刷新文章列表检查状态，不要连续重复提交。')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="qjai-publish-all">
      <button
        className="btn btn--style-primary"
        type="button"
        onClick={publishAll}
        disabled={busy}
        aria-busy={busy}
      >
        {busy ? '发布中…' : '全部发布'}
      </button>
      <span className="qjai-publish-all__message" role="status" aria-live="polite">
        {message}
      </span>
    </div>
  )
}
