import { useState, useEffect, useCallback } from 'react'
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts'

interface Room {
  id: number
  name: string
  capacity: number
  floor: number
  building: string
}

interface SensorReading {
  id: number
  room_id: number
  sensor_type: string
  value: number
  timestamp: string
}

const DEMO_ROOMS: Room[] = [
  { id: 6, name: 'Hallway 2', capacity: 100, floor: 2, building: 'Main Building' },
  { id: 5, name: 'Hallway 1', capacity: 100, floor: 1, building: 'Main Building' },
  { id: 1, name: 'Classroom A', capacity: 40, floor: 1, building: 'Main Building' },
  { id: 2, name: 'Classroom B', capacity: 30, floor: 1, building: 'Main Building' },
  { id: 3, name: 'Computer Lab', capacity: 25, floor: 2, building: 'Main Building' },
  { id: 4, name: 'Library Study Area', capacity: 50, floor: 2, building: 'Main Building' },
]

const OCCUPANCY: Record<number, number[]> = {
  1: [0.7, 0.7, 0, 0, 0, 0.6, 0.3, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
  2: [0, 0, 0, 0, 0, 0, 0, 0, 0.6, 0.6, 0.1, 0.1, 0.1, 0.1, 0.4, 0.4, 0, 0, 0, 0, 0, 0, 0, 0],
  3: [0, 0, 0, 0, 0, 0, 0, 0, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.4, 0.4, 0.1, 0, 0, 0, 0],
  4: [0.4, 0.4, 0.4, 0.4, 0.4, 0.3, 0.3, 0.4, 0.5, 0.6, 0.6, 0.7, 0.7, 0.6, 0.5, 0.5, 0.4, 0.4, 0.4, 0.4, 0.3, 0.3, 0.4, 0.4],
  5: [0, 0, 0, 0, 0, 0.05, 0.15, 0.2, 0.24, 0.18, 0.12, 0.2, 0.22, 0.18, 0.24, 0.16, 0.1, 0.12, 0.05, 0, 0, 0, 0, 0],
  6: [0, 0, 0, 0, 0, 0.03, 0.1, 0.18, 0.22, 0.15, 0.1, 0.18, 0.2, 0.16, 0.22, 0.14, 0.08, 0.1, 0.03, 0, 0, 0, 0, 0],
}

function getOccupancy(roomId: number, date: Date): number {
  const patterns = OCCUPANCY[roomId] || OCCUPANCY[1]
  const hour = date.getHours()
  const base = patterns[hour]
  const noise = Math.sin(date.getMinutes() / 60 * Math.PI) * 0.05
  return Math.max(0, Math.min(1, base + noise))
}

function generateSensors(roomId: number, date: Date): SensorReading[] {
  const occ = getOccupancy(roomId, date)
  const room = DEMO_ROOMS.find(r => r.id === roomId)!
  const isMotion = occ > 0.1
  const peopleCount = Math.round(occ * room.capacity)
  const temp = 28 + occ * 5 + (Math.random() - 0.5) * 2
  const light = isMotion ? 300 + Math.random() * 400 : (roomId === 1 && date.getHours() >= 10 && date.getHours() < 12 ? 350 + Math.random() * 100 : Math.random() * 5)
  const powerBase = roomId === 3 ? 2500 : (roomId === 5 || roomId === 6) ? 100 : 200
  const power = powerBase + occ * room.capacity * (40 + Math.random() * 30)
  return [
    { id: 1, room_id: roomId, sensor_type: 'motion', value: isMotion ? 1 : 0, timestamp: date.toISOString() },
    { id: 2, room_id: roomId, sensor_type: 'temperature', value: Math.round(temp * 10) / 10, timestamp: date.toISOString() },
    { id: 3, room_id: roomId, sensor_type: 'light', value: Math.round(light * 10) / 10, timestamp: date.toISOString() },
    { id: 4, room_id: roomId, sensor_type: 'power', value: Math.round(power * 10) / 10, timestamp: date.toISOString() },
    { id: 5, room_id: roomId, sensor_type: 'people', value: peopleCount, timestamp: date.toISOString() },
  ]
}

function generateHistory(roomId: number, sensorType: string, hours: number) {
  const now = new Date()
  const points: { time: string; value: number }[] = []
  for (let i = hours * 12; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 5 * 60 * 1000)
    const sensors = generateSensors(roomId, d)
    const s = sensors.find(s => s.sensor_type === sensorType)
    points.push({ time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), value: s ? Math.round(s.value * 10) / 10 : 0 })
  }
  return points
}

