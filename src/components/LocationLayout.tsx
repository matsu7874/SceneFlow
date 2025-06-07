import React, { useEffect, useRef, useState } from 'react'
import { Person, Location } from '../types/StoryData'
import './LocationLayout.css'

interface LocationLayoutProps {
  persons: Person[]
  locations: Location[]
  personPositions: Map<number, number>
  currentTime: string
}

interface AnimatedPerson {
  person: Person
  currentX: number
  currentY: number
  targetX: number
  targetY: number
  sourceX: number
  sourceY: number
  progress: number
  isMoving: boolean
}

export const LocationLayout: React.FC<LocationLayoutProps> = ({
  persons,
  locations,
  personPositions,
  currentTime,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animatedPersonsRef = useRef<Map<number, AnimatedPerson>>(new Map())
  const animationFrameRef = useRef<number>()
  const previousPositionsRef = useRef<Map<number, number>>(new Map())

  // Calculate location positions on canvas
  const getLocationPositions = () => {
    const locationPositions = new Map<number, { x: number; y: number }>()
    const centerX = 300
    const centerY = 200

    // Find bounds of saved coordinates
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    let hasCoordinates = false

    locations.forEach(location => {
      if (location.x !== undefined && location.y !== undefined) {
        hasCoordinates = true
        minX = Math.min(minX, location.x)
        maxX = Math.max(maxX, location.x)
        minY = Math.min(minY, location.y)
        maxY = Math.max(maxY, location.y)
      }
    })

    if (hasCoordinates) {
      // Use saved coordinates and scale to fit canvas
      const mapWidth = maxX - minX || 1
      const mapHeight = maxY - minY || 1
      const canvasWidth = 500
      const canvasHeight = 300
      const scale = Math.min(canvasWidth / mapWidth, canvasHeight / mapHeight) * 0.8

      locations.forEach(location => {
        if (location.x !== undefined && location.y !== undefined) {
          const x = centerX + (location.x - (minX + maxX) / 2) * scale
          const y = centerY + (location.y - (minY + maxY) / 2) * scale
          locationPositions.set(location.id, { x, y })
        } else {
          // Fallback for locations without coordinates
          const index = locations.indexOf(location)
          const angle = (index / locations.length) * 2 * Math.PI
          const x = centerX + Math.cos(angle) * 150
          const y = centerY + Math.sin(angle) * 150
          locationPositions.set(location.id, { x, y })
        }
      })
    } else {
      // Fallback to circular layout if no coordinates
      const radius = 150
      locations.forEach((location, index) => {
        const angle = (index / locations.length) * 2 * Math.PI
        const x = centerX + Math.cos(angle) * radius
        const y = centerY + Math.sin(angle) * radius
        locationPositions.set(location.id, { x, y })
      })
    }

    return locationPositions
  }

  // Initialize or update animated persons
  useEffect(() => {
    const locationPositions = getLocationPositions()

    persons.forEach(person => {
      const currentLocationId = personPositions.get(person.id)
      const previousLocationId = previousPositionsRef.current.get(person.id)
      const animatedPerson = animatedPersonsRef.current.get(person.id)

      if (currentLocationId !== undefined) {
        const targetPos = locationPositions.get(currentLocationId)

        if (targetPos) {
          if (!animatedPerson) {
            // Initialize new person
            animatedPersonsRef.current.set(person.id, {
              person,
              currentX: targetPos.x,
              currentY: targetPos.y,
              targetX: targetPos.x,
              targetY: targetPos.y,
              sourceX: targetPos.x,
              sourceY: targetPos.y,
              progress: 1,
              isMoving: false,
            })
          } else if (previousLocationId !== currentLocationId && previousLocationId !== undefined) {
            // Person moved to new location
            const sourcePos = locationPositions.get(previousLocationId)
            if (sourcePos) {
              animatedPerson.sourceX = animatedPerson.currentX
              animatedPerson.sourceY = animatedPerson.currentY
              animatedPerson.targetX = targetPos.x
              animatedPerson.targetY = targetPos.y
              animatedPerson.progress = 0
              animatedPerson.isMoving = true
            }
          }
        }
      }
    })

    // Update previous positions
    personPositions.forEach((locationId, personId) => {
      previousPositionsRef.current.set(personId, locationId)
    })
  }, [persons, locations, personPositions])

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const locationPositions = getLocationPositions()

    const animate = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

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
        ctx.textBaseline = 'bottom'
        ctx.fillText(location.name, pos.x, pos.y - 45)
      })

      // Group persons by location for layout calculation
      const personsAtLocations = new Map<number, AnimatedPerson[]>()
      animatedPersonsRef.current.forEach((animatedPerson) => {
        if (!animatedPerson.isMoving) {
          const locationId = personPositions.get(animatedPerson.person.id)
          if (locationId !== undefined) {
            if (!personsAtLocations.has(locationId)) {
              personsAtLocations.set(locationId, [])
            }
            personsAtLocations.get(locationId)?.push(animatedPerson)
          }
        }
      })

      // Calculate positions for persons at same location
      personsAtLocations.forEach((personsHere, locationId) => {
        const pos = locationPositions.get(locationId)
        if (!pos) return

        const count = personsHere.length
        if (count === 1) {
          // Single person at center
          personsHere[0].targetX = pos.x
          personsHere[0].targetY = pos.y
        } else {
          // Multiple persons arranged in circle
          const radius = 25
          personsHere.forEach((animatedPerson, index) => {
            const angle = (index / count) * 2 * Math.PI - Math.PI / 2
            animatedPerson.targetX = pos.x + Math.cos(angle) * radius
            animatedPerson.targetY = pos.y + Math.sin(angle) * radius
          })
        }
      })

      // Update and draw animated persons
      animatedPersonsRef.current.forEach((animatedPerson) => {
        if (animatedPerson.isMoving && animatedPerson.progress < 1) {
          // Ease-out animation
          animatedPerson.progress += 0.02
          const easeProgress = 1 - Math.pow(1 - animatedPerson.progress, 3)

          animatedPerson.currentX = animatedPerson.sourceX +
            (animatedPerson.targetX - animatedPerson.sourceX) * easeProgress
          animatedPerson.currentY = animatedPerson.sourceY +
            (animatedPerson.targetY - animatedPerson.sourceY) * easeProgress

          if (animatedPerson.progress >= 1) {
            animatedPerson.isMoving = false
            animatedPerson.currentX = animatedPerson.targetX
            animatedPerson.currentY = animatedPerson.targetY
          }
        } else if (!animatedPerson.isMoving) {
          // Smoothly move to adjusted position
          const dx = animatedPerson.targetX - animatedPerson.currentX
          const dy = animatedPerson.targetY - animatedPerson.currentY
          if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
            animatedPerson.currentX += dx * 0.1
            animatedPerson.currentY += dy * 0.1
          }
        }

        // Draw person
        const person = animatedPerson.person

        // Draw person circle with color
        ctx.beginPath()
        ctx.arc(animatedPerson.currentX, animatedPerson.currentY, 15, 0, 2 * Math.PI)
        ctx.fillStyle = person.color || '#3B82F6'
        ctx.fill()

        // Add border for better visibility
        ctx.strokeStyle = 'white'
        ctx.lineWidth = 2
        ctx.stroke()

        // Draw person name
        ctx.fillStyle = 'white'
        ctx.font = 'bold 10px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(person.name, animatedPerson.currentX, animatedPerson.currentY)

        // Draw movement trail if moving
        if (animatedPerson.isMoving) {
          ctx.save()
          ctx.strokeStyle = person.color || '#3B82F6'
          ctx.lineWidth = 3
          ctx.globalAlpha = 0.3
          ctx.setLineDash([5, 5])
          ctx.beginPath()
          ctx.moveTo(animatedPerson.sourceX, animatedPerson.sourceY)
          ctx.lineTo(animatedPerson.currentX, animatedPerson.currentY)
          ctx.stroke()
          ctx.restore()
        }
      })

      // Draw person count at each location
      const personCounts = new Map<number, number>()
      persons.forEach(person => {
        const locationId = personPositions.get(person.id)
        if (locationId !== undefined) {
          const animatedPerson = animatedPersonsRef.current.get(person.id)
          if (!animatedPerson?.isMoving) {
            personCounts.set(locationId, (personCounts.get(locationId) || 0) + 1)
          }
        }
      })

      personCounts.forEach((count, locationId) => {
        const pos = locationPositions.get(locationId)
        if (!pos || count === 0) return

        ctx.fillStyle = '#666'
        ctx.font = '12px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(`(${count}人)`, pos.x, pos.y + 45)
      })

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [persons, locations, personPositions, currentTime])

  return (
    <div className="location-layout">
      <h2>場所のレイアウト表示 (<span>{currentTime}</span>)</h2>
      <canvas
        ref={canvasRef}
        width={600}
        height={400}
        className="layout-canvas"
      />
      <div className="layout-legend">
        <p>● キャラクターは色付きの円で表示されます</p>
        <p>--- 移動中のキャラクターは点線で軌跡が表示されます</p>
      </div>
    </div>
  )
}