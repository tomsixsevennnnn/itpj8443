import { useEffect, useRef, useState } from 'react'
import { AlertCircle, ChevronLeft, ChevronRight, Loader2, MapPin, Navigation, Search, Truck, X } from 'lucide-react'
import Navbar from '../components/Navbar'
import LocationMap from '../components/LocationMap'
import type { EventLocation, LocationDetail, Screen, UserProfile } from '../types'
import {
  DELIVERY_FEE,
  FREE_DELIVERY_MIN_TABLES,
  HOME_PROVINCE,
  PRESET_LOCATIONS,
  ZONE_LABEL,
  checkDelivery,
  emptyDetail,
  reverseGeocode,
  searchPlaces,
  searchPresets,
  zoneFor,
  type GeoResult,
} from '../geo'

interface SelectLocationProps {
  navigate: (s: Screen) => void
  user: UserProfile | null
  tables: number
  location: EventLocation | null
  onSetLocation: (loc: EventLocation) => void
}

/** กลางกรุงเทพฯ — ใช้เป็นจุดเริ่มต้นเมื่อยังไม่เคยเลือกสถานที่ */
const DEFAULT_CENTER = { lat: 13.7466, lng: 100.5396 }

const DETAIL_FIELDS: { key: keyof LocationDetail; label: string; placeholder: string; textarea?: boolean }[] = [
  { key: 'houseNo', label: 'บ้านเลขที่', placeholder: 'เช่น 99/9' },
  { key: 'building', label: 'อาคาร / ชั้น', placeholder: 'เช่น อาคาร A ชั้น 3' },
  { key: 'village', label: 'หมู่บ้าน / ซอย', placeholder: 'เช่น หมู่บ้านปัญญา ซอย 5' },
  { key: 'landmark', label: 'จุดสังเกต', placeholder: 'เช่น ตรงข้ามปั๊ม ปตท.' },
  {
    key: 'accessNote',
    label: 'รายละเอียดการเข้าถึงสถานที่',
    placeholder: 'เช่น รถบรรทุกเข้าได้ ประตูหลังเปิด 15:00 น. ต้องแลกบัตรที่ รปภ.',
    textarea: true,
  },
]

