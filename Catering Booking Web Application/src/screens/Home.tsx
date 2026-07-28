import { ArrowRight, CheckCircle, ChevronRight, Clock, MapPin, Star, Users } from 'lucide-react'
import Navbar from '../components/Navbar'
import type { Screen, UserProfile } from '../types'
import { REVIEWS } from '../data'

interface HomeProps {
  navigate: (s: Screen) => void
  user: UserProfile | null
}

const STEPS = [
  { icon: '📅', title: 'เลือกวันและเวลา', desc: 'เลือกวันที่และช่วงเวลาที่ต้องการจัดงาน' },
  { icon: '🪑', title: 'เลือกจำนวนโต๊ะ', desc: 'กำหนดจำนวนโต๊ะและผู้เข้าร่วมงาน' },
  { icon: '📍', title: 'ระบุสถานที่', desc: 'ปักหมุดสถานที่จัดงานบนแผนที่' },
  { icon: '🍽️', title: 'เลือกแพ็กเกจ', desc: 'เลือกแพ็กเกจอาหารที่เหมาะสม' },
  { icon: '✅', title: 'ยืนยันการจอง', desc: 'ตรวจสอบและยืนยันการจองทั้งหมด' },
]

const GALLERY = [
  'https://images.unsplash.com/photo-1555244162-803834f70033?w=600&h=400&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1530554764233-e79e16c91d08?w=600&h=400&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=400&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600&h=400&fit=crop&auto=format',
]

export default function Home({ navigate, user }: HomeProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar navigate={navigate} currentScreen="home" user={user} />

      {/* Hero */}
      <section className="relative pt-16 overflow-hidden">
        <div className="relative h-[580px] md:h-[640px]">
          <img
            src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&h=800&fit=crop&auto=format"
            alt="บริการจัดเลี้ยง"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900/85 via-gray-900/60 to-transparent" />

          <div className="absolute inset-0 flex items-center">
            <div className="max-w-7xl mx-auto px-6 w-full">
              <div className="max-w-xl">
                <span className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-400/30 text-orange-300 text-xs font-medium px-3 py-1.5 rounded-full mb-4 backdrop-blur-sm">
                  <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
                  รับจัดเลี้ยงนอกสถานที่ทั่วนครปฐม
                </span>
                <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-4">
                  บริการรับจัดเลี้ยง
                  <span className="text-orange-400 block">นอกสถานที่</span>
                </h1>
                <p className="text-gray-300 text-lg mb-8 leading-relaxed">
                  ครบครัน มืออาชีพ อร่อย ราคาสมเหตุสมผล <br />
                  จัดงานเลี้ยง งานแต่งงาน งานบริษัท ครบทุกรูปแบบ
                </p>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => navigate('booking-calendar')}
                    className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all shadow-lg shadow-orange-900/30 hover:scale-[1.02]"
                  >
                    เริ่มจองเลย
                    <ArrowRight size={20} />
                  </button>
                  <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-2xl font-semibold backdrop-blur-sm transition-all border border-white/20">
                    ดูตัวอย่างงาน
                  </button>
                </div>

                {/* Stats */}
                <div className="flex gap-8 mt-10">
                  {[
                    { value: '500+', label: 'งานสำเร็จ' },
                    { value: '98%', label: 'ความพึงพอใจ' },
                    { value: '5 ★', label: 'คะแนนรีวิว' },
                  ].map(({ value, label }) => (
                    <div key={label}>
                      <p className="text-white font-bold text-xl">{value}</p>
                      <p className="text-gray-400 text-sm">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature badges */}
      <div className="bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex flex-wrap gap-6 justify-center md:justify-between items-center">
            {[
              { icon: CheckCircle, text: 'รับประกันคุณภาพ', color: 'text-green-500' },
              { icon: Clock, text: 'จอง 24 ชั่วโมง', color: 'text-blue-500' },
              { icon: MapPin, text: 'ทั่วนครปฐม', color: 'text-orange-500' },
              { icon: Users, text: 'ทีมงานมืออาชีพ', color: 'text-purple-500' },
            ].map(({ icon: Icon, text, color }) => (
              <div key={text} className="flex items-center gap-2">
                <Icon size={16} className={color} />
                <span className="text-sm text-gray-600 font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16 space-y-20">
        {/* Steps */}
        <section>
          <div className="text-center mb-12">
            <p className="text-orange-500 font-semibold text-sm mb-2">ง่ายเพียง 5 ขั้นตอน</p>
            <h2 className="text-3xl font-bold text-gray-900">ขั้นตอนการจอง</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {STEPS.map((step, i) => (
              <div key={i} className="relative">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center hover:shadow-md hover:border-orange-100 transition-all group">
                  <div className="text-3xl mb-3">{step.icon}</div>
                  <div className="w-6 h-6 bg-orange-500 text-white rounded-full text-xs font-bold flex items-center justify-center mx-auto mb-3">
                    {i + 1}
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-1.5 group-hover:text-orange-600 transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <ChevronRight className="hidden md:block absolute top-1/2 -right-3 -translate-y-1/2 text-gray-300 z-10" size={20} />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Reviews */}
        <section>
          <div className="text-center mb-12">
            <p className="text-orange-500 font-semibold text-sm mb-2">ลูกค้าพูดถึงเรา</p>
            <h2 className="text-3xl font-bold text-gray-900">รีวิวจากลูกค้า</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {REVIEWS.map((review, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-all"
              >
                <div className="flex gap-0.5 mb-4">
                  {[...Array(review.rating)].map((_, j) => (
                    <Star key={j} size={14} fill="#F97316" className="text-orange-500" />
                  ))}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-5">"{review.text}"</p>
                <div className="flex items-center gap-3">
                  <img src={review.avatar} alt={review.name} className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{review.name}</p>
                    <p className="text-xs text-orange-500">{review.event}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Gallery */}
        <section>
          <div className="text-center mb-12">
            <p className="text-orange-500 font-semibold text-sm mb-2">ผลงานของเรา</p>
            <h2 className="text-3xl font-bold text-gray-900">ตัวอย่างงานที่ผ่านมา</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {GALLERY.map((url, i) => (
              <div key={i} className="aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 group cursor-pointer">
                <img
                  src={url}
                  alt={`งานตัวอย่าง ${i + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-3xl p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">พร้อมจัดงานของคุณแล้วหรือยัง?</h2>
          <p className="text-orange-100 mb-8">จองบริการจัดเลี้ยงตอนนี้ รับส่วนลดพิเศษสำหรับลูกค้าใหม่</p>
          <button
            onClick={() => navigate('booking-calendar')}
            className="bg-white text-orange-600 hover:bg-orange-50 px-10 py-4 rounded-2xl font-bold text-lg transition-all shadow-lg hover:scale-[1.02]"
          >
            เริ่มจองเลย →
          </button>
        </section>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <p className="font-bold text-white mb-1">ร้านพิพัฒน์โภชนา</p>
          <p className="text-sm">© 2025 Krathai Catering Service. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
