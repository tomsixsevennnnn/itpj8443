import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import L from 'leaflet'
import { Layers, Loader2, Minus, Navigation, Plus } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

/** ชั้นแผนที่ถนน (OpenStreetMap) กับดาวเทียม (Esri World Imagery) — ทั้งคู่ฟรี ไม่ต้องมี API key */
const TILE_LAYERS = {
  street: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap',
    maxZoom: 19,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    maxZoom: 19,
  },
} as const

type MapLayer = keyof typeof TILE_LAYERS

interface LocationMapProps {
  position: { lat: number; lng: number }
  onPinChange?: (lat: number, lng: number) => void
  onLocate?: () => void
  locating?: boolean
  /** false = แผนที่แสดงอย่างเดียว ปักหมุด/ลากไม่ได้ (ใช้ในหน้าเจ้าของร้าน) */
  interactive?: boolean
  className?: string
}

export interface LocationMapHandle {
  /** ย้ายหมุด + บินกล้องไปตำแหน่งที่ระบุทันที — เรียกตรงจาก parent (ค้นหา/GPS/วางลิงก์) ไม่ผ่าน state/effect เพื่อกันปัญหาจังหวะ re-render ที่ทำให้หมุดไม่ขยับ */
  flyToPosition: (lat: number, lng: number) => void
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

export default forwardRef<LocationMapHandle, LocationMapProps>(function LocationMap({
  position,
  onPinChange,
  onLocate,
  locating = false,
  interactive = true,
  className = '',
}, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const [layer, setLayer] = useState<MapLayer>('street')
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

  // สลับชั้นแผนที่ถนน/ดาวเทียม — ใส่/ถอด tile layer ใหม่ทุกครั้งที่ layer เปลี่ยน
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const cfg = TILE_LAYERS[layer]
    const tile = L.tileLayer(cfg.url, { maxZoom: cfg.maxZoom, attribution: cfg.attribution }).addTo(map)
    return () => {
      try {
        map.removeLayer(tile)
      } catch {
        // แผนที่ถูก destroy ไปแล้วตอน unmount (map.remove() ในเอฟเฟกต์ mount ด้านบน) — ไม่ต้องทำอะไรต่อ
      }
    }
  }, [layer])

  // ย้ายหมุดตามตำแหน่งที่ parent กำหนด (เช่น หลังลากแล้ว parent normalize ค่ากลับมา)
  useEffect(() => {
    markerRef.current?.setLatLng([position.lat, position.lng])
  }, [position.lat, position.lng])

  /**
   * ย้ายหมุด + บินกล้องไปตำแหน่งใหม่ — เรียกตรงจาก parent (ค้นหา/GPS/วางลิงก์) ผ่าน ref แทนพึ่ง prop+effect
   * เพราะพึ่ง state (focusKey) แล้วรอ effect รันตามหลัง เจอเคสที่หมุดไม่ขยับ (แข่งกับ setState ตัวอื่นในคิวเดียวกัน) — เรียกตรงชัวร์กว่า
   */
  useImperativeHandle(ref, () => ({
    flyToPosition: (lat, lng) => {
      const map = mapRef.current
      if (!map) return
      markerRef.current?.setLatLng([lat, lng])
      map.flyTo([lat, lng], Math.max(map.getZoom(), 16), { duration: 0.7 })
    },
  }))

  // isolate = กัน z-index ภายในของ Leaflet ไม่ให้ทับ UI ส่วนอื่น
  return (
    <div className={`relative isolate ${className}`}>
      <div ref={containerRef} className="w-full h-full" style={{ background: '#e5e7eb' }} />

      <button
        onClick={() => setLayer(l => (l === 'street' ? 'satellite' : 'street'))}
        aria-label="สลับมุมมองแผนที่/ดาวเทียม"
        className="absolute top-3 left-3 z-[1000] flex items-center gap-1.5 bg-white rounded-xl shadow-md px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Layers size={14} />
        {layer === 'street' ? 'ดาวเทียม' : 'แผนที่'}
      </button>

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
})