export default function SelectLocation({ navigate, user, tables, location, onSetLocation }: SelectLocationProps) {
  const [pos, setPos] = useState(location ? { lat: location.lat, lng: location.lng } : DEFAULT_CENTER)
  const [focusKey, setFocusKey] = useState(0)
  const [place, setPlace] = useState({
    name: location?.name ?? '',
    address: location?.address ?? '',
    province: location?.province ?? '',
  })
  const [detail, setDetail] = useState<LocationDetail>(location?.detail ?? emptyDetail())

  const [search, setSearch] = useState('')
  const [results, setResults] = useState<GeoResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const [searching, setSearching] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const [resolving, setResolving] = useState(false)
  const [locating, setLocating] = useState(false)
  const reverseCtrl = useRef<AbortController | null>(null)

  /* ค้นหาสถานที่แบบ debounce — ถ้าเรียกออนไลน์ไม่ได้ จะสำรองด้วยสถานที่ยอดนิยม */
  useEffect(() => {
    const q = search.trim()
    if (q.length < 2) {
      setResults([])
      setSearching(false)
      return
    }
    const ctrl = new AbortController()
    const timer = setTimeout(() => {
      setSearching(true)
      searchPlaces(q, ctrl.signal)
        .then(found => {
          setResults(found.length > 0 ? found : searchPresets(q))
          setNotice(found.length > 0 ? null : 'ไม่พบสถานที่ตามคำค้นหา')
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

  /** ปักหมุดใหม่แล้วแปลงพิกัดกลับเป็นชื่อสถานที่/ที่อยู่ */
  const applyPin = (lat: number, lng: number) => {
    setPos({ lat, lng })
    reverseCtrl.current?.abort()
    const ctrl = new AbortController()
    reverseCtrl.current = ctrl
    setResolving(true)
    reverseGeocode(lat, lng, ctrl.signal)
      .then(found => {
        if (found) {
          setPlace({ name: found.name, address: found.address, province: found.province })
          setNotice(null)
        } else {
          setPlace({ name: 'ตำแหน่งที่ปักหมุด', address: `พิกัด ${lat.toFixed(6)}, ${lng.toFixed(6)}`, province: '' })
        }
      })
      .catch((err: Error) => {
        if (err.name === 'AbortError') return
        setPlace({ name: 'ตำแหน่งที่ปักหมุด', address: `พิกัด ${lat.toFixed(6)}, ${lng.toFixed(6)}`, province: '' })
        setNotice('ระบุที่อยู่อัตโนมัติไม่ได้ — กรุณากรอกรายละเอียดสถานที่ด้านล่าง')
      })
      .finally(() => {
        if (reverseCtrl.current === ctrl) setResolving(false)
      })
  }

  const selectResult = (r: GeoResult) => {
    setPos({ lat: r.lat, lng: r.lng })
    setPlace({ name: r.name, address: r.address, province: r.province })
    setSearch(r.name)
    setShowResults(false)
    setNotice(null)
    setFocusKey(k => k + 1)
  }

  /** ใช้ตำแหน่งปัจจุบันจาก GPS แล้วปักหมุดอัตโนมัติ */
  const handleLocate = () => {
    if (!navigator.geolocation) {
      setNotice('อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง')
      return
    }
    setLocating(true)
    setNotice(null)
    navigator.geolocation.getCurrentPosition(
      p => {
        setLocating(false)
        applyPin(p.coords.latitude, p.coords.longitude)
        setFocusKey(k => k + 1)
      },
      err => {
        setLocating(false)
        setNotice(
          err.code === err.PERMISSION_DENIED
            ? 'ไม่ได้รับอนุญาตให้เข้าถึงตำแหน่ง — กรุณาเปิดสิทธิ์ในเบราว์เซอร์'
            : 'ระบุตำแหน่งปัจจุบันไม่สำเร็จ กรุณาปักหมุดบนแผนที่แทน'
        )
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  const zone = zoneFor(place.province, place.address)
  const check = checkDelivery(tables, zone)
  const hasPlace = place.address.trim().length > 0

  const handleNext = () => {
    if (check.blocked) return
    onSetLocation({
      lat: pos.lat,
      lng: pos.lng,
      name: place.name || 'สถานที่จัดงาน',
      address: place.address,
      province: place.province,
      zone,
      detail,
    })
    navigate('select-package')
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Navbar navigate={navigate} currentScreen="select-location" user={user} />

      {/* มือถือ: Navbar มีแถวเมนูล่างเพิ่ม จึงต้องเว้นบนมากกว่าจอใหญ่ */}
      <div className="pt-[7.25rem] md:pt-16 flex flex-col flex-1 overflow-hidden">
        {/* Header + search */}
        <div className="bg-white border-b border-gray-100 shadow-sm flex-shrink-0 relative z-20">
          <div className="px-4 sm:px-6 pt-3 pb-2">
            <p className="text-orange-500 font-semibold text-sm">ขั้นตอนที่ 3</p>
            <h1 className="text-xl font-bold text-gray-900">เลือกสถานที่จัดงาน</h1>
          </div>

          <div className="px-4 sm:px-6 pb-3">
            <div className="relative max-w-2xl">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="ค้นหาจากชื่อสถานที่หรือที่อยู่..."
                value={search}
                onChange={e => {
                  setSearch(e.target.value)
                  setShowResults(true)
                }}
                onFocus={() => setShowResults(true)}
                className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50"
              />
              {searching && (
                <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-orange-400 animate-spin" />
              )}
              {!searching && search && (
                <button
                  onClick={() => {
                    setSearch('')
                    setResults([])
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full hover:bg-gray-200 flex items-center justify-center text-gray-400"
                >
                  <X size={13} />
                </button>
              )}

              {/* ผลการค้นหา */}
              {showResults && results.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden max-h-72 overflow-y-auto z-30">
                  {results.map((r, i) => (
                    <button
                      key={`${r.lat}-${r.lng}-${i}`}
                      onClick={() => selectResult(r)}
                      className="w-full flex items-start gap-3 px-4 py-3 hover:bg-orange-50 text-left border-b border-gray-50 last:border-0 transition-colors"
                    >
                      <MapPin size={14} className="text-orange-500 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{r.name}</p>
                        <p className="text-xs text-gray-400 line-clamp-2">{r.address}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ทางลัดสถานที่ยอดนิยม */}
            <div className="flex gap-2 mt-2 overflow-x-auto hide-scrollbar pb-0.5">
              <button
                onClick={handleLocate}
                disabled={locating}
                className="flex-shrink-0 flex items-center gap-1.5 text-xs bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-3 py-1.5 rounded-full transition-colors"
              >
                {locating ? <Loader2 size={12} className="animate-spin" /> : <Navigation size={12} />}
                ตำแหน่งปัจจุบัน
              </button>
              {PRESET_LOCATIONS.map(loc => (
                <button
                  key={loc.name}
                  onClick={() => selectResult(loc)}
                  className="flex-shrink-0 text-xs bg-gray-50 hover:bg-orange-50 hover:text-orange-700 text-gray-600 px-3 py-1.5 rounded-full border border-gray-200 transition-colors"
                >
                  {loc.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Map + details */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden" onClick={() => setShowResults(false)}>
          <LocationMap
            position={pos}
            focusKey={focusKey}
            onPinChange={applyPin}
            onLocate={handleLocate}
            locating={locating}
            className="h-64 sm:h-80 lg:h-auto lg:flex-1 z-0"
          />

          <aside className="lg:w-[26rem] flex-shrink-0 bg-white border-t lg:border-t-0 lg:border-l border-gray-100 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* สถานที่ที่เลือก */}
              <div className="bg-gray-50 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    {resolving ? (
                      <Loader2 size={16} className="text-orange-500 animate-spin" />
                    ) : (
                      <MapPin size={16} className="text-orange-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 text-sm leading-snug">
                      {resolving ? 'กำลังระบุที่อยู่...' : place.name || 'ยังไม่ได้เลือกสถานที่'}
                    </p>
                    <p className="text-xs text-gray-500 leading-snug mt-0.5">
                      {place.address || 'ค้นหา ปักหมุดบนแผนที่ หรือกดใช้ตำแหน่งปัจจุบัน'}
                    </p>
                    {place.province && (
                      <span
                        className={`inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          zone === 'home'
                            ? 'bg-green-100 text-green-700'
                            : zone === 'metro'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {place.province} · {ZONE_LABEL[zone]}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3">
                  {[
                    { label: 'Latitude', value: pos.lat.toFixed(6) },
                    { label: 'Longitude', value: pos.lng.toFixed(6) },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-white rounded-xl px-3 py-2 border border-gray-100">
                      <p className="text-[10px] text-gray-400">{label}</p>
                      <p className="text-xs font-mono font-medium text-gray-700">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {notice && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 text-amber-700 rounded-xl px-3 py-2.5 text-xs">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                  <span>{notice}</span>
                </div>
              )}

              {/* ค่าขนส่ง */}
              {!hasPlace ? (
                <div className="flex items-start gap-2.5 rounded-xl px-3 py-3 text-xs border bg-gray-50 border-gray-100 text-gray-500">
                  <Truck size={15} className="flex-shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    เลือกสถานที่เพื่อตรวจเงื่อนไขพื้นที่ — ใน {HOME_PROVINCE} รับจัดกี่โต๊ะก็ได้ ไม่มีค่าขนส่ง ·
                    นอก {HOME_PROVINCE} ขั้นต่ำ {FREE_DELIVERY_MIN_TABLES} โต๊ะ (กรุงเทพและปริมณฑล ไม่ถึงขั้นต่ำ
                    คิดค่าขนส่ง {DELIVERY_FEE.toLocaleString()} บาท)
                  </div>
                </div>
              ) : (
                <div
                  className={`rounded-xl px-3 py-3 text-xs border ${
                    check.tone === 'blocked'
                      ? 'bg-red-50 border-red-200 text-red-700'
                      : check.tone === 'fee'
                        ? 'bg-orange-50 border-orange-100 text-orange-700'
                        : check.tone === 'ok'
                          ? 'bg-green-50 border-green-100 text-green-700'
                          : 'bg-gray-50 border-gray-100 text-gray-500'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {check.tone === 'blocked' ? (
                      <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                    ) : (
                      <Truck size={15} className="flex-shrink-0 mt-0.5" />
                    )}
                    <div className="leading-relaxed">
                      <span className="font-semibold">{check.title}</span>
                      <span className="block mt-0.5">{check.detail}</span>
                    </div>
                  </div>

                  {check.blocked && (
                    <button
                      onClick={() => navigate('select-table')}
                      className="w-full mt-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 text-xs font-semibold transition-colors"
                    >
                      ย้อนกลับไปเพิ่มจำนวนโต๊ะ
                    </button>
                  )}
                </div>
              )}

              {/* รายละเอียดเพิ่มเติม */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">รายละเอียดเพิ่มเติม</p>
                <div className="space-y-3">
                  {DETAIL_FIELDS.map(({ key, label, placeholder, textarea }) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                      {textarea ? (
                        <textarea
                          rows={2}
                          value={detail[key]}
                          onChange={e => setDetail(d => ({ ...d, [key]: e.target.value }))}
                          placeholder={placeholder}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400 placeholder:text-gray-300"
                        />
                      ) : (
                        <input
                          type="text"
                          value={detail[key]}
                          onChange={e => setDetail(d => ({ ...d, [key]: e.target.value }))}
                          placeholder={placeholder}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 placeholder:text-gray-300"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ปุ่ม */}
            <div className="border-t border-gray-100 p-4 flex gap-3 flex-shrink-0">
              <button
                onClick={() => navigate('select-table')}
                className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-2xl py-3.5 font-semibold transition-colors"
              >
                <ChevronLeft size={18} />
                ย้อนกลับ
              </button>
              <button
                onClick={handleNext}
                disabled={!hasPlace || check.blocked}
                className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-2xl py-3.5 font-semibold transition-all shadow-lg shadow-orange-200 disabled:shadow-none"
              >
                บันทึกสถานที่
                <ChevronRight size={18} />
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
