export type Screen =
  | 'login'
  | 'home'
  | 'booking-calendar'
  | 'select-table'
  | 'select-location'
  | 'select-package'
  | 'select-menu'
  | 'cart'
  | 'history'
  | 'notifications'
  | 'owner-dashboard'
  | 'owner-orders'
  | 'owner-calendar'
  | 'owner-packages'
  | 'owner-menus'
  | 'owner-documents'
  | 'owner-customers'
  | 'owner-settings'

export interface Category {
  id: string
  label: string
  labelEn: string
  icon: string
  gradient: string
}

export interface MenuItem {
  id: string
  name: string
  category: string
  description: string
  image?: string
  extraPrice?: number
  /** ราคาทุนต่อจาน (บาท) — กรอกตรงๆ ไม่คำนวณจากวัตถุดิบ */
  costPrice?: number
  /** ราคาขายต่อจาน (บาท) — ใช้คิดกำไรต่อจาน */
  sellPrice?: number
  /** เปิด/ปิดการแสดงในคลังเมนูของร้าน (ไม่ตั้งค่า = เปิด) */
  active?: boolean
}

/** หนึ่ง "ข้อ" ในเมนูโต๊ะจีน — เลือกได้ 1 อย่าง หรือเป็นรายการที่รวมมาให้แล้ว */
export interface PackageCourse {
  no: number
  title: string
  category: string
  /** จำนวนที่ลูกค้าเลือกได้ในข้อนี้ (0 = รวมในแพ็กเกจ ไม่ต้องเลือก) */
  choose: number
  items: MenuItem[]
}

export interface Package {
  id: string
  name: string
  pricePerTable: number
  menuLimit: number
  description: string
  features: string[]
  badge?: string
  courses: PackageCourse[]
}

/** รายละเอียดเพิ่มเติมของสถานที่จัดงานที่ลูกค้ากรอกเอง */
export interface LocationDetail {
  houseNo: string
  building: string
  village: string
  landmark: string
  accessNote: string
}

/** โซนบริการของร้าน — home = นครปฐม, metro = กรุงเทพและปริมณฑล */
export type ServiceZone = 'home' | 'metro' | 'outside'

/** สถานที่จัดงาน — พิกัดจากแผนที่ + รายละเอียดที่ลูกค้ากรอก */
export interface EventLocation {
  lat: number
  lng: number
  /** ชื่อสถานที่ เช่น โรงแรม Centara Grand */
  name: string
  /** ที่อยู่เต็มจากแผนที่ */
  address: string
  province: string
  /** โซนบริการ: นครปฐม (พื้นที่ร้าน) / กรุงเทพและปริมณฑล / นอกพื้นที่ — ใช้คิดค่าขนส่ง */
  zone: ServiceZone
  detail: LocationDetail
}

export interface BookingData {
  date: string | null
  timeSlot: string | null
  tables: number
  guestCount: number
  location: EventLocation | null
  packageId: string | null
  packageName: string | null
  packagePrice: number
  menuLimit: number
  selectedMenus: MenuItem[]
}

/** จำนวนพนักงานแยกตามตำแหน่ง */
export interface StaffPlan {
  servers: number
  chefs: number
  assistants: number
  dishwashers: number
}

/** ผลลัพธ์ที่ระบบคำนวณจากจำนวนโต๊ะ */
export interface StaffCalculation extends StaffPlan {
  total: number
}

export interface Booking {
  id: string
  customerName: string
  date: string
  timeSlot: string
  tables: number
  guestCount: number
  packageName: string
  totalPrice: number
  /** แยกยอดไว้ออกเอกสาร — ยอดค่าอาหาร + ค่าขนส่ง = totalPrice */
  pricePerTable?: number
  deliveryFee?: number
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  location: string
  /** พิกัดและรายละเอียดสถานที่จากแผนที่ (ใช้วางแผนการเดินทาง) */
  locationDetail?: EventLocation
  menus: string[]
  phone: string
  /** Line ID ของลูกค้า ณ ตอนจอง — ใช้ให้ร้านติดต่อ/ดูประวัติที่หน้า "ลูกค้า" */
  lineId?: string
  /** จำนวนพนักงานที่ระบบคำนวณได้ ณ ตอนบันทึก (เก็บไว้อ้างอิง) */
  staffAuto?: StaffPlan
  /** จำนวนพนักงานที่เจ้าของร้านปรับแก้และใช้จริง */
  staffActual?: StaffPlan
  /** หมายเหตุของงาน เช่น งาน VIP, งานนอกสถานที่ */
  staffNote?: string
  /** เวลาที่บันทึกแผนกำลังคนล่าสุด */
  staffSavedAt?: string
  /** สลิปโอนเงินมัดจำที่ลูกค้าแนบ (data URL) — ร้านตรวจสอบกับบัญชีเองแล้วเปลี่ยนสถานะ */
  paymentSlip?: string
  /** เวลาที่แนบสลิปล่าสุด */
  paymentSlipUploadedAt?: string
}

export interface UserProfile {
  name: string
  surname: string
  phone: string
  lineId: string
  email: string
  avatar: string
}

/** ข้อมูลร้านที่แสดงบนหัวเอกสารใบเสนอราคา/ใบจอง */
export interface ShopInfo {
  name: string
  nameEn: string
  initials: string
  address: string
  phone: string
  line: string
}

/** ค่าตั้งค่าของร้านที่เจ้าของร้านแก้ไขได้จากหน้า "ตั้งค่า" */
export interface AppSettings {
  shopInfo: ShopInfo
  /** อัตรามัดจำ 0–1 เช่น 0.5 = 50% */
  depositRate: number
  /** ค่าขนส่งสำหรับกรุงเทพและปริมณฑลที่จองไม่ถึงขั้นต่ำ (บาท) */
  deliveryFee: number
  /** จำนวนโต๊ะขั้นต่ำสำหรับงานนอกพื้นที่ร้าน */
  freeDeliveryMinTables: number
  /** ค่าแรงพ่อครัว (บาท/คน/งาน) */
  wageChef: number
  /** ค่าแรงผู้ช่วยพ่อครัว (บาท/คน/งาน) */
  wageAssistant: number
  /** ค่าแรงเสิร์ฟ (บาท/โต๊ะ) — คิดตามจำนวนโต๊ะโดยตรง ไม่ใช่ต่อคน */
  wageServerPerTable: number
  /** ค่าแรงพนักงานล้างจาน (บาท/คน/งาน) */
  wageDishwasher: number
}
