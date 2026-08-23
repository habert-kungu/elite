"use client"

import { useEffect, useRef, useState } from "react"

interface DitherImageProps {
  src: string
  className?: string
  invert?: boolean
}

export function DitherImage({ src, className = "", invert = false }: DitherImageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const img = new window.Image()
    img.crossOrigin = "anonymous"
    
    img.onload = () => {
      const scale = 0.5
      canvas.width = Math.floor(img.width * scale)
      canvas.height = Math.floor(img.height * scale)
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      
      const bayerMatrix = [
        [0, 8, 2, 10],
        [12, 4, 14, 6],
        [3, 11, 1, 9],
        [15, 7, 13, 5]
      ]
      
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const i = (y * canvas.width + x) * 4
          const r = data[i] ?? 0
          const g = data[i + 1] ?? 0
          const b = data[i + 2] ?? 0
          const gray = (r * 0.299 + g * 0.587 + b * 0.114)
          const threshold = bayerMatrix[y % 4]![x % 4]! * 16 - 80
          const newValue = gray + threshold > 128 ? (invert ? 20 : 240) : (invert ? 240 : 20)
          
          data[i] = newValue
          data[i + 1] = newValue
          data[i + 2] = newValue
        }
      }
      
      ctx.putImageData(imageData, 0, 0)
      setLoaded(true)
    }
    
    img.onerror = () => {
      setLoaded(true)
    }
    
    img.src = src
  }, [src, invert])

  return (
    <canvas 
      ref={canvasRef} 
      className={`${className} transition-opacity duration-700 ${loaded ? 'opacity-100' : 'opacity-0'}`}
    />
  )
}