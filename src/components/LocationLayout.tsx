import React, { useEffect, useRef } from 'react'
import { Person, Location } from '../types/StoryData'
import './LocationLayout.css'

interface LocationLayoutProps {
  persons: Person[]
  locations: Location[]
  personPositions: Map<number, number>
  currentTime: string
}

export const LocationLayout: React.FC<LocationLayoutProps> = ({
  persons,
  locations,
  personPositions,
  currentTime
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Calculate layout positions
    const locationPositions = new Map<number, { x: number; y: number }>()
    const radius = 150
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2

    locations.forEach((location, index) => {
      const angle = (index / locations.length) * 2 * Math.PI
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius
      locationPositions.set(location.id, { x, y })
    })

    // Draw connections
    ctx.strokeStyle = '#ccc'
    ctx.lineWidth = 2
    locations.forEach(location => {
      const fromPos = locationPositions.get(location.id)
      if (!fromPos) return

      location.connections.forEach(connId => {
        const toPos = locationPositions.get(connId)
        if (!toPos) return

        ctx.beginPath()
        ctx.moveTo(fromPos.x, fromPos.y)
        ctx.lineTo(toPos.x, toPos.y)
        ctx.stroke()
      })
    })

    // Draw locations
    locations.forEach(location => {
      const pos = locationPositions.get(location.id)
      if (!pos) return

      // Draw location circle
      ctx.fillStyle = '#f8f9fa'
      ctx.strokeStyle = '#333'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, 40, 0, 2 * Math.PI)
      ctx.fill()
      ctx.stroke()

      // Draw location name
      ctx.fillStyle = '#333'
      ctx.font = '14px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(location.name, pos.x, pos.y - 20)

      // Draw persons at location
      const personsHere = persons.filter(p => personPositions.get(p.id) === location.id)
      personsHere.forEach((person, index) => {
        const offsetY = index * 15
        ctx.fillStyle = person.color || '#000'
        ctx.font = 'bold 12px sans-serif'
        ctx.fillText(person.name, pos.x, pos.y + offsetY)
      })
    })
  }, [persons, locations, personPositions])

  return (
    <div className="location-layout">
      <h2>場所のレイアウト表示 (<span>{currentTime}</span>)</h2>
      <canvas 
        ref={canvasRef} 
        width={600} 
        height={400}
        className="layout-canvas"
      />
    </div>
  )
}