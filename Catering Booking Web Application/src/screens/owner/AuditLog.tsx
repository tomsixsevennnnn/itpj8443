import { useEffect, useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronRight, History, Loader2 } from 'lucide-react'
import { resolveImageUrl, type AuditLogEntry, type AuditLogPage } from '../../api'

interface AuditLogProps {
  onFetchPage: (page: number, pageSize: number) => Promise<AuditLogPage>
}

const PAGE_SIZE = 20

/** ป้าย action อ่านง่าย — แปลจาก action string ฝั่ง backend (ดู service ต่างๆ ที่เรียก audit.log) */
const ACTION_LABEL: Record<string, string> = {
  'menu.create': 'เพิ่มเมนู',
  'menu.update': 'แก้ไขเมนู',
  'menu.delete': 'ลบเมนู',
  'package.create': 'เพิ่มแพ็กเกจ',
  'package.update': 'แก้ไขแพ็กเกจ',
  'package.delete': 'ลบแพ็กเกจ',
  'booking.update': 'แก้ไขใบจอง',
  'settings.update': 'แก้ไขค่าตั้งค่าร้าน',
  'user.setRole': 'เปลี่ยนสิทธิ์ผู้ใช้',
}

const actionLabel = (action: string) => ACTION_LABEL[action] ?? action

const actionTone = (action: string) =>
  action.endsWith('.delete')
    ? 'bg-red-50 text-red-600'
    : action.endsWith('.create')
      ? 'bg-green-50 text-green-600'
      : 'bg-orange-50 text-orange-600'

/** ============ มุมมองเจ้าของร้าน — แปล before/after ดิบให้อ่านง่าย ============ */

/** ชื่อฟิลด์ (raw) → ป้ายภาษาไทย รวมทุก entity (MenuItem/Package/Booking/Settings/User) ไว้ที่เดียว
 *  เพราะบริบท (action label ด้านบน) บอกอยู่แล้วว่าเป็นของ entity ไหน โอกาสชนกันน้อยและไม่เป็นปัญหา */
const FIELD_LABELS: Record<string, string> = {
  name: 'ชื่อ',
  category: 'ประเภท',
  description: 'รายละเอียด',
  image: 'รูปภาพ',
  costPrice: 'ราคาทุน',
  active: 'สถานะเปิดขาย',
  pricePerTable: 'ราคาต่อโต๊ะ',
  menuLimit: 'จำนวนรายการสูงสุด',
  features: 'จุดเด่น',
  badge: 'ป้ายกำกับ',
  courses: 'รายการอาหารในแพ็กเกจ',
  status: 'สถานะ',
  date: 'วันที่',
  timeSlot: 'ช่วงเวลา',
  tables: 'จำนวนโต๊ะ',
  guestCount: 'จำนวนแขก',
  packageName: 'ชื่อแพ็กเกจ',
  totalPrice: 'ราคารวม',
  deliveryFee: 'ค่าขนส่ง',
  location: 'สถานที่',
  locationDetail: 'รายละเอียดสถานที่',
  menus: 'รายการเมนู',
  phone: 'เบอร์โทร',
  lineId: 'Line ID',
  staffAuto: 'แผนกำลังคน (ระบบคำนวณ)',
  staffActual: 'แผนกำลังคน (ปรับแก้)',
  staffNote: 'หมายเหตุกำลังคน',
  paymentSlipUrl: 'สลิปโอนเงิน',
  deletedAt: 'สถานะการลบ',
  role: 'สิทธิ์การใช้งาน',
  shopName: 'ชื่อร้าน',
  shopNameEn: 'ชื่อร้าน (อังกฤษ)',
  shopAddress: 'ที่อยู่ร้าน',
  shopPhone: 'เบอร์โทรร้าน',
  shopLine: 'Line ร้าน',
  shopLogo: 'โลโก้ร้าน',
  shopLoginTagline: 'คำโปรยหน้า Login',
  bankName: 'ธนาคาร',
  bankAccountNumber: 'เลขบัญชี',
  bankAccountName: 'ชื่อบัญชี',
  promptPayQr: 'รูป QR พร้อมเพย์',
  promptPayQrFirstName: 'ชื่อเจ้าของ QR (สำรอง)',
  promptPayQrLastName: 'นามสกุลเจ้าของ QR (สำรอง)',
  promptPayId: 'เลขพร้อมเพย์',
  promptPayFirstName: 'ชื่อเจ้าของพร้อมเพย์',
  promptPayLastName: 'นามสกุลเจ้าของพร้อมเพย์',
  depositRate: 'อัตรามัดจำ',
  freeDeliveryMinTables: 'จำนวนโต๊ะขั้นต่ำฟรีค่าขนส่ง',
  metroProvinces: 'จังหวัดโซนใกล้เคียง',
  homeProvince: 'จังหวัดที่ร้านตั้งอยู่',
  brandColor: 'สีแบรนด์',
  wageChef: 'ค่าแรงพ่อครัว',
  wageAssistant: 'ค่าแรงผู้ช่วย',
  wageServerPerTable: 'ค่าแรงเสิร์ฟ/โต๊ะ',
  wageDishwasher: 'ค่าแรงล้างจาน',
  tablesPerServer: 'โต๊ะ/พนักงานเสิร์ฟ 1 คน',
  tablesPerSupport: 'โต๊ะ/ผู้ช่วย 1 คน',
  staffRemainderThreshold: 'เกณฑ์เศษโต๊ะเพิ่มพนักงาน',
  slotMorningHours: 'ช่วงเวลาเช้า',
  slotNoonHours: 'ช่วงเวลากลางวัน',
  slotEveningHours: 'ช่วงเวลาเย็น',
  quotationValidDays: 'ใบเสนอราคายืนราคา (วัน)',
  quotationTerms: 'เงื่อนไขใบเสนอราคา',
  bookingTerms: 'เงื่อนไขการจอง',
  categoryOrder: 'ลำดับประเภทอาหาร',
  closedDates: 'วันที่ร้านปิด',
  shopLocationLat: 'พิกัดร้าน (ละติจูด)',
  shopLocationLng: 'พิกัดร้าน (ลองจิจูด)',
  fuelCostPerKm: 'ค่าน้ำมัน/กม.',
  homeContent: 'เนื้อหาหน้าแรก',
  categories: 'ประเภทอาหารของร้าน',
}

