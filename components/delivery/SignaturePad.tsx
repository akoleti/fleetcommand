'use client'

import React, { useRef, useState, useCallback } from 'react'

interface SignaturePadProps {
  onSave: (blob: Blob) => Promise<void>
  onCancel: () => void
  disabled?: boolean
}

export function SignaturePad({ onSave, onCancel, disabled }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [saving, setSaving] = useState(false)

  const getCoords = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }, [])

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (disabled) return
    setIsDrawing(true)
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = getCoords(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }, [disabled, getCoords])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (!isDrawing || disabled) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = getCoords(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }, [isDrawing, disabled, getCoords])

  const endDraw = useCallback(() => {
    setIsDrawing(false)
  }, [])

  const clear = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }, [])

  const handleSave = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    const isEmpty = !data.some((v, i) => i % 4 === 3 && v > 10)
    if (isEmpty) return
    setSaving(true)
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Failed to create blob'))), 'image/png')
      })
      await onSave(blob)
    } finally {
      setSaving(false)
    }
  }, [onSave])

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  return (
    <div className="space-y-3">
      <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-40 touch-none cursor-crosshair block"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
          style={{ width: '100%', height: 160 }}
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || disabled}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Save signature'}
        </button>
        <button
          type="button"
          onClick={clear}
          disabled={disabled}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