const roomIcon = (id: number) => (id === 5 || id === 6) ? '🚶' : id === 3 ? '🖥️' : id === 4 ? '📚' : '🏫'

function PulseDot({ color }: { color?: string }) {
  const c = color || 'var(--emerald-text)'
  return (
    <span className="relative flex h-2 w-2">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: c }} />
      <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: c }} />
    </span>
  )
}

function GaugeBar({ value, max, label, unit, color }: { value: number; max: number; label: string; unit: string; color: string }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span style={{ color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ color: 'var(--text-value)' }} className="font-bold">
          {value.toFixed(1)}
          <span style={{ color: 'var(--text-muted)' }} className="font-normal ml-0.5 text-xs">{unit}</span>
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--gauge-track)' }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

function MiniChart({ data, color }: { data: { time: string; value: number }[]; color: string }) {
  const tipBg = getComputedStyle(document.documentElement).getPropertyValue('--bg-card').trim() || '#1a1a2e'
  const tipBorder = getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || '#2a2a4a'
  if (data.length < 2) return <div className="h-16 flex items-center justify-center text-xs" style={{ color: 'var(--text-muted)' }}>No data</div>
  return (
    <ResponsiveContainer width="100%" height={64}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`g-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Tooltip contentStyle={{ background: tipBg, border: `1px solid ${tipBorder}`, borderRadius: 8, fontSize: 12 }} />
        <Area type="monotone" dataKey="value" stroke={color} fill={`url(#g-${color.replace('#', '')})`} strokeWidth={2} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function CameraFeed({ room }: { room: Room }) {
  const isHallway = room.id === 5 || room.id === 6
  const gifSrc = room.id === 5 ? 'demo_detection.gif' : room.id === 6 ? 'hall2.gif' : ''
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-input)' }}>
        <div className="flex items-center gap-2">
          <span className="text-sm">{isHallway ? '🎥' : '📹'}</span>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Camera Feed</span>
        </div>
        <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: isHallway ? 'var(--emerald-text)' : 'var(--text-muted)' }}>
          <PulseDot color={isHallway ? undefined : 'var(--text-muted)'} /> {isHallway ? 'AI Active' : 'Offline'}
        </span>
      </div>
      <div className="relative aspect-[4/3] bg-black flex items-center justify-center">
        {isHallway ? (
          <img src={`${import.meta.env.BASE_URL}${gifSrc}`} alt="YOLO Detection" className="w-full h-full object-contain" />
        ) : (
          <div className="text-center">
            <div className="text-4xl mb-2 opacity-30">📹</div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Camera not live</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>Connect a camera to enable AI detection</p>
          </div>
        )}
      </div>
    </div>
  )
}