const fieldLabel = (key: string) => FIELD_LABELS[key] ?? key

/** ฟิลด์เทคนิคล้วนๆ ที่ owner ไม่ต้องเห็นเลย (id อ้างอิงภายใน/timestamp ที่เปลี่ยนทุกครั้งอยู่แล้ว) */
const HIDDEN_FIELDS = new Set(['id', 'updatedAt', 'createdAt', 'lastEditedBy', 'customerId', 'packageId', 'sortOrder'])

const ZONE_LABEL: Record<string, string> = { home: 'ในพื้นที่ร้าน', metro: 'กรุงเทพ/ปริมณฑล', outside: 'นอกพื้นที่' }

/** สรุปรายการอาหารในแพ็กเกจ (Package.courses) เป็นข้อความอ่านง่าย แทนโครงสร้างซ้อน course→items */
const summarizeCourses = (value: unknown): string => {
  if (!Array.isArray(value)) return '— (ว่าง)'
  if (value.length === 0) return '(ไม่มีรายการ)'
  return value
    .map((c: Record<string, unknown>) => {
      const items = Array.isArray(c.items) ? c.items.length : 0
      return `${c.title ?? '(ไม่มีชื่อข้อ)'} (${items} อย่าง)`
    })
    .join(', ')
}

interface CourseLike {
  no: number
  title: string
  category: string
  choose: number
  items?: { id: string; name?: string }[]
}

/** เทียบ courses ก่อน/หลังทีละข้อ (จับคู่ด้วย "no" = ลำดับข้อ) — คืนเฉพาะข้อที่เปลี่ยนจริง
 *  ไม่เอาข้อที่เหมือนเดิมมาแสดง กันต้องไล่เทียบทั้งรายการเอง */
