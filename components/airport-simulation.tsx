'use client'

import { useEffect, useRef, useState } from 'react'

interface Plane {
  id: number
  x: number
  y: number
  speed: number
  size: number
  direction: 'left' | 'right'
  altitude: 'high' | 'mid' | 'low'
  opacity: number
}

interface Cloud {
  id: number
  x: number
  y: number
  width: number
  speed: number
  opacity: number
}

interface BoardRow {
  time: string
  destination: string
  gate: string
  status: string
  statusColor: string
}

const DESTINATIONS = [
  'Onboarding', 'HR Desk', 'IT Setup', 'Badge Office',
  'Welcome Lounge', 'Team Meeting', 'Training Room', 'Office Tour',
  'Parking Pass', 'Security Brief', 'Lunch & Learn', 'Mentor Match',
]

const STATUSES = [
  { text: 'On Time', color: 'text-green-400' },
  { text: 'Boarding', color: 'text-yellow-400' },
  { text: 'Departed', color: 'text-blue-400' },
  { text: 'Arrived', color: 'text-green-400' },
  { text: 'Gate Open', color: 'text-cyan-400' },
]

function generateTime(): string {
  const h = Math.floor(Math.random() * 14) + 6
  const m = Math.floor(Math.random() * 4) * 15
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

function generateGate(): string {
  const letter = String.fromCharCode(65 + Math.floor(Math.random() * 4))
  return `${letter}${Math.floor(Math.random() * 20) + 1}`
}

function generateBoardRows(): BoardRow[] {
  const shuffled = [...DESTINATIONS].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 6).map(dest => {
    const status = STATUSES[Math.floor(Math.random() * STATUSES.length)]
    return {
      time: generateTime(),
      destination: dest,
      gate: generateGate(),
      status: status.text,
      statusColor: status.color,
    }
  }).sort((a, b) => a.time.localeCompare(b.time))
}

