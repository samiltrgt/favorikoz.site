'use client'

import React, { useRef, useEffect, useState, useMemo } from 'react'

type AnimationPhase = 'scatter' | 'line' | 'arc'

interface CardState {
  x: number
  y: number
  rotation: number
  scale: number
  opacity: number
  hovering: boolean
}

interface ImageObject {
  img: HTMLImageElement
  src: string
}

const lerp = (start: number, end: number, t: number) => start * (1 - t) + end * t
const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max)

const TOTAL_IMAGES = 20
const MAX_SCROLL = 3000
const MOBILE_SCROLL_RANGE_VH = 1.5
const IMG_WIDTH = 80
const IMG_HEIGHT = 110
const CORNER_RADIUS = 12

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

const FALLBACK_IMAGE =
  'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect fill="%23e5e7eb" width="300" height="300"/></svg>')

function getImageUrls(products: { image?: string | null }[]): string[] {
  const urls = products.filter((p) => p?.image).map((p) => p.image as string)
  if (urls.length === 0) return Array(TOTAL_IMAGES).fill(FALLBACK_IMAGE)
  const shuffled = shuffle(urls)
  const result: string[] = []
  for (let i = 0; i < TOTAL_IMAGES; i++) {
    result.push(shuffled[i % shuffled.length])
  }
  return result
}

const EMPTY_PRODUCTS: { image?: string | null }[] = []

export default function ScrollHero({ products }: { products?: { image?: string | null }[] }) {
  const productList = useMemo(
    () => (products && Array.isArray(products) ? products : EMPTY_PRODUCTS),
    [products]
  )
  const imageUrls = useMemo(() => getImageUrls(productList), [productList])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [isLoaded, setIsLoaded] = useState(false)
  const [images, setImages] = useState<ImageObject[]>([])
  const [phase, setPhase] = useState<AnimationPhase>('scatter')
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  const scrollRef = useRef(0)
  const targetScrollRef = useRef(0)
  const mousePosRef = useRef({ x: 0, y: 0, canvasX: 0, canvasY: 0 })
  const introProgressRef = useRef(0)
  const isMobileRef = useRef(typeof window !== 'undefined' && window.innerWidth < 768)
  const animationFrameIdRef = useRef(0)
  const yieldTimeoutIdRef = useRef<ReturnType<typeof setTimeout> | 0>(0)

  const scatterPositions = useMemo(
    () =>
      Array.from({ length: TOTAL_IMAGES }).map(() => ({
        x: (Math.random() - 0.5) * 2000,
        y: (Math.random() - 0.5) * 2000,
        rotation: (Math.random() - 0.5) * 180,
      })),
    []
  )

  const cardStatesRef = useRef<CardState[]>(
    Array.from({ length: TOTAL_IMAGES }).map((_, i) => ({
      x: scatterPositions[i].x,
      y: scatterPositions[i].y,
      rotation: scatterPositions[i].rotation,
      scale: 0.6,
      opacity: 0,
      hovering: false,
    }))
  )

  useEffect(() => {
    setIsLoaded(false)
    let loadedCount = 0
    const tempImages: ImageObject[] = []

    imageUrls.forEach((url, i) => {
      const img = new Image()
      img.src = url
      img.onload = () => {
        loadedCount++
        tempImages[i] = { img, src: url }
        if (loadedCount === TOTAL_IMAGES) {
          setImages(tempImages)
          setIsLoaded(true)
        }
      }
      img.onerror = () => {
        loadedCount++
        tempImages[i] = { img, src: url }
        if (loadedCount === TOTAL_IMAGES) {
          setImages(tempImages)
          setIsLoaded(true)
        }
      }
    })
  }, [imageUrls])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let sizeRafId = 0
    const updateSize = () => {
      sizeRafId = requestAnimationFrame(() => {
        if (containerRef.current && canvasRef.current) {
          const w = containerRef.current.clientWidth
          const h = containerRef.current.clientHeight
          isMobileRef.current = w < 768
          setContainerSize({ width: w, height: h })
          canvasRef.current.width = w
          canvasRef.current.height = h
        }
      })
    }

    const ro = new ResizeObserver(updateSize)
    ro.observe(container)
    updateSize()

    const handleScroll = () => {
      if (!isMobileRef.current) return
      const scrollRange = MOBILE_SCROLL_RANGE_VH * window.innerHeight
      const progress = clamp(window.scrollY / scrollRange, 0, 1)
      targetScrollRef.current = progress * MAX_SCROLL
    }

    const handleWheel = (e: WheelEvent) => {
      if (isMobileRef.current) return // Mobilde scroll event ile güncelleniyor, wheel'a dokunma
      const atMax = targetScrollRef.current >= MAX_SCROLL - 10
      const atMin = targetScrollRef.current <= 10
      const scrollingDown = e.deltaY > 0
      const scrollingUp = e.deltaY < 0
      if (atMax && scrollingDown) return
      if (atMin && scrollingUp) return
      e.preventDefault()
      targetScrollRef.current = clamp(targetScrollRef.current + e.deltaY, 0, MAX_SCROLL)
    }

    // getBoundingClientRect'i frame başına bir kez oku (reflow throttle)
    let mouseRafId = 0
    let pendingMouse = { clientX: 0, clientY: 0 }
    const handleMouseMove = (e: MouseEvent) => {
      pendingMouse.clientX = e.clientX
      pendingMouse.clientY = e.clientY
      if (mouseRafId) return
      mouseRafId = requestAnimationFrame(() => {
        mouseRafId = 0
        if (!containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        const canvasX = pendingMouse.clientX - rect.left
        const canvasY = pendingMouse.clientY - rect.top
        mousePosRef.current.x = (canvasX / rect.width) * 2 - 1
        mousePosRef.current.y = (canvasY / rect.height) * 2 - 1
        mousePosRef.current.canvasX = canvasX
        mousePosRef.current.canvasY = canvasY
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    container.addEventListener('wheel', handleWheel, { passive: false })
    container.addEventListener('mousemove', handleMouseMove)

    handleScroll() // Mobilde ilk konumu ayarla

    const timer1 = setTimeout(() => setPhase('line'), 500)
    const timer2 = setTimeout(() => setPhase('arc'), 2500)

    return () => {
      ro.disconnect()
      cancelAnimationFrame(sizeRafId)
      cancelAnimationFrame(mouseRafId)
      window.removeEventListener('scroll', handleScroll)
      container.removeEventListener('wheel', handleWheel)
      container.removeEventListener('mousemove', handleMouseMove)
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [])

  useEffect(() => {
    if (!isLoaded || !canvasRef.current || containerSize.width === 0) return

    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    const drawRoundedRect = (w: number, h: number, r: number) => {
      ctx.beginPath()
      ctx.moveTo(-w / 2 + r, -h / 2)
      ctx.lineTo(w / 2 - r, -h / 2)
      ctx.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r)
      ctx.lineTo(w / 2, h / 2 - r)
      ctx.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2)
      ctx.lineTo(-w / 2 + r, h / 2)
      ctx.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r)
      ctx.lineTo(-w / 2, -h / 2 + r)
      ctx.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2)
      ctx.closePath()
    }

    let frameCount = 0
    const YIELD_EVERY_N_FRAMES = 4

    const render = () => {
      const w = canvasRef.current!.width
      const h = canvasRef.current!.height
      const isMobile = w < 768
      const displayCount = isMobile ? 10 : TOTAL_IMAGES

      scrollRef.current = lerp(scrollRef.current, targetScrollRef.current, 0.1)
      introProgressRef.current = lerp(introProgressRef.current, phase === 'arc' ? 1 : 0, 0.05)

      ctx.clearRect(0, 0, w, h)

      cardStatesRef.current.forEach((state, i) => {
        if (isMobile && i >= displayCount) {
          state.opacity = lerp(state.opacity, 0, 0.08)
          return
        }

        let targetX = 0,
          targetY = 0,
          targetRot = 0,
          targetScale = 1,
          targetOpacity = 1

        if (phase === 'scatter') {
          targetX = scatterPositions[i].x
          targetY = scatterPositions[i].y
          targetRot = scatterPositions[i].rotation
          targetOpacity = 0
        } else {
          // Masaüstü ve mobil birebir aynı: 240° yay, wheel/scroll ile shuffleOffset
          const lineSpacing = 90
          const totalWidth = (displayCount - 1) * lineSpacing
          const lineX = i * lineSpacing - totalWidth / 2
          const lineY = 0
          const lineRot = 0

          const scrollProgress = clamp(scrollRef.current / MAX_SCROLL, 0, 1)
          const arcRadius = isMobile ? w * 1.3 : w * 0.7
          const spreadAngle = 240
          const startAngle = isMobile ? 45 + 180 : -90 - spreadAngle / 2
          const step = spreadAngle / (isMobile ? displayCount - 1 : TOTAL_IMAGES - 1)
          const shuffleOffset = isMobile
            ? -scrollProgress * 180
            : -scrollProgress * spreadAngle * 0.6
          const currentArcAngle = startAngle + i * step + shuffleOffset
          const arcRad = (currentArcAngle * Math.PI) / 180
          const arcCenterY = isMobile ? h * 0.5 : h * 1.08
          const arcX = Math.cos(arcRad) * arcRadius + mousePosRef.current.x * 25
          const arcY = Math.sin(arcRad) * arcRadius + arcCenterY
          const arcRot = currentArcAngle + 90

          targetX = lerp(lineX, arcX, introProgressRef.current)
          targetY = lerp(lineY, arcY, introProgressRef.current)
          targetRot = lerp(lineRot, arcRot, introProgressRef.current)
          targetScale = lerp(1, 1.7, introProgressRef.current)
          targetOpacity = 1
        }

        state.x = lerp(state.x, targetX, 0.08)
        state.y = lerp(state.y, targetY, 0.08)
        state.rotation = lerp(state.rotation, targetRot, 0.08)
        state.scale = lerp(state.scale, targetScale, 0.08)
        state.opacity = lerp(state.opacity, targetOpacity, 0.08)

        const relMouseX = mousePosRef.current.canvasX - w / 2
        const relMouseY = mousePosRef.current.canvasY - h / 2
        const dx = relMouseX - state.x
        const dy = relMouseY - state.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        state.hovering = dist < (IMG_WIDTH * state.scale) / 2

        const currentScale = state.hovering ? state.scale * 1.05 : state.scale

        ctx.save()
        ctx.translate(w / 2 + state.x, h / 2 + state.y)
        ctx.rotate((state.rotation * Math.PI) / 180)
        ctx.scale(currentScale, currentScale)
        ctx.globalAlpha = state.opacity

        ctx.shadowColor = 'rgba(0,0,0,0.12)'
        ctx.shadowBlur = state.hovering ? 20 : 12
        ctx.shadowOffsetY = state.hovering ? 10 : 6

        drawRoundedRect(IMG_WIDTH, IMG_HEIGHT, CORNER_RADIUS)
        ctx.clip()

        if (images[i]) {
          ctx.drawImage(images[i].img, -IMG_WIDTH / 2, -IMG_HEIGHT / 2, IMG_WIDTH, IMG_HEIGHT)
          ctx.fillStyle = 'rgba(0,0,0,0.04)'
          ctx.fill()
        }

        ctx.restore()
      })

      frameCount++
      if (frameCount >= YIELD_EVERY_N_FRAMES) {
        frameCount = 0
        yieldTimeoutIdRef.current = setTimeout(() => {
          yieldTimeoutIdRef.current = 0
          animationFrameIdRef.current = requestAnimationFrame(render)
        }, 0)
      } else {
        animationFrameIdRef.current = requestAnimationFrame(render)
      }
    }

    render()
    return () => {
      if (yieldTimeoutIdRef.current) clearTimeout(yieldTimeoutIdRef.current)
      cancelAnimationFrame(animationFrameIdRef.current)
    }
  }, [isLoaded, phase, images, containerSize])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[100vh] overflow-hidden flex items-center justify-center bg-black/30"
    >
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -right-60 -top-10 flex flex-col items-end blur-xl">
          <div className="h-40 w-[60rem] rounded-full bg-gradient-to-b from-[#2c2520] to-[#f5f0e8] blur-3xl opacity-90" />
          <div className="h-40 w-[90rem] rounded-full bg-gradient-to-b from-[#c4a090] to-[#e8dfd4] blur-3xl opacity-90" />
          <div className="h-40 w-[60rem] rounded-full bg-gradient-to-b from-[#d4c4b0] to-[#f5f0e8] blur-3xl opacity-80" />
        </div>
      </div>
      <canvas ref={canvasRef} className="relative z-10 block w-full h-full cursor-default" />
      <div className="absolute inset-0 z-20 flex items-center justify-center pt-[18vh] md:pt-0 pointer-events-none px-4">
        <h1
          className="text-2xl font-semibold text-center text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.4)] leading-tight min-h-[32px]"
          aria-label="Favori Kozmetik"
        >
          Favori Kozmetik
        </h1>
      </div>
      <div
        className="absolute bottom-0 left-0 right-0 z-10 h-48 pointer-events-none bg-gradient-to-b from-black/20 via-transparent to-white hidden md:block"
        aria-hidden
      />

      {!isLoaded && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 border-4 border-gray-100 border-t-blue-500 rounded-full animate-spin" />
          </div>
        </div>
      )}
    </div>
  )
}