function diffCourseList(before: unknown, after: unknown): string[] {
  const b = Array.isArray(before) ? (before as CourseLike[]) : []
  const a = Array.isArray(after) ? (after as CourseLike[]) : []
  const byNoB = new Map(b.map(c => [c.no, c]))
  const byNoA = new Map(a.map(c => [c.no, c]))
  const nos = [...new Set([...byNoB.keys(), ...byNoA.keys()])].sort((x, y) => x - y)
  const lines: string[] = []

  for (const no of nos) {
    const cb = byNoB.get(no)
    const ca = byNoA.get(no)
    if (cb && !ca) {
      lines.push(`ลบข้อ ${no} "${cb.title}" ออกจากแพ็กเกจ`)
      continue
    }
    if (!cb && ca) {
      const itemNames = (ca.items ?? []).map(i => i.name ?? i.id)
      lines.push(
        itemNames.length > 0
          ? `เพิ่มข้อใหม่ ${no} "${ca.title}" (${itemNames.length} อย่าง): ${itemNames.join(', ')}`
          : `เพิ่มข้อใหม่ ${no} "${ca.title}" (ยังไม่มีเมนู)`
      )
      continue
    }
    if (!cb || !ca) continue

    const changes: string[] = []
    if (cb.title !== ca.title) changes.push(`ชื่อข้อ: "${cb.title}" → "${ca.title}"`)
    if (cb.category !== ca.category) changes.push(`ประเภทอาหาร: ${cb.category} → ${ca.category}`)
    if (cb.choose !== ca.choose) changes.push(`จำนวนที่ลูกค้าเลือกได้: ${cb.choose} → ${ca.choose}`)

    const itemsB = cb.items ?? []
    const itemsA = ca.items ?? []
    const idsB = new Set(itemsB.map(i => i.id))
    const idsA = new Set(itemsA.map(i => i.id))
    const nameOf = (id: string) => itemsA.find(i => i.id === id)?.name ?? itemsB.find(i => i.id === id)?.name ?? id
    const added = [...idsA].filter(id => !idsB.has(id)).map(nameOf)
    const removed = [...idsB].filter(id => !idsA.has(id)).map(nameOf)
    if (added.length > 0) changes.push(`เพิ่มเมนู: ${added.join(', ')}`)
    if (removed.length > 0) changes.push(`ลบเมนู: ${removed.join(', ')}`)

    if (changes.length > 0) lines.push(`ข้อ ${no} "${ca.title}" — ${changes.join(' · ')}`)
  }

  return lines
}

/** สรุปแผนกำลังคน (StaffPlan) เป็นข้อความอ่านง่าย */
const summarizeStaffPlan = (value: unknown): string => {
  if (value == null || typeof value !== 'object') return '— (ว่าง)'
  const p = value as Record<string, number>
  return `พ่อครัว ${p.chefs ?? 0} คน, ผู้ช่วย ${p.assistants ?? 0} คน, เสิร์ฟ ${p.servers ?? 0} คน, ล้างจาน ${p.dishwashers ?? 0} คน`
}

/** สรุปรายละเอียดสถานที่จัดงาน (EventLocation) เป็นข้อความอ่านง่าย */
const summarizeLocationDetail = (value: unknown): string => {
  if (value == null || typeof value !== 'object') return '— (ว่าง)'
  const l = value as Record<string, unknown>
  const zone = typeof l.zone === 'string' ? (ZONE_LABEL[l.zone] ?? l.zone) : null
  return [l.name, l.address, zone].filter(v => typeof v === 'string' && v).join(' · ') || '— (ว่าง)'
}

/** สรุปตำแหน่งครอปรูป ({x,y}) เป็น % */
const summarizeImagePosition = (value: unknown): string => {
  if (value == null || typeof value !== 'object') return '— (ว่าง)'
  const p = value as Record<string, number>
  return `ตำแหน่ง x: ${p.x ?? 0}%, y: ${p.y ?? 0}%`
}

/** สรุปประเภทอาหารของร้าน (Category[]) เป็นรายชื่อ */
const summarizeCategories = (value: unknown): string => {
  if (!Array.isArray(value)) return '— (ว่าง)'
  const labels = value.map((c: Record<string, unknown>) => c.label ?? c.id)
  return labels.length > 0 ? labels.join(', ') : '(ไม่มีประเภท)'
}

/** สรุปเนื้อหาหน้าแรก (HomeContent) เป็นหัวข้อสำคัญ แทนการ dump โครงสร้างทั้งหน้า */
const summarizeHomeContent = (value: unknown): string => {
  if (value == null || typeof value !== 'object') return '— (ว่าง)'
  const c = value as Record<string, unknown>
  const parts: string[] = []
  if (typeof c.heroTitle === 'string' && c.heroTitle) parts.push(`หัวข้อ Hero: "${c.heroTitle}"`)
  if (typeof c.heroBadge === 'string' && c.heroBadge) parts.push(`ป้าย Hero: "${c.heroBadge}"`)
  if (Array.isArray(c.steps)) parts.push(`ขั้นตอนการจอง ${c.steps.length} ข้อ`)
  if (Array.isArray(c.gallery)) parts.push(`แกลเลอรี ${c.gallery.length} รูป`)
  return parts.length > 0 ? parts.join(' · ') : 'มีการเปลี่ยนแปลง'
}

/** ฟิลด์ที่โครงสร้างซับซ้อน (object/array ซ้อนกัน) — มีตัวสรุปเฉพาะทางด้านบนให้แต่ละฟิลด์ */
const COMPLEX_FIELD_SUMMARY: Record<string, (value: unknown) => string> = {
  courses: summarizeCourses,
  staffAuto: summarizeStaffPlan,
  staffActual: summarizeStaffPlan,
  locationDetail: summarizeLocationDetail,
  imagePosition: summarizeImagePosition,
  categories: summarizeCategories,
  homeContent: summarizeHomeContent,
}

const PRICE_FIELDS = new Set([
  'pricePerTable', 'costPrice', 'totalPrice', 'deliveryFee',
  'wageChef', 'wageAssistant', 'wageServerPerTable', 'wageDishwasher', 'fuelCostPerKm',
])

const BOOKING_STATUS_LABEL: Record<string, string> = {
  pending: 'รอยืนยัน', confirmed: 'ยืนยันแล้ว', completed: 'เสร็จสิ้น', cancelled: 'ยกเลิก',
  PENDING: 'รอยืนยัน', CONFIRMED: 'ยืนยันแล้ว', COMPLETED: 'เสร็จสิ้น', CANCELLED: 'ยกเลิก',
}

const isPlainStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(v => typeof v === 'string')

