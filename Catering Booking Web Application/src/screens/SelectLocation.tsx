import { useState } from 'react'
import { ChevronLeft, ChevronRight, MapPin, Navigation, Search } from 'lucide-react'
import Navbar from '../components/Navbar'
import type { Screen, UserProfile } from '../types'

interface SelectLocationProps {
  navigate: (s: Screen) => void
  user: UserProfile | null
  onSetLocation: (loc: { lat: number; lng: number; address: string }) => void
}

const PRESET_LOCATIONS = [
  { name: 'โรงแรม Centara Grand Bangkok', address: '99/9 ถ.รัชดาภิเษก กทม.', lat: 13.7563, lng: 100.5018 },
  { name: 'อาคาร SCB Park Plaza', address: '19 ถ.รัชดาภิเษก ดินแดง กทม.', lat: 13.7734, lng: 100.5634 },
  { name: 'โรงแรม Novotel Bangkok Sukhumvit', address: '19/9 Sukhumvit Soi 20, Bangkok', lat: 13.7304, lng: 100.5657 },
]

export default function SelectLocation({ navigate, user, onSetLocation }: SelectLocationProps) {
  const [search, setSearch] = useState('')
  const [pinPos, setPinPos] = useState({ x: 50, y: 50 })
  const [_isDragging, setIsDragging] = useState(false)
  const [coords, setCoords] = useState({ lat: 13.7563, lng: 100.5018 })
  const [address, setAddress] = useState('กรุณาเลือกสถานที่')

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setPinPos({ x, y })
    const lat = 13.9 - (y / 100) * 0.4
    const lng = 100.3 + (x / 100) * 0.5
    setCoords({ lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) })
    setAddress('สถานที่ที่เลือก (ปรับตามแผนที่)')
  }

  const handlePreset = (loc: typeof PRESET_LOCATIONS[0]) => {
    setAddress(loc.name + ' ' + loc.address)
    setCoords({ lat: loc.lat, lng: loc.lng })
    setSearch(loc.name)
  }

  const handleNext = () => {
    onSetLocation({ ...coords, address: address === 'กรุณาเลือกสถานที่' ? 'สถานที่ที่เลือก' : address })
    navigate('select-package')
  }

  const filtered = PRESET_LOCATIONS.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) || search === ''
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar navigate={navigate} currentScreen="select-location" user={user} />

      <div className="pt-20 flex flex-col" style={{ height: '100vh' }}>
        <div className="px-6 pt-4 pb-3 bg-white border-b border-gray-100 shadow-sm">
          <p className="text-orange-500 font-semibold text-sm mb-0.5">ขั้นตอนที่ 3</p>
          <h1 className="text-xl font-bold text-gray-900">เลือกสถานที่จัดงาน</h1>
        </div>

        {/* Search bar */}
        <div className="px-4 py-3 bg-white border-b border-gray-100">
          <div className="relative max-w-2xl mx-auto">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหาสถานที่..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50"
            />
          </div>

          {/* Preset suggestions */}
          {search && (
            <div className="max-w-2xl mx-auto mt-2 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
              {filtered.map((loc) => (
                <button
                  key={loc.name}
                  onClick={() => handlePreset(loc)}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-orange-50 text-left border-b border-gray-50 last:border-0 transition-colors"
                >
                  <MapPin size={14} className="text-orange-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{loc.name}</p>
                    <p className="text-xs text-gray-400">{loc.address}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Map area */}
        <div className="flex-1 relative overflow-hidden" style={{ width: '60%', height: '100%' , margin: '0 auto' }}>
          {/* Simulated map using Unsplash aerial */}
          <div
            className="w-full h-full relative cursor-crosshair select-none"
            onClick={handleMapClick}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
          >
            <img
              src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=1600&h=900&fit=crop&auto=format"
              alt="Map"
              className="w-full h-full object-cover"
              draggable={false}
            />
            {/* Map overlay tint */}
            <div className="absolute inset-0 bg-blue-900/10" />

            {/* Grid lines for realism */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
                backgroundSize: '80px 80px',
              }}
            />

            {/* Pin */}
            <div
              className="absolute transform -translate-x-1/2 -translate-y-full pointer-events-none"
              style={{ left: `${pinPos.x}%`, top: `${pinPos.y}%` }}
            >
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 bg-orange-500 rounded-full shadow-lg shadow-orange-900/40 flex items-center justify-center border-3 border-white">
                  <MapPin size={18} className="text-white" />
                </div>
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-0.5" />
              </div>
            </div>

            {/* Controls */}
            <div className="absolute top-4 right-4 flex flex-col gap-2">
              <button className="w-9 h-9 bg-white rounded-xl shadow-md flex items-center justify-center hover:bg-gray-50 text-gray-700 font-bold text-lg">+</button>
              <button className="w-9 h-9 bg-white rounded-xl shadow-md flex items-center justify-center hover:bg-gray-50 text-gray-700 font-bold text-lg">−</button>
              <button className="w-9 h-9 bg-white rounded-xl shadow-md flex items-center justify-center hover:bg-gray-50 text-orange-500">
                <Navigation size={16} />
              </button>
            </div>

            {/* Instruction */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-4 py-2 rounded-full backdrop-blur-sm">
              คลิกบนแผนที่เพื่อปักหมุดสถานที่
            </div>
          </div>
        </div>

        {/* Info card */}
        <div className="bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <MapPin size={18} className="text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{address}</p>
                <div className="flex gap-4 mt-1">
                  <span className="text-xs text-gray-400">ละติจูด: <span className="text-gray-600 font-medium">{coords.lat.toFixed(6)}</span></span>
                  <span className="text-xs text-gray-400">ลองจิจูด: <span className="text-gray-600 font-medium">{coords.lng.toFixed(6)}</span></span>
                </div>
              </div>
            </div>

            {/* Quick select */}
            <div className="flex gap-2 mb-4 overflow-x-auto hide-scrollbar pb-1">
              {PRESET_LOCATIONS.map((loc) => (
                <button
                  key={loc.name}
                  onClick={() => handlePreset(loc)}
                  className="flex-shrink-0 text-xs bg-orange-50 hover:bg-orange-100 text-orange-700 px-3 py-1.5 rounded-full border border-orange-100 transition-colors"
                >
                  {loc.name}
                </button>
              ))}
            </div>
              <div className="text-xs text-gray-500">
              สำหรับการจัดงานในกรุงเทพและปริมณฑล: หากไม่ถึง 30 โต๊ะ จะมีค่าขนส่ง 2,000 บาท
              <br />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('select-table')}
                className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-2xl py-3.5 font-semibold transition-colors"
              >
                <ChevronLeft size={18} />
                ย้อนกลับ
              </button>
              <button
                onClick={handleNext}
                className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl py-3.5 font-semibold transition-all shadow-lg shadow-orange-200"
              >
                ถัดไป
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
