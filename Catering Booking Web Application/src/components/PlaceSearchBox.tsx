import { useEffect, useRef, useState } from 'react'
import { Loader2, MapPin, Search, X } from 'lucide-react'
import {
  isGoogleMapsShortLink,
  isGoogleMapsUrl,
  parseGoogleMapsUrl,
  searchPlaces,
  searchPresets,
  type GeoResult,
} from '../geo'

interface PlaceSearchBoxProps {
  /** เลือกผลค้นหา/วางลิงก์ Google Maps แล้ว — ส่งพิกัดกลับไปให้ผู้เรียกปักหมุด/บินแผนที่เอง */
  onPick: (lat: number, lng: number) => void
  /** ตามลิงก์ย่อ Google Maps ผ่าน backend (browser ยิงตรงไม่ได้ เพราะ Google ไม่เปิด CORS) — ไม่ส่งมา = ลิงก์ย่อใช้ไม่ได้ */
  onResolveMapsLink?: (url: string) => Promise<string>
  placeholder?: string
  className?: string
}

/**
 * ช่องค้นหาสถานที่ (ชื่อ/ที่อยู่ หรือวางลิงก์ Google Maps) สำหรับปักหมุดบนแผนที่ — ใช้กับหน้าตั้งค่าตำแหน่งร้าน
 * ค้นหาแบบ debounce ผ่าน Nominatim ถ้าค้นออนไลน์ไม่ได้/ไม่พบ จะสำรองด้วยสถานที่ยอดนิยม ลิงก์ Google Maps แม่นกว่าการค้นหาชื่อ
 * (Nominatim แยกคำภาษาไทยไม่แม่น) จึงแนะนำให้วางลิงก์ด้วย
 */
export default function PlaceSearchBox({
  onPick,
  onResolveMapsLink,
  placeholder = 'ค้นหาชื่อสถานที่/ที่อยู่ หรือวางลิงก์ Google Maps…',
  className = '',
}: Readonly<PlaceSearchBoxProps>) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<GeoResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const [searching, setSearching] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  // เก็บ callback ล่าสุดไว้ใน ref กัน effect ค้นหารันซ้ำทุกครั้งที่ผู้เรียก re-render
  const onPickRef = useRef(onPick)
  onPickRef.current = onPick
  const resolveRef = useRef(onResolveMapsLink)
  resolveRef.current = onResolveMapsLink

  useEffect(() => {
    const q = search.trim()
    if (q.length < 2) {
      setResults([])
      setSearching(false)
      setNotice(null)
      return
    }

    if (isGoogleMapsUrl(q)) {
      let cancelled = false
      setSearching(true)
      setNotice(null)
      ;(async () => {
        try {
          let fullUrl = q
          if (isGoogleMapsShortLink(q)) {
            if (!resolveRef.current) {
              setNotice('ลิงก์ย่อใช้ไม่ได้ที่นี่ — เปิดลิงก์ใน Google Maps แล้วคัดลอกลิงก์เต็มมาวาง หรือปักหมุดเอง')
              return
            }
            fullUrl = await resolveRef.current(q)
          }
          const coords = parseGoogleMapsUrl(fullUrl)
          if (cancelled) return
          if (!coords) {
            setNotice('อ่านพิกัดจากลิงก์นี้ไม่ได้ — ลองคัดลอกลิงก์ใหม่จาก Google Maps หรือปักหมุดเอง')
            return
          }
          setSearch('')
          setResults([])
          setShowResults(false)
          onPickRef.current(coords.lat, coords.lng)
        } catch {
          if (!cancelled) setNotice('เปิดลิงก์นี้ไม่ได้ — ลองคัดลอกลิงก์ใหม่จาก Google Maps หรือปักหมุดเอง')
        } finally {
          if (!cancelled) setSearching(false)
        }
      })()
      return () => {
        cancelled = true
      }
    }

    const ctrl = new AbortController()
    const timer = setTimeout(() => {
      setSearching(true)
      searchPlaces(q, ctrl.signal)
        .then(found => {
          setResults(found.length > 0 ? found : searchPresets(q))
          setNotice(found.length > 0 ? null : 'ไม่พบสถานที่ตามคำค้นหา — ลองวางลิงก์ Google Maps แทน')
        })
        .catch((err: Error) => {
          if (err.name === 'AbortError') return
          setResults(searchPresets(q))
          setNotice('ค้นหาออนไลน์ไม่ได้ — แสดงสถานที่ยอดนิยมแทน')
        })
        .finally(() => setSearching(false))
    }, 600)

    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [search])

  // คลิกนอกกล่อง = ปิดรายการผลค้นหา
  useEffect(() => {
    if (!showResults) return
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setShowResults(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [showResults])

  const choose = (r: GeoResult) => {
    setSearch(r.name)
    setShowResults(false)
    setNotice(null)
    onPickRef.current(r.lat, r.lng)
  }

  return (
    <div ref={rootRef} className={className}>
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          placeholder={placeholder}
          onChange={e => {
            setSearch(e.target.value)
            setShowResults(true)
          }}
          onFocus={() => setShowResults(true)}
          onKeyDown={e => {
            if (e.key === 'Escape') setShowResults(false)
          }}
          className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        {searching && <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-orange-400" />}
        {!searching && search && (
          <button
            type="button"
            aria-label="ล้างคำค้นหา"
            onClick={() => {
              setSearch('')
              setResults([])
              setNotice(null)
            }}
            className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200"
          >
            <X size={13} />
          </button>
        )}

        {showResults && results.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-72 overflow-y-auto overflow-x-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
            {results.map((r, i) => (
              <button
                type="button"
                key={`${r.lat}-${r.lng}-${i}`}
                onClick={() => choose(r)}
                className="flex w-full items-start gap-3 border-b border-gray-50 px-4 py-3 text-left transition-colors last:border-0 hover:bg-orange-50"
              >
                <MapPin size={14} className="mt-0.5 flex-shrink-0 text-orange-500" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-800">{r.name}</p>
                  <p className="line-clamp-2 text-xs text-gray-400">{r.address}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      {notice && <p className="mt-2 text-xs text-amber-600">{notice}</p>}
    </div>
  )
}