function RoomCard({ room, sensors, selected, onClick }: { room: Room; sensors: SensorReading[]; selected: boolean; onClick: () => void }) {
  const g = (t: string) => sensors.find(s => s.sensor_type === t)
  const temp = g('temperature'), light = g('light'), power = g('power'), people = g('people')
  const peopleCount = people ? Math.round(people.value) : 0
  const isOccupied = peopleCount > 0
  const powerVal = power?.value ?? 0
  const highPowerThreshold = room.id === 3 ? 500 : (room.id === 5 || room.id === 6) ? 100 : 150
  const isWaste = !isOccupied && powerVal > highPowerThreshold

  return (
    <div onClick={onClick}
      className="group rounded-2xl p-5 cursor-pointer transition-all duration-300"
      style={{
        background: selected ? 'var(--emerald-bg)' : isWaste ? 'var(--red-bg)' : 'var(--bg-card)',
        border: `1px solid ${selected ? 'var(--border-active)' : isWaste ? 'var(--red-border)' : 'var(--border)'}`,
        boxShadow: selected ? 'var(--shadow-active)' : 'var(--shadow)',
      }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">{roomIcon(room.id)}</span>
          <div>
            <h3 className="font-bold text-base transition-colors" style={{ color: 'var(--text-primary)' }}>{room.name}</h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Floor {room.floor} &middot; {room.building}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold"
          style={{
            background: isOccupied ? 'var(--emerald-bg)' : isWaste ? 'var(--red-bg)' : 'var(--bg-input)',
            color: isOccupied ? 'var(--emerald-text)' : isWaste ? 'var(--red-text)' : 'var(--text-muted)',
            border: `1px solid ${isOccupied ? 'var(--border-active)' : isWaste ? 'var(--red-border)' : 'var(--border)'}`,
          }}>
          <span className={`w-2.5 h-2.5 rounded-full ${isWaste ? 'animate-pulse' : ''}`}
            style={{ background: isWaste ? 'var(--red-text)' : isOccupied ? 'var(--emerald-text)' : 'var(--text-muted)' }} />
          <span>👤 {peopleCount}/{room.capacity}</span>
        </div>
      </div>
      {isWaste && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-4 text-sm font-medium"
          style={{ background: 'var(--red-bg)', color: 'var(--red-text)', border: '1px solid var(--red-border)' }}>
          <PulseDot color="var(--red-text)" /> Energy Waste: {Math.round(powerVal)}W with nobody inside
        </div>
      )}
      <div className="grid grid-cols-2 gap-x-5 gap-y-3">
        <GaugeBar label="Temp" value={temp?.value ?? 0} max={45} unit="°C" color="#f59e0b" />
        <GaugeBar label="Power" value={powerVal} max={3000} unit="W" color={isWaste ? '#ef4444' : '#3b82f6'} />
        <GaugeBar label="Light" value={light?.value ?? 0} max={800} unit="lux" color="#eab308" />
        <GaugeBar label="People" value={peopleCount} max={room.capacity} unit="" color="#10b981" />
      </div>
    </div>
  )
}

