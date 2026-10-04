/** ชื่อธนาคารจากรหัส 3 หลักที่ SlipOK ส่งกลับมา (รหัสตาม ธปท.) — ไม่รู้จักคืนรหัสเดิม (ต้องตรงกับ backend slip-verify/receiver-match.ts) */
const BANK_NAMES: Record<string, string> = {
  '002': 'ธนาคารกรุงเทพ',
  '004': 'ธนาคารกสิกรไทย',
  '006': 'ธนาคารกรุงไทย',
  '011': 'ธนาคารทหารไทยธนชาต (ttb)',
  '014': 'ธนาคารไทยพาณิชย์',
  '022': 'ธนาคารซีไอเอ็มบี ไทย',
  '024': 'ธนาคารยูโอบี',
  '025': 'ธนาคารกรุงศรีอยุธยา',
  '030': 'ธนาคารออมสิน',
  '033': 'ธนาคารอาคารสงเคราะห์',
  '034': 'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (ธ.ก.ส.)',
  '035': 'ธนาคารเพื่อการส่งออกและนำเข้าแห่งประเทศไทย (EXIM)',
  '066': 'ธนาคารอิสลามแห่งประเทศไทย',
  '067': 'ธนาคารทิสโก้',
  '069': 'ธนาคารเกียรตินาคินภัทร',
  '070': 'ธนาคารไอซีบีซี (ไทย)',
  '071': 'ธนาคารไทยเครดิต',
  '073': 'ธนาคารแลนด์ แอนด์ เฮ้าส์',
  '098': 'ธนาคารพัฒนาวิสาหกิจขนาดกลางและขนาดย่อมแห่งประเทศไทย (SME D Bank)',
}

export const bankNameOf = (code: string): string => BANK_NAMES[code] ?? code

/** รู้จักรหัสธนาคารนี้ไหม (มีชื่อธนาคารให้) — ใช้ตัดสินว่าเติมชื่อธนาคารให้อัตโนมัติได้หรือไม่ */
export const isKnownBank = (code: string): boolean => code in BANK_NAMES

/** รายชื่อธนาคารให้เลือกในช่อง "ธนาคาร" ของหน้าตั้งค่า (ชื่อเดียวกับที่ bankNameOf คืน เพื่อเทียบกับธนาคารที่ SlipOK เห็นได้ตรงตัว) */
export const THAI_BANK_NAMES: readonly string[] = Object.values(BANK_NAMES)

export interface BankBrand {
  /** อักษรย่อ + สีประจำธนาคาร (ค่าโดยประมาณของสีแบรนด์) — ใช้เป็นป้ายสำรองตอนโหลดโลโก้ไม่ได้ */
  abbr: string
  color: string
  /** true = ตัวอักษรบนป้ายสำรองเป็นสีเข้ม (พื้นสีสว่าง เช่นเหลืองของกรุงศรี) */
  dark?: boolean
  /** path ไฟล์โลโก้ใน public/banks (ที่มาและเงื่อนไขดู public/banks/README.md) — ไม่มีไฟล์ (เช่น EXIM, SME D Bank) = ใช้ป้ายสีพร้อมอักษรย่อ */
  logo?: string
}

/** สัญลักษณ์ธนาคารสำหรับ BankBadge — logo = ไฟล์โลโก้จริงใน public/banks */
const BANK_BRANDS: Record<string, BankBrand> = {
  '002': { abbr: 'BBL', color: '#1e4598', logo: '/banks/BBL.png' },
  '004': { abbr: 'KBANK', color: '#138f2d', logo: '/banks/KBANK.png' },
  '006': { abbr: 'KTB', color: '#1ba5e0', logo: '/banks/KTB.png' },
  '011': { abbr: 'ttb', color: '#1279be', logo: '/banks/TTB.png' },
  '014': { abbr: 'SCB', color: '#4e2e7f', logo: '/banks/SCB.png' },
  '022': { abbr: 'CIMB', color: '#7e2f36', logo: '/banks/CIMB.png' },
  '024': { abbr: 'UOB', color: '#0b3979', logo: '/banks/UOB.png' },
  '025': { abbr: 'BAY', color: '#fec43b', dark: true, logo: '/banks/BAY.png' },
  '030': { abbr: 'GSB', color: '#eb198d', logo: '/banks/GSB.png' },
  '033': { abbr: 'GHB', color: '#f57d23', logo: '/banks/GHB.png' },
  '034': { abbr: 'BAAC', color: '#4b9b1d', logo: '/banks/BAAC.png' },
  '035': { abbr: 'EXIM', color: '#0f6ab4' },
  '066': { abbr: 'ISBT', color: '#1d7a46', logo: '/banks/IBANK.png' },
  '067': { abbr: 'TISCO', color: '#12549f', logo: '/banks/TISCO.png' },
  '069': { abbr: 'KKP', color: '#199cc5', logo: '/banks/KKP.png' },
  '070': { abbr: 'ICBC', color: '#c50f1c', logo: '/banks/ICBC.png' },
  '071': { abbr: 'TCRB', color: '#00a19a', logo: '/banks/TCRB.png' },
  '073': { abbr: 'LH', color: '#6d6e71', logo: '/banks/LHB.png' },
  '098': { abbr: 'SME', color: '#e8730c' },
}

/** รหัสธนาคารจากชื่อที่แสดง (ชื่อเดียวกับที่ bankNameOf คืน) — ไม่รู้จักคืน null */
export const bankCodeOfName = (name: string): string | null => {
  const trimmed = name.trim()
  return Object.entries(BANK_NAMES).find(([, n]) => n === trimmed)?.[0] ?? null
}

/** ข้อมูลป้ายสัญลักษณ์ของธนาคาร รับได้ทั้งรหัส 3 หลักและชื่อธนาคาร — ไม่รู้จักคืน null (ไม่ต้องแสดงป้าย) */
export const bankBrandOf = (codeOrName: string): BankBrand | null =>
  BANK_BRANDS[codeOrName] ?? BANK_BRANDS[bankCodeOfName(codeOrName) ?? ''] ?? null
