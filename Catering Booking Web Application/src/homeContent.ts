/** เนื้อหาหน้าแรก (Home.tsx) ที่เจ้าของร้านแก้ไขได้จากหน้า "ตั้งค่า" */

export interface HomeStep {
  icon: string
  title: string
  desc: string
}

export interface HomeContent {
  heroImage: string
  heroBadge: string
  heroTitle: string
  heroTitleHighlight: string
  heroDescription: string
  /** ข้อความการ์ดจุดเด่น 4 อัน — ไอคอน/สีคงที่ในโค้ด (Home.tsx) เรียงตามตำแหน่งเดียวกัน */
  featureBadges: string[]
  /** ขั้นตอนการจอง — ต้องมี 6 ข้อเสมอ ตรงกับ flow การจองจริง */
  steps: HomeStep[]
  gallery: string[]
  ctaTitle: string
  ctaDescription: string
}

/** ค่าเริ่มต้น — ใช้ตอนร้านยังไม่เคย customize เนื้อหาหน้าแรก (settings.homeContent เป็น null) */
export const DEFAULT_HOME_CONTENT: HomeContent = {
  heroImage: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&h=800&fit=crop&auto=format',
  heroBadge: 'รับจัดเลี้ยงนอกสถานที่ทั่วนครปฐม',
  heroTitle: 'บริการรับจัดเลี้ยง',
  heroTitleHighlight: 'นอกสถานที่',
  heroDescription: 'ครบครัน มืออาชีพ อร่อย ราคาสมเหตุสมผล\nจัดงานเลี้ยง งานแต่งงาน งานบริษัท ครบทุกรูปแบบ',
  featureBadges: ['รับประกันคุณภาพ', 'จอง 24 ชั่วโมง', 'ทั่วนครปฐม', 'ทีมงานมืออาชีพ'],
  steps: [
    { icon: '📅', title: 'เลือกวันและเวลา', desc: 'เลือกวันที่และช่วงเวลาที่ต้องการจัดงาน' },
    { icon: '🪑', title: 'เลือกจำนวนโต๊ะ', desc: 'กำหนดจำนวนโต๊ะและผู้เข้าร่วมงาน' },
    { icon: '📍', title: 'ระบุสถานที่', desc: 'ปักหมุดสถานที่จัดงานบนแผนที่' },
    { icon: '🍽️', title: 'เลือกแพ็กเกจ', desc: 'เลือกแพ็กเกจอาหารที่เหมาะสม' },
    { icon: '📋', title: 'เลือกเมนูอาหาร', desc: 'เลือกเมนูตามแต่ละหมวดของแพ็กเกจ' },
    { icon: '✅', title: 'ยืนยันการจอง', desc: 'ตรวจสอบและยืนยันการจองทั้งหมด' },
  ],
  gallery: [
    'https://images.unsplash.com/photo-1555244162-803834f70033?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1530554764233-e79e16c91d08?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600&h=400&fit=crop&auto=format',
  ],
  ctaTitle: 'พร้อมจัดงานของคุณแล้วหรือยัง?',
  ctaDescription: 'จองบริการจัดเลี้ยงตอนนี้ รับส่วนลดพิเศษสำหรับลูกค้าใหม่',
}
