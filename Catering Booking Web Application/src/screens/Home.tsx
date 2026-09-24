import { ArrowRight, CheckCircle, ChevronRight, Clock, MapPin, MessageCircle, Phone, Users } from 'lucide-react'
import Navbar from '../components/Navbar'
import { useNav } from '../NavContext'
import type { HomeContent } from '../homeContent'
import { resolveImageUrl } from '../api'

interface HomeProps {
  homeContent: HomeContent
}

/** ไอคอน/สีของการ์ดจุดเด่น — ตำแหน่งคงที่ในโค้ด ผูกกับ homeContent.featureBadges[i] ตามลำดับ (แก้ได้แค่ข้อความจากหน้าตั้งค่า) */
const FEATURE_ICONS = [
  { icon: CheckCircle, color: 'text-green-500' },
  { icon: Clock, color: 'text-blue-500' },
  { icon: MapPin, color: 'text-orange-500' },
  { icon: Users, color: 'text-purple-500' },
]

export default function Home({ homeContent }: HomeProps) {
  const { navigate, shopInfo } = useNav()
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar currentScreen="home" />

      {/* Hero */}
      <section className="relative pt-16 overflow-hidden">
        <div className="relative h-[580px] md:h-[640px]">
          <img
            src={resolveImageUrl(homeContent.heroImage)}
            alt="บริการจัดเลี้ยง"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900/85 via-gray-900/60 to-transparent" />

          <div className="absolute inset-0 flex items-center">
            <div className="max-w-7xl mx-auto px-6 w-full">
              <div className="max-w-xl">
                <span className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-400/30 text-orange-300 text-xs font-medium px-3 py-1.5 rounded-full mb-4 backdrop-blur-sm">
                  <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
                  {homeContent.heroBadge}
                </span>
                <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-4">
                  {homeContent.heroTitle}
                  <span className="text-orange-400 block">{homeContent.heroTitleHighlight}</span>
                </h1>
                <p className="text-gray-300 text-lg mb-8 leading-relaxed whitespace-pre-line">
                  {homeContent.heroDescription}
                </p>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => navigate('booking-calendar')}
                    className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all shadow-lg shadow-orange-900/30 hover:scale-[1.02]"
                  >
                    เริ่มจองเลย
                    <ArrowRight size={20} />
                  </button>
                  <button
                    onClick={() =>
                      document.getElementById('gallery')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-2xl font-semibold backdrop-blur-sm transition-all border border-white/20"
                  >
                    ดูตัวอย่างงาน
                  </button>
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
            {FEATURE_ICONS.map(({ icon: Icon, color }, i) => (
              <div key={i} className="flex items-center gap-2">
                <Icon size={16} className={color} />
                <span className="text-sm text-gray-600 font-medium">{homeContent.featureBadges[i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16 space-y-20">
        {/* Steps */}
        <section>
          <div className="text-center mb-12">
            <p className="text-orange-500 font-semibold text-sm mb-2">ง่ายเพียง {homeContent.steps.length} ขั้นตอน</p>
            <h2 className="text-3xl font-bold text-gray-900">ขั้นตอนการจอง</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {homeContent.steps.map((step, i) => (
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
                {i < homeContent.steps.length - 1 && (
                  <ChevronRight className="hidden lg:block absolute top-1/2 -right-3 -translate-y-1/2 text-gray-300 z-10" size={20} />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Gallery */}
        <section id="gallery">
          <div className="text-center mb-12">
            <p className="text-orange-500 font-semibold text-sm mb-2">ผลงานของเรา</p>
            <h2 className="text-3xl font-bold text-gray-900">ตัวอย่างงานที่ผ่านมา</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {homeContent.gallery.map((url, i) => (
              <div key={i} className="aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 group cursor-pointer">
                <img
                  src={resolveImageUrl(url)}
                  alt={`งานตัวอย่าง ${i + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-3xl p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">{homeContent.ctaTitle}</h2>
          <p className="text-orange-100 mb-8">{homeContent.ctaDescription}</p>
          <button
            onClick={() => navigate('booking-calendar')}
            className="bg-white text-orange-600 hover:bg-orange-50 px-10 py-4 rounded-2xl font-bold text-lg transition-all shadow-lg hover:scale-[1.02]"
          >
            เริ่มจองเลย →
          </button>
        </section>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-6">
        <div className="max-w-7xl mx-auto grid gap-8 sm:grid-cols-3 text-center sm:text-left">
          <div>
            <p className="font-bold text-white text-lg mb-1">{shopInfo.name}</p>
            <p className="text-sm text-gray-500">{shopInfo.nameEn}</p>
          </div>

          {(shopInfo.phone || shopInfo.line) && (
            <div>
              <p className="text-xs font-semibold text-gray-300 uppercase tracking-wide mb-3">ติดต่อเรา</p>
              <div className="space-y-2">
                {shopInfo.phone && (
                  <a
                    href={`tel:${shopInfo.phone}`}
                    className="flex items-center justify-center sm:justify-start gap-2 text-sm hover:text-orange-400 transition-colors"
                  >
                    <Phone size={14} className="flex-shrink-0" />
                    {shopInfo.phone}
                  </a>
                )}
                {shopInfo.line && (
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-sm">
                    <MessageCircle size={14} className="flex-shrink-0" />
                    {shopInfo.line}
                  </div>
                )}
              </div>
            </div>
          )}

          {shopInfo.address && (
            <div>
              <p className="text-xs font-semibold text-gray-300 uppercase tracking-wide mb-3">ที่อยู่ร้าน</p>
              <p className="flex items-start justify-center sm:justify-start gap-2 text-sm leading-relaxed">
                <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                <span>{shopInfo.address}</span>
              </p>
            </div>
          )}
        </div>

        <div className="max-w-7xl mx-auto text-center mt-8 pt-6 border-t border-gray-800">
          <p className="text-xs">© {new Date().getFullYear()} {shopInfo.nameEn}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