const formatDateValue = (value: unknown) => {
  const d = new Date(value as string)
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

/** แปลงค่า raw ให้อ่านง่ายตามชนิด/ความหมายของฟิลด์ */
function formatFieldValue(key: string, value: unknown): string {
  if (COMPLEX_FIELD_SUMMARY[key]) return value == null ? '— (ว่าง)' : COMPLEX_FIELD_SUMMARY[key](value)
  if (value == null || value === '') return '— (ว่าง)'
  if (key === 'deletedAt') return `ถูกลบเมื่อ ${formatDateValue(value)}`
  if (key === 'role') return value === 'OWNER' ? 'เจ้าของร้าน' : 'ลูกค้า'
  if (key === 'status') return BOOKING_STATUS_LABEL[value as string] ?? String(value)
  if (typeof value === 'boolean') return key === 'active' ? (value ? 'เปิดขาย' : 'ปิดขาย') : value ? 'ใช่' : 'ไม่ใช่'
  if (key === 'depositRate' && typeof value === 'number') return `${Math.round(value * 100)}%`
  if (typeof value === 'number') return PRICE_FIELDS.has(key) ? `${value.toLocaleString('th-TH')} บาท` : value.toLocaleString('th-TH')
  if (isPlainStringArray(value)) return value.length > 0 ? value.join(', ') : '— (ว่าง)'
  if (typeof value === 'object') return 'มีการเปลี่ยนแปลง (รายละเอียดซับซ้อน)'
  return String(value)
}

type DiffEntry =
  | { key: string; mode: 'set'; value: unknown }
  | { key: string; mode: 'changed'; before: unknown; after: unknown }

/** ฟิลด์ที่เก็บ path รูปภาพ — โชว์ path พร้อมรูปตัวอย่างจริงคู่กัน ไม่ใช่แค่ข้อความ path เฉยๆ */
const IMAGE_FIELDS = new Set(['image', 'shopLogo', 'promptPayQr'])

/** ค่าดิบของฝั่ง before/after ของ DiffEntry หนึ่งตัว — ใช้แยกจาก formatFieldValue (ที่คืนข้อความ) เพราะรูปภาพ
 *  ต้องเอาค่าดิบ (path จริง) ไป resolve เป็น URL render <img> ด้วย ไม่ใช่แค่เอาไปแสดงเป็นข้อความ */
const sideValue = (d: DiffEntry, side: 'before' | 'after'): unknown => {
  if (d.mode === 'set') return side === 'after' ? d.value : undefined
  return side === 'before' ? d.before : d.after
}

/** เทียบ before/after เหลือแค่ฟิลด์ที่เปลี่ยนจริง — ฟิลด์ที่ไม่เปลี่ยน (เช่น id, ฟิลด์ที่ไม่ได้แตะ) จะไม่โผล่มาเอง
 *  อยู่แล้วเพราะเทียบค่าตรงๆ ไม่ต้อง filter ทิ้งเพิ่ม ยกเว้น HIDDEN_FIELDS ที่เป็น noise แม้จะ "เปลี่ยน" ทุกครั้ง (เช่น updatedAt) */
function diffEntries(before: unknown, after: unknown): DiffEntry[] {
  const b = (before ?? {}) as Record<string, unknown>
  const a = (after ?? {}) as Record<string, unknown>
  const keys = new Set([...Object.keys(b), ...Object.keys(a)])
  const entries: DiffEntry[] = []
  for (const key of keys) {
    if (HIDDEN_FIELDS.has(key)) continue
    const hasBefore = before != null
    const bv = b[key]
    const av = a[key]
    if (JSON.stringify(bv) === JSON.stringify(av)) continue
    if (!hasBefore) {
      if (av == null || av === '') continue
      entries.push({ key, mode: 'set', value: av })
    } else {
      entries.push({ key, mode: 'changed', before: bv, after: av })
    }
  }
  return entries
}

function EntryRow({ entry, viewMode }: { entry: AuditLogEntry; viewMode: 'friendly' | 'raw' }) {
  const [open, setOpen] = useState(false)
  const hasDetail = entry.before != null || entry.after != null
  const diff = diffEntries(entry.before, entry.after)
  // "courses" (รายการอาหารในแพ็กเกจ) แยกไปแสดงเป็นรายข้อที่เปลี่ยนจริงต่างหาก ไม่ปนกับฟิลด์อื่นแบบ before/after บรรทัดเดียว
  const coursesDiff = diff.find(d => d.key === 'courses')
  const fieldDiff = diff.filter(d => d.key !== 'courses')
  const courseLines = coursesDiff
    ? diffCourseList(coursesDiff.mode === 'changed' ? coursesDiff.before : [], coursesDiff.mode === 'changed' ? coursesDiff.after : coursesDiff.value)
    : []

  return (
    <div className="bg-gray-50 rounded-xl px-4 py-3">
      <button
        type="button"
        onClick={() => hasDetail && setOpen(o => !o)}
        className={`w-full flex items-center justify-between gap-3 text-left ${hasDetail ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <div className="min-w-0 flex items-center gap-2">
          {hasDetail && (open ? <ChevronDown size={14} className="text-gray-400 flex-shrink-0" /> : <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />)}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${actionTone(entry.action)}`}>
                {actionLabel(entry.action)}
              </span>
              <span className="text-xs text-gray-400">
                {entry.entityType} · {entry.entityId}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              โดย {entry.actorRole === 'OWNER' ? 'เจ้าของร้าน' : 'ลูกค้า'}
              {entry.actorEmail ? ` (${entry.actorEmail})` : ` (${entry.actorUserId.slice(0, 8)}…)`}
            </p>
          </div>
        </div>
        <span className="text-[11px] text-gray-400 flex-shrink-0">
          {new Date(entry.createdAt).toLocaleString('th-TH', {
            day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit',
          })}
        </span>
      </button>

      {open && hasDetail && viewMode === 'raw' && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 mb-1">ก่อนแก้ไข</p>
            <pre className="text-[10px] bg-white border border-gray-200 rounded-lg p-2 overflow-auto max-h-48 whitespace-pre-wrap break-all">
              {entry.before != null ? JSON.stringify(entry.before, null, 2) : '—'}
            </pre>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 mb-1">หลังแก้ไข</p>
            <pre className="text-[10px] bg-white border border-gray-200 rounded-lg p-2 overflow-auto max-h-48 whitespace-pre-wrap break-all">
              {entry.after != null ? JSON.stringify(entry.after, null, 2) : '—'}
            </pre>
          </div>
        </div>
      )}

      {open && hasDetail && viewMode === 'friendly' && (
        <div className="mt-3 space-y-2">
          {fieldDiff.length === 0 && courseLines.length === 0 ? (
            <p className="text-xs text-gray-400 px-1">ไม่มีข้อมูลที่เปลี่ยนแปลงให้แสดง</p>
          ) : (
            <>
              {fieldDiff.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 mb-1">ก่อนแก้ไข</p>
                    <div className="bg-white border border-gray-200 rounded-lg p-2 space-y-2">
                      {fieldDiff.map(d => {
                        const raw = sideValue(d, 'before')
                        const isImage = IMAGE_FIELDS.has(d.key)
                        const hasImage = isImage && typeof raw === 'string' && raw
                        return (
                          <div key={d.key} className="text-xs">
                            <p>
                              <span className="font-semibold text-gray-600">{fieldLabel(d.key)}</span>
                              {!isImage && (
                                <span className="text-gray-500">: {d.mode === 'set' ? '— (ยังไม่มี)' : formatFieldValue(d.key, raw)}</span>
                              )}
                            </p>
                            {isImage && (
                              hasImage ? (
                                <img
                                  src={resolveImageUrl(raw as string)}
                                  alt=""
                                  className="mt-1 w-20 h-20 object-cover rounded-lg border border-gray-200"
                                />
                              ) : (
                                <span className="text-gray-500">— (ยังไม่มี)</span>
                              )
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 mb-1">หลังแก้ไข</p>
                    <div className="bg-white border border-gray-200 rounded-lg p-2 space-y-2">
                      {fieldDiff.map(d => {
                        const raw = sideValue(d, 'after')
                        const isImage = IMAGE_FIELDS.has(d.key)
                        const hasImage = isImage && typeof raw === 'string' && raw
                        return (
                          <div key={d.key} className="text-xs">
                            <p>
                              <span className="font-semibold text-gray-600">{fieldLabel(d.key)}</span>
                              {!isImage && <span className="text-gray-800 font-medium">: {formatFieldValue(d.key, raw)}</span>}
                            </p>
                            {isImage && (
                              hasImage ? (
                                <img
                                  src={resolveImageUrl(raw as string)}
                                  alt=""
                                  className="mt-1 w-20 h-20 object-cover rounded-lg border border-gray-200"
                                />
                              ) : (
                                <span className="text-gray-500">— (ว่าง)</span>
                              )
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* รายการอาหารในแพ็กเกจ — โชว์เฉพาะ "ข้อ" ที่เปลี่ยนจริง ไม่เอาทั้งหมวดที่ไม่ได้แก้มาแสดง */}
              {courseLines.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 mb-1">รายการอาหารในแพ็กเกจที่เปลี่ยน</p>
                  <div className="bg-white border border-gray-200 rounded-lg p-2 space-y-1">
                    {courseLines.map((line, i) => (
                      <p key={i} className="text-xs text-gray-700">{line}</p>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function AuditLog({ onFetchPage }: AuditLogProps) {
  const [page, setPage] = useState(1)
  const [data, setData] = useState<AuditLogPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'friendly' | 'raw'>('friendly')

  useEffect(() => {
    setLoading(true)
    setError(null)
    onFetchPage(page, PAGE_SIZE)
      .then(setData)
      .catch(err => setError(err instanceof Error ? err.message : 'โหลดประวัติไม่สำเร็จ'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1

  return (
    <div className="max-w-2xl space-y-5 pb-24">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
          <div className="flex items-center gap-2">
            <History size={18} className="text-orange-500" />
            <h2 className="font-bold text-gray-900">ประวัติการแก้ไข</h2>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-full p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('friendly')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                viewMode === 'friendly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              มุมมองเจ้าของร้าน
            </button>
            <button
              type="button"
              onClick={() => setViewMode('raw')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                viewMode === 'raw' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              ข้อมูลดิบ (dev)
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          บันทึกการลบเมนู/แพ็กเกจ แก้ไขใบจอง/ค่าตั้งค่าร้าน และเลื่อน/ถอดสิทธิ์เจ้าของร้าน — ล่าสุดขึ้นก่อน
        </p>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-400">
            <Loader2 size={16} className="animate-spin" />
            กำลังโหลด...
          </div>
        )}
        {!loading && error && (
          <p className="flex items-center gap-1.5 text-xs text-red-600">
            <AlertTriangle size={12} />
            {error}
          </p>
        )}
        {!loading && !error && data && data.items.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">ยังไม่มีประวัติการแก้ไข</p>
        )}
        {!loading && !error && data && data.items.length > 0 && (
          <div className="space-y-2">
            {data.items.map(entry => (
              <EntryRow key={entry.id} entry={entry} viewMode={viewMode} />
            ))}
          </div>
        )}

        {!loading && data && data.total > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="text-xs font-medium text-gray-500 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed"
            >
              ก่อนหน้า
            </button>
            <span className="text-xs text-gray-400">หน้า {page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="text-xs font-medium text-gray-500 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed"
            >
              ถัดไป
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