function RoomDetail({ room, sensors }: { room: Room; sensors: SensorReading[] }) {
  const powerH = generateHistory(room.id, 'power', 1)
  const tempH = generateHistory(room.id, 'temperature', 1)
  const g = (t: string) => sensors.find(s => s.sensor_type === t)
  const temp = g('temperature'), light = g('light'), power = g('power'), people = g('people')
  const peopleCount = people ? Math.round(people.value) : 0
  const isOccupied = peopleCount > 0
  const powerVal = power?.value ?? 0
  const highPowerThreshold = room.id === 3 ? 500 : (room.id === 5 || room.id === 6) ? 100 : 150
  const isWaste = !isOccupied && powerVal > highPowerThreshold

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
          style={{ background: isWaste ? 'var(--red-bg)' : isOccupied ? 'var(--emerald-bg)' : 'var(--bg-input)' }}>
          {isWaste ? '🔴' : isOccupied ? '🟢' : '⚫'}
        </div>
        <div>
          <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{room.name}</h3>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Floor {room.floor} &middot; {room.building}</p>
        </div>
      </div>
      {isWaste && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'var(--red-bg)', color: 'var(--red-text)', border: '1px solid var(--red-border)' }}>
          <PulseDot color="var(--red-text)" /> Energy waste: {Math.round(powerVal)}W consumed with nobody inside
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'People', value: peopleCount, unit: `/${room.capacity}`, icon: '👥', color: 'var(--emerald-text)' },
          { label: 'Temp', value: temp?.value ?? 0, unit: '°C', icon: '🌡️', color: 'var(--amber-text)' },
          { label: 'Power', value: powerVal, unit: 'W', icon: '⚡', color: isWaste ? 'var(--red-text)' : 'var(--blue-text)' },
          { label: 'Light', value: light?.value ?? 0, unit: 'lux', icon: '💡', color: '#eab308' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
            <span className="text-lg">{s.icon}</span>
            <p className="text-lg font-bold" style={{ color: s.color }}>
              {s.label === 'People' ? `${s.value}` : s.value.toFixed(1)}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.unit}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-3" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
          <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Power (1h)</p>
          <MiniChart data={powerH} color="#3b82f6" />
        </div>
        <div className="rounded-xl p-3" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
          <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Temp (1h)</p>
          <MiniChart data={tempH} color="#f59e0b" />
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [sensorMap, setSensorMap] = useState<Record<number, SensorReading[]>>({})
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null)
  const [tick, setTick] = useState(0)
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gv-theme')
      if (saved) return saved === 'dark'
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return true
  })
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('gv-theme', dark ? 'dark' : 'light')
  }, [dark])

  const updateSensors = useCallback(() => {
    const now = new Date()
    const m: Record<number, SensorReading[]> = {}
    for (const r of DEMO_ROOMS) m[r.id] = generateSensors(r.id, now)
    setSensorMap(m)
  }, [])

  useEffect(() => {
    updateSensors()
    const iv = setInterval(() => { updateSensors(); setTick(t => t + 1) }, 3000)
    return () => clearInterval(iv)
  }, [updateSensors])

  const activeRoom = DEMO_ROOMS.find(r => r.id === selectedRoom) || null

  const totalPower = Object.values(sensorMap).reduce((s, sns) => s + (sns.find(x => x.sensor_type === 'power')?.value ?? 0), 0)
  const totalPeople = DEMO_ROOMS.reduce((s, r) => s + (sensorMap[r.id]?.find(x => x.sensor_type === 'people')?.value ?? 0), 0)
  const wasteRooms = DEMO_ROOMS.filter(r => {
    const sns = sensorMap[r.id] || []
    const peopleCount = sns.find(x => x.sensor_type === 'people')?.value ?? 0
    const powerVal = sns.find(x => x.sensor_type === 'power')?.value ?? 0
    const threshold = r.id === 3 ? 500 : (r.id === 5 || r.id === 6) ? 100 : 150
    return peopleCount === 0 && powerVal > threshold
  }).length

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <header className="sticky top-0 z-30" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--emerald-bg)' }}>
              <span style={{ color: 'var(--emerald-text)' }} className="text-base">&#9752;</span>
            </div>
            <h1 className="text-base sm:text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              GreenVision <span style={{ color: 'var(--emerald-text)' }}>AI</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden sm:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
              style={{ color: 'var(--emerald-text)', background: 'var(--emerald-bg)', border: '1px solid var(--border-active)' }}>
              <PulseDot /> Live
            </span>
            <button onClick={() => setDark(!dark)}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}
              title={dark ? 'Light mode' : 'Dark mode'}>
              {dark ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
            <a href="https://github.com/duongphamminhdung/GreenVision" target="_blank" rel="noreferrer"
              className="hidden sm:block text-xs" style={{ color: 'var(--text-muted)' }}>GitHub</a>
            {/* Mobile menu */}
            <button onClick={() => setMenuOpen(!menuOpen)} className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {menuOpen ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></> : <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile dropdown: KPIs */}
        {menuOpen && (
          <div className="lg:hidden px-4 pb-4 grid grid-cols-2 gap-2" style={{ borderTop: '1px solid var(--border)' }}>
            {[
              { label: 'Rooms', value: DEMO_ROOMS.length, icon: '🏠', color: 'var(--emerald-text)' },
              { label: 'People', value: totalPeople, icon: '👥', color: 'var(--blue-text)' },
              { label: 'Power', value: `${(totalPower / 1000).toFixed(1)}kW`, icon: '⚡', color: 'var(--amber-text)' },
              { label: 'Alerts', value: wasteRooms, icon: '⚠️', color: wasteRooms > 0 ? 'var(--red-text)' : 'var(--text-muted)' },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                  <span className="text-sm">{s.icon}</span>
                </div>
                <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
            <div className="col-span-2">
              <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>System</p>
              <div className="flex flex-wrap gap-2">
                {['📷 Camera + YOLO', '📡 IoT Sensors', '🗄️ Database', '🚨 Smart Alerts'].map(t => (
                  <span key={t} className="text-xs px-2 py-1 rounded-lg" style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}>{t}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 py-5 flex gap-5">
        {/* LEFT: KPI sidebar -- hidden on mobile, visible lg+ */}
        <aside className="hidden lg:block w-52 shrink-0 space-y-3">
          <p className="text-xs uppercase tracking-[0.15em] font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Overview</p>
          {[
            { label: 'Rooms', value: DEMO_ROOMS.length, icon: '🏠', color: 'var(--emerald-text)' },
            { label: 'People', value: totalPeople, icon: '👥', color: 'var(--blue-text)' },
            { label: 'Power', value: `${(totalPower / 1000).toFixed(1)}kW`, icon: '⚡', color: 'var(--amber-text)' },
            { label: 'Alerts', value: wasteRooms, icon: '⚠️', color: wasteRooms > 0 ? 'var(--red-text)' : 'var(--text-muted)' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3.5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                <span className="text-sm">{s.icon}</span>
              </div>
              <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}

          <div className="mt-4">
            <p className="text-xs uppercase tracking-[0.15em] font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>System</p>
            <div className="space-y-1.5">
              {['📷 Camera + YOLO', '📡 IoT Sensors', '🗄️ Database', '🚨 Smart Alerts'].map(t => (
                <p key={t} className="text-sm" style={{ color: 'var(--text-muted)' }}>{t}</p>
              ))}
            </div>
          </div>
        </aside>

        {/* CENTER: Room cards */}
        <main className="flex-1 min-w-0 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 rounded-full" style={{ background: 'var(--emerald-text)' }} />
              <h2 className="text-base sm:text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Room Monitoring</h2>
            </div>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Every 3s &middot; #{tick}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {DEMO_ROOMS.map(room => (
              <RoomCard key={room.id} room={room} sensors={sensorMap[room.id] || []}
                selected={selectedRoom === room.id} onClick={() => setSelectedRoom(selectedRoom === room.id ? null : room.id)} />
            ))}
          </div>

          {/* Mobile: detail panel shows below cards */}
          <div className="xl:hidden space-y-4">
            {activeRoom && (
              <>
                <CameraFeed room={activeRoom} />
                <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <RoomDetail room={activeRoom} sensors={sensorMap[activeRoom.id] || []} />
                </div>
              </>
            )}
          </div>
        </main>

        {/* RIGHT: Detail panel -- hidden on small, sticky on xl+ */}
        <aside className="hidden xl:block w-96 shrink-0">
          <div className="sticky top-16 space-y-4">
            {activeRoom ? (
              <>
                <CameraFeed room={activeRoom} />
                <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <RoomDetail room={activeRoom} sensors={sensorMap[activeRoom.id] || []} />
                </div>
              </>
            ) : (
              <div className="rounded-xl p-8 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <span className="text-3xl block mb-3 opacity-20">&#9752;</span>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Select a room to view camera and details</p>
              </div>
            )}
          </div>
        </aside>
      </div>

      <footer className="py-4 text-center text-xs" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}>
        GreenVision AI &middot; Energy Optimization with Computer Vision & IoT
      </footer>
    </div>
  )
}
