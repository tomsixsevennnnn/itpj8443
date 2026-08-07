import { useRef, useState } from 'react'
import {
  Check,
  Image,
  ImagePlus,
  ListChecks,
  Loader2,
  Megaphone,
  Save,
  Star,
  Trash2,
} from 'lucide-react'
import type { AppSettings } from '../../types'
import type { HomeStep } from '../../homeContent'
import { pickImageAsDataUrl } from '../../imageUpload'

interface PageContentProps {
  settings: AppSettings
  onUpdateSettings: (patch: Partial<AppSettings>) => void
}

export default function PageContent({ settings, onUpdateSettings }: PageContentProps) {
  const [form, setForm] = useState<AppSettings>(settings)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [heroUploading, setHeroUploading] = useState(false)
  const [heroError, setHeroError] = useState<string | null>(null)
  const [galleryUploading, setGalleryUploading] = useState(false)
  const [galleryError, setGalleryError] = useState<string | null>(null)
  const heroInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const dirty = JSON.stringify(form) !== JSON.stringify(settings)

  const setHomeField = <K extends keyof AppSettings['homeContent']>(key: K, value: AppSettings['homeContent'][K]) => {
    setForm(f => ({ ...f, homeContent: { ...f.homeContent, [key]: value } }))
    setSavedAt(null)
  }

  const setFeatureBadge = (index: number, value: string) => {
    setForm(f => {
      const next = [...f.homeContent.featureBadges]
      next[index] = value
      return { ...f, homeContent: { ...f.homeContent, featureBadges: next } }
    })
    setSavedAt(null)
  }

  const setStepField = (index: number, key: keyof HomeStep, value: string) => {
    setForm(f => ({
      ...f,
      homeContent: {
        ...f.homeContent,
        steps: f.homeContent.steps.map((s, i) => (i === index ? { ...s, [key]: value } : s)),
      },
    }))
    setSavedAt(null)
  }

  const addGalleryImage = (dataUrl: string) => {
    setForm(f => ({ ...f, homeContent: { ...f.homeContent, gallery: [...f.homeContent.gallery, dataUrl] } }))
    setSavedAt(null)
  }

  const removeGalleryImage = (index: number) => {
    setForm(f => ({
      ...f,
      homeContent: { ...f.homeContent, gallery: f.homeContent.gallery.filter((_, i) => i !== index) },
    }))
    setSavedAt(null)
  }

  /** เลือกรูป Hero จากเครื่อง — ย่อขนาดแล้วใช้แทนรูปเดิมเลย */
  const handlePickHeroImage = async (file: File | undefined) => {
    if (!file) return
    setHeroUploading(true)
    setHeroError(null)
    try {
      const dataUrl = await pickImageAsDataUrl(file)
      setHomeField('heroImage', dataUrl)
    } catch (err) {
      setHeroError(err instanceof Error ? err.message : 'อัปโหลดรูปไม่สำเร็จ')
    } finally {
      setHeroUploading(false)
      if (heroInputRef.current) heroInputRef.current.value = ''
    }
  }

  /** เลือกรูปแกลเลอรีจากเครื่อง — ย่อขนาดแล้วเพิ่มต่อท้ายรายการ */
  const handlePickGalleryImage = async (file: File | undefined) => {
    if (!file) return
    setGalleryUploading(true)
    setGalleryError(null)
    try {
      const dataUrl = await pickImageAsDataUrl(file)
      addGalleryImage(dataUrl)
    } catch (err) {
      setGalleryError(err instanceof Error ? err.message : 'อัปโหลดรูปไม่สำเร็จ')
    } finally {
      setGalleryUploading(false)
      if (galleryInputRef.current) galleryInputRef.current.value = ''
    }
  }

  const handleSave = () => {
    onUpdateSettings(form)
    setSavedAt(Date.now())
  }

  return (
    <div className="max-w-2xl space-y-5">
      {/* หน้าแรก — Hero */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <Image size={18} className="text-orange-500" />
          <h2 className="font-bold text-gray-900">หน้าแรก — Hero</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">รูปและข้อความส่วนบนสุดของหน้าแรกที่ลูกค้าเห็นก่อนใคร</p>

        <input
          ref={heroInputRef}
          type="file"
          accept="image/*"
          onChange={e => handlePickHeroImage(e.target.files?.[0])}
          className="hidden"
        />
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">รูปพื้นหลัง</label>
          <div className="relative aspect-[16/7] rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
            <img src={form.homeContent.heroImage} alt="ตัวอย่างรูป Hero" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => heroInputRef.current?.click()}
              disabled={heroUploading}
              className="absolute bottom-2 right-2 flex items-center gap-1.5 text-xs bg-white/90 hover:bg-white text-gray-700 px-3 py-2 rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50"
            >
              {heroUploading ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
              {heroUploading ? 'กำลังประมวลผล...' : 'เปลี่ยนรูป'}
            </button>
          </div>
          {heroError && <p className="mt-1.5 text-xs text-red-500">{heroError}</p>}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">ป้ายข้อความเล็ก (เหนือหัวข้อ)</label>
          <input
            type="text"
            value={form.homeContent.heroBadge}
            onChange={e => setHomeField('heroBadge', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">หัวข้อหลัก</label>
            <input
              type="text"
              value={form.homeContent.heroTitle}
              onChange={e => setHomeField('heroTitle', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">หัวข้อ (สีส้ม บรรทัดที่ 2)</label>
            <input
              type="text"
              value={form.homeContent.heroTitleHighlight}
              onChange={e => setHomeField('heroTitleHighlight', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">คำโปรย</label>
          <textarea
            value={form.homeContent.heroDescription}
            rows={2}
            onChange={e => setHomeField('heroDescription', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
      </div>

      {/* หน้าแรก — การ์ดจุดเด่น */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <Star size={18} className="text-orange-500" />
          <h2 className="font-bold text-gray-900">การ์ดจุดเด่น</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">แถบข้อความสั้น 4 อันใต้ Hero — ไอคอนคงที่ แก้ได้แค่ข้อความ</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {form.homeContent.featureBadges.map((text, i) => (
            <input
              key={i}
              type="text"
              value={text}
              onChange={e => setFeatureBadge(i, e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          ))}
        </div>
      </div>

      {/* หน้าแรก — ขั้นตอนการจอง */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <ListChecks size={18} className="text-orange-500" />
          <h2 className="font-bold text-gray-900">ขั้นตอนการจอง</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          การ์ดอธิบาย {form.homeContent.steps.length} ขั้นตอนบนหน้าแรก — แก้ได้แค่ข้อความ จำนวนข้อคงที่ตาม flow การจองจริง
        </p>
        <div className="space-y-3">
          {form.homeContent.steps.map((step, i) => (
            <div key={i} className="flex items-start gap-2.5 bg-gray-50 rounded-xl p-3">
              <span className="w-5 h-5 mt-0.5 rounded-full bg-white border border-gray-200 text-gray-500 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                {i + 1}
              </span>
              <input
                type="text"
                value={step.icon}
                onChange={e => setStepField(i, 'icon', e.target.value)}
                placeholder="🍽️"
                className="w-12 flex-shrink-0 border border-gray-200 rounded-lg px-2 py-2 text-center text-base focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <div className="flex-1 space-y-1.5 min-w-0">
                <input
                  type="text"
                  value={step.title}
                  onChange={e => setStepField(i, 'title', e.target.value)}
                  placeholder="หัวข้อ"
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <input
                  type="text"
                  value={step.desc}
                  onChange={e => setStepField(i, 'desc', e.target.value)}
                  placeholder="คำอธิบาย"
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* หน้าแรก — แกลเลอรีผลงาน */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <Image size={18} className="text-orange-500" />
          <h2 className="font-bold text-gray-900">แกลเลอรีผลงาน</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">รูปตัวอย่างงานที่ผ่านมา แสดงในหน้าแรก — เพิ่ม/ลบได้ไม่จำกัดจำนวน</p>

        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          onChange={e => handlePickGalleryImage(e.target.files?.[0])}
          className="hidden"
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
          {form.homeContent.gallery.map((url, i) => (
            <div key={i} className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 border border-gray-200 group">
              <img src={url} alt={`ผลงาน ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeGalleryImage(i)}
                className="absolute top-1.5 right-1.5 w-7 h-7 bg-black/60 hover:bg-red-600 rounded-lg flex items-center justify-center text-white transition-colors"
                aria-label="ลบรูปนี้"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            disabled={galleryUploading}
            className="aspect-[4/3] flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-gray-200 hover:border-orange-300 hover:bg-orange-50/40 rounded-xl transition-colors disabled:opacity-60"
          >
            {galleryUploading ? (
              <Loader2 size={18} className="text-orange-500 animate-spin" />
            ) : (
              <ImagePlus size={18} className="text-gray-400" />
            )}
            <span className="text-xs font-medium text-gray-500">
              {galleryUploading ? 'กำลังประมวลผล...' : 'เพิ่มรูป'}
            </span>
          </button>
        </div>
        {galleryError && <p className="text-xs text-red-500">{galleryError}</p>}
      </div>

      {/* หน้าแรก — CTA ท้ายหน้า */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <Megaphone size={18} className="text-orange-500" />
          <h2 className="font-bold text-gray-900">CTA ท้ายหน้าแรก</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">แถบชวนจองสีส้มท้ายหน้าแรก ก่อนถึง footer</p>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">หัวข้อ</label>
          <input
            type="text"
            value={form.homeContent.ctaTitle}
            onChange={e => setHomeField('ctaTitle', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">คำโปรย</label>
          <textarea
            value={form.homeContent.ctaDescription}
            rows={2}
            onChange={e => setHomeField('ctaDescription', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={!dirty}
          className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-2xl px-6 py-3 text-sm font-semibold transition-colors"
        >
          <Save size={16} />
          บันทึกหน้าเว็บ
        </button>
        {!dirty && savedAt && (
          <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
            <Check size={14} />
            บันทึกแล้ว
          </span>
        )}
      </div>
    </div>
  )
}
