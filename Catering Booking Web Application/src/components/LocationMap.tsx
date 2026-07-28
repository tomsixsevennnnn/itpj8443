import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { Loader2, Minus, Navigation, Plus } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

interface LocationMapProps {
  position: { lat: number; lng: number }
  /** เพิ่มค่านี้เมื่อต้องการให้แผนที่บินไปยังตำแหน่งใหม่ (เช่น หลังค้นหา / กด GPS) */
  focusKey?: number
  onPinChange?: (lat: number, lng: number) => void
  onLocate?: () => void
  locating?: boolean
  /** false = แผนที่แสดงอย่างเดียว ปักหมุด/ลากไม่ได้ (ใช้ในหน้าเจ้าของร้าน) */
  interactive?: boolean
  className?: string
}

/** หมุดสีส้มแบบ HTML — เลี่ยงปัญหารูป marker ของ Leaflet ที่ bundler หาไม่เจอ */
const pinIcon = L.divIcon({
  className: '',
  html: `
    <div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-4px)">
      <div style="width:34px;height:34px;border-radius:9999px;background:#f97316;border:3px solid #fff;
                  box-shadow:0 6px 16px rgba(120,53,15,.45);display:flex;align-items:center;justify-content:center">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
             stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
      <div style="width:8px;height:8px;border-radius:9999px;background:#f97316;margin-top:2px;
                  box-shadow:0 0 0 2px rgba(255,255,255,.7)"></div>
    </div>`,
  iconSize: [34, 44],
  iconAnchor: [17, 44],
})

export default function LocationMap({
  position,
  focusKey = 0,
  onPinChange,
  onLocate,
  locating = false,
  interactive = true,
  className = '',
}: LocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  // เก็บ callback ล่าสุดไว้ใน ref เพื่อไม่ต้องสร้างแผนที่ใหม่ทุกครั้งที่ parent re-render
  const onPinChangeRef = useRef(onPinChange)
  onPinChangeRef.current = onPinChange

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
      dragging: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      touchZoom: interactive,
      keyboard: interactive,
    }).setView([position.lat, position.lng], 16)

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map)

    const marker = L.marker([position.lat, position.lng], {
      draggable: interactive,
      icon: pinIcon,
      autoPan: true,
    }).addTo(map)

    if (interactive) {
      marker.on('dragend', () => {
        const p = marker.getLatLng()
        onPinChangeRef.current?.(p.lat, p.lng)
      })
      map.on('click', (e: L.LeafletMouseEvent) => {
        marker.setLatLng(e.latlng)
        onPinChangeRef.current?.(e.latlng.lat, e.latlng.lng)
      })
    }

    mapRef.current = map
    markerRef.current = marker

    // แผนที่มักถูกสร้างก่อน layout จะนิ่ง — บังคับวัดขนาดใหม่หลัง mount
    const resize = () => map.invalidateSize()
    const timer = setTimeout(resize, 0)
    window.addEventListener('resize', resize)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', resize)
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // สร้างครั้งเดียวตอน mount — ตำแหน่งเริ่มต้นอ่านจาก props ณ ตอนนั้น
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ย้ายหมุดตามตำแหน่งที่ parent กำหนด
  useEffect(() => {
    markerRef.current?.setLatLng([position.lat, position.lng])
  }, [position.lat, position.lng])

  // บินไปยังตำแหน่งใหม่เมื่อ focusKey เปลี่ยน (ค้นหา / GPS / เลือกสถานที่ยอดนิยม)
  useEffect(() => {
    const map = mapRef.current
    if (!map || focusKey === 0) return
    map.flyTo([position.lat, position.lng], Math.max(map.getZoom(), 16), { duration: 0.7 })
    // ตั้งใจไม่ใส่ position ใน deps เพื่อให้บินเฉพาะตอนที่ parent สั่งเท่านั้น
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey])

  // isolate = กัน z-index ภายในของ Leaflet ไม่ให้ทับ UI ส่วนอื่น
  return (
    <div className={`relative isolate ${className}`}>
      <div ref={containerRef} className="w-full h-full" style={{ background: '#e5e7eb' }} />

      {interactive && (
        <>
          <div className="absolute top-3 right-3 flex flex-col gap-2 z-[1000]">
            <button
              onClick={() => mapRef.current?.zoomIn()}
              aria-label="ซูมเข้า"
              className="w-9 h-9 bg-white rounded-xl shadow-md flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Plus size={16} />
            </button>
            <button
              onClick={() => mapRef.current?.zoomOut()}
              aria-label="ซูมออก"
              className="w-9 h-9 bg-white rounded-xl shadow-md flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Minus size={16} />
            </button>
            {onLocate && (
              <button
                onClick={onLocate}
                disabled={locating}
                aria-label="ใช้ตำแหน่งปัจจุบัน"
                className="w-9 h-9 bg-white rounded-xl shadow-md flex items-center justify-center text-orange-500 hover:bg-orange-50 disabled:text-gray-300 transition-colors"
              >
                {locating ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}
              </button>
            )}
          </div>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[11px] px-3.5 py-1.5 rounded-full backdrop-blur-sm pointer-events-none z-[1000] whitespace-nowrap">
            แตะบนแผนที่หรือลากหมุดเพื่อปรับตำแหน่ง
          </div>
        </>
      )}
    </div>
  )
}