export function AirportSimulation() {
  const [planes, setPlanes] = useState<Plane[]>([])
  const [clouds, setClouds] = useState<Cloud[]>([])
  const [boardRows, setBoardRows] = useState<BoardRow[]>(generateBoardRows)
  const frameRef = useRef<number>(0)
  const planeIdRef = useRef(0)
  const cloudIdRef = useRef(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setBoardRows(prev => {
        const rows = [...prev]
        const idx = Math.floor(Math.random() * rows.length)
        const status = STATUSES[Math.floor(Math.random() * STATUSES.length)]
        rows[idx] = { ...rows[idx], status: status.text, statusColor: status.color }
        return rows
      })
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const initialClouds: Cloud[] = Array.from({ length: 5 }, () => ({
      id: cloudIdRef.current++,
      x: Math.random() * 100,
      y: Math.random() * 40 + 5,
      width: Math.random() * 120 + 80,
      speed: Math.random() * 0.015 + 0.005,
      opacity: Math.random() * 0.15 + 0.05,
    }))
    setClouds(initialClouds)

    const initialPlanes: Plane[] = Array.from({ length: 2 }, () => {
      const dir = Math.random() > 0.5 ? 'right' : 'left' as const
      return {
        id: planeIdRef.current++,
        x: dir === 'right' ? Math.random() * 40 : 60 + Math.random() * 40,
        y: Math.random() * 30 + 10,
        speed: Math.random() * 0.03 + 0.02,
        size: Math.random() * 8 + 12,
        direction: dir,
        altitude: ['high', 'mid', 'low'][Math.floor(Math.random() * 3)] as Plane['altitude'],
        opacity: Math.random() * 0.3 + 0.2,
      }
    })
    setPlanes(initialPlanes)
  }, [])

  useEffect(() => {
    let lastTime = performance.now()

    const spawnPlane = () => {
      const dir = Math.random() > 0.5 ? 'right' : 'left' as const
      const altitude = ['high', 'mid', 'low'][Math.floor(Math.random() * 3)] as Plane['altitude']
      const yRange = altitude === 'high' ? [5, 20] : altitude === 'mid' ? [20, 40] : [40, 55]
      return {
        id: planeIdRef.current++,
        x: dir === 'right' ? -5 : 105,
        y: yRange[0] + Math.random() * (yRange[1] - yRange[0]),
        speed: Math.random() * 0.03 + 0.015,
        size: altitude === 'high' ? 10 : altitude === 'mid' ? 14 : 18,
        direction: dir,
        altitude,
        opacity: altitude === 'high' ? 0.15 : altitude === 'mid' ? 0.25 : 0.35,
      }
    }

    const animate = (time: number) => {
      const delta = (time - lastTime) / 16
      lastTime = time

      setPlanes(prev => {
        let updated = prev.map(p => ({
          ...p,
          x: p.direction === 'right' ? p.x + p.speed * delta : p.x - p.speed * delta,
        })).filter(p => p.x > -10 && p.x < 110)

        if (updated.length < 3 && Math.random() < 0.008 * delta) {
          updated = [...updated, spawnPlane()]
        }
        return updated
      })

      setClouds(prev => {
        let updated = prev.map(c => ({
          ...c,
          x: c.x + c.speed * delta,
        })).filter(c => c.x < 120)

        if (updated.length < 6 && Math.random() < 0.003 * delta) {
          updated = [...updated, {
            id: cloudIdRef.current++,
            x: -15,
            y: Math.random() * 40 + 5,
            width: Math.random() * 120 + 80,
            speed: Math.random() * 0.015 + 0.005,
            opacity: Math.random() * 0.15 + 0.05,
          }]
        }
        return updated
      })

      frameRef.current = requestAnimationFrame(animate)
    }

    frameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameRef.current)
  }, [])

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
      {/* Sky gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-200 via-blue-100 to-amber-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700" />

      {/* Stars (dark mode only) */}
      <div className="absolute inset-0 hidden dark:block">
        {Array.from({ length: 30 }, (_, i) => (
          <div
            key={`star-${i}`}
            className="absolute rounded-full bg-white"
            style={{
              left: `${(i * 37 + 13) % 100}%`,
              top: `${(i * 23 + 7) % 50}%`,
              width: i % 3 === 0 ? 2 : 1,
              height: i % 3 === 0 ? 2 : 1,
              opacity: 0.3 + (i % 5) * 0.1,
              animation: `twinkle ${2 + (i % 3)}s ease-in-out infinite`,
              animationDelay: `${(i * 0.4) % 3}s`,
            }}
          />
        ))}
      </div>

      {/* Clouds */}
      {clouds.map(cloud => (
        <div
          key={cloud.id}
          className="absolute"
          style={{
            left: `${cloud.x}%`,
            top: `${cloud.y}%`,
            opacity: cloud.opacity,
            transition: 'none',
          }}
        >
          <svg width={cloud.width} height={cloud.width * 0.4} viewBox="0 0 200 80">
            <ellipse cx="70" cy="50" rx="60" ry="25" fill="white" className="dark:fill-slate-600" />
            <ellipse cx="110" cy="40" rx="45" ry="30" fill="white" className="dark:fill-slate-600" />
            <ellipse cx="140" cy="55" rx="40" ry="20" fill="white" className="dark:fill-slate-600" />
            <ellipse cx="50" cy="55" rx="35" ry="18" fill="white" className="dark:fill-slate-600" />
          </svg>
        </div>
      ))}

      {/* Planes */}
      {planes.map(plane => (
        <div
          key={plane.id}
          className="absolute"
          style={{
            left: `${plane.x}%`,
            top: `${plane.y}%`,
            opacity: plane.opacity,
            transform: `scaleX(${plane.direction === 'left' ? -1 : 1})`,
            transition: 'none',
          }}
        >
          <svg width={plane.size} height={plane.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600 dark:text-slate-300">
            <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
          </svg>
          {plane.altitude === 'low' && (
            <div
              className="absolute top-full left-1/2 w-px bg-gradient-to-b from-white/30 to-transparent dark:from-slate-400/20"
              style={{ height: plane.size * 2.5, transform: 'translateX(-50%)' }}
            />
          )}
        </div>
      ))}

      {/* Ground / horizon */}
      <div className="absolute bottom-0 left-0 right-0 h-[18%]">
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-800/30 via-emerald-700/15 to-transparent dark:from-slate-900/50 dark:via-slate-800/20" />

        {/* Runway */}
        <div className="absolute bottom-[20%] left-[10%] right-[10%] h-[3px] bg-slate-400/30 dark:bg-slate-500/20 rounded-full">
          {Array.from({ length: 12 }, (_, i) => (
            <div
              key={`mark-${i}`}
              className="absolute top-0 h-full w-4 bg-white/40 dark:bg-white/15 rounded-full"
              style={{ left: `${(i + 0.5) * (100 / 12)}%` }}
            />
          ))}
        </div>

        {/* Runway lights */}
        <div className="absolute bottom-[18%] left-[8%] right-[8%] flex justify-between">
          {Array.from({ length: 16 }, (_, i) => (
            <div
              key={`light-${i}`}
              className="w-1 h-1 rounded-full bg-amber-400/60 dark:bg-amber-500/40"
              style={{
                animation: `pulse-light 2s ease-in-out infinite`,
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>

        {/* Terminal silhouette */}
        <div className="absolute bottom-[25%] left-[30%] w-[40%] h-[35%] opacity-[0.08] dark:opacity-[0.06]">
          <div className="absolute bottom-0 left-0 right-0 h-[60%] bg-slate-900 dark:bg-white rounded-t-sm" />
          <div className="absolute bottom-[60%] left-[15%] right-[15%] h-[30%] bg-slate-900 dark:bg-white rounded-t-md" />
          <div className="absolute bottom-[80%] left-[40%] w-[20%] h-[25%] bg-slate-900 dark:bg-white rounded-t-lg" />
        </div>
      </div>

      {/* Departure board (positioned left side) */}
      <div className="absolute top-[12%] left-[5%] w-[280px] opacity-80 hidden lg:block pointer-events-auto">
        <div className="bg-slate-900/90 dark:bg-black/80 rounded-lg border border-slate-700/50 backdrop-blur-sm shadow-2xl overflow-hidden">
          <div className="px-3 py-2 bg-slate-800/80 border-b border-slate-700/50 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-amber-400 uppercase">
              Departures
            </span>
            <span className="ml-auto text-[9px] font-mono text-slate-400">
              Airport
            </span>
          </div>
          <div className="divide-y divide-slate-800/50">
            <div className="grid grid-cols-[42px_1fr_36px_60px] gap-1 px-3 py-1.5 text-[8px] font-mono text-slate-500 uppercase tracking-wider">
              <span>Time</span>
              <span>Destination</span>
              <span>Gate</span>
              <span className="text-right">Status</span>
            </div>
            {boardRows.map((row, i) => (
              <div
                key={i}
                className="grid grid-cols-[42px_1fr_36px_60px] gap-1 px-3 py-1.5 text-[10px] font-mono text-slate-200 transition-all duration-700"
              >
                <span className="text-amber-400/90">{row.time}</span>
                <span className="truncate">{row.destination}</span>
                <span className="text-slate-400">{row.gate}</span>
                <span className={`text-right ${row.statusColor} transition-colors duration-700`}>
                  {row.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Inline keyframes */}
      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.6; }
        }
        @keyframes pulse-light {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.3); }
        }
      `}</style>
    </div>
  )
}
