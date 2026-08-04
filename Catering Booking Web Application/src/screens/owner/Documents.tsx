import { useState } from 'react'
import { Eye, FileText, Printer, Search } from 'lucide-react'
import BookingDocument from '../../components/BookingDocument'
import { DOC_LABEL, docNumber, type DocType } from '../../documents'
import { bookingCostSummary } from '../../costing'
import type { AppSettings, Booking, MenuItem } from '../../types'

interface DocumentsProps {
  bookings: Booking[]
  menus: MenuItem[]
  settings: AppSettings
}

export default function Documents({ bookings, menus, settings }: DocumentsProps) {
  const [activeTab, setActiveTab] = useState<DocType>('quotation')
  const [search, setSearch] = useState('')
  const [previewBooking, setPreviewBooking] = useState<Booking | null>(null)

  const filtered = bookings.filter(b =>
    b.customerName.includes(search) || b.id.includes(search) || search === ''
  )

  const docLabel = DOC_LABEL[activeTab]

  return (
    <div className="grid xl:grid-cols-2 gap-5">
      {/* List panel */}
      <div>
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 mb-4">
          {(['quotation', 'booking'] as DocType[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'quotation' ? '📄 ใบเสนอราคา' : '📋 ใบจอง'}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="ค้นหา..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
          />
        </div>

        {/* Document list */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {filtered.map(b => {
              const docId = docNumber(b, activeTab)
              return (
                <div
                  key={b.id}
                  className={`p-4 hover:bg-orange-50/30 transition-colors cursor-pointer ${previewBooking?.id === b.id ? 'bg-orange-50' : ''}`}
                  onClick={() => setPreviewBooking(b)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FileText size={18} className="text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-mono text-xs font-bold text-gray-600">{docId}</p>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                          b.status === 'confirmed' ? 'bg-green-100 text-green-600' :
                          b.status === 'pending' ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {b.status === 'confirmed' ? 'ยืนยัน' : b.status === 'pending' ? 'รอ' : 'เสร็จ'}
                        </span>
                      </div>
                      <p className="font-semibold text-gray-800 text-sm">{b.customerName}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(b.date + 'T00:00:00').toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                        {' · '}฿{b.totalPrice.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          setPreviewBooking(b)
                        }}
                        className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Eye size={12} />
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          setPreviewBooking(b)
                          // ให้เอกสารขึ้นจอก่อนแล้วค่อยสั่งพิมพ์
                          setTimeout(() => window.print(), 100)
                        }}
                        className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Printer size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Preview panel */}
      <div>
        {previewBooking ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-0 print-area">
            {/* Preview toolbar */}
            <div className="no-print flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
              <p className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                <Eye size={16} className="text-orange-500" />
                ตัวอย่าง {docLabel}
                <span className="font-mono text-xs text-gray-400">{docNumber(previewBooking, activeTab)}</span>
              </p>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1 text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                <Printer size={12} />
                พิมพ์ / บันทึก PDF
              </button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto">
              <BookingDocument
                booking={previewBooking}
                type={activeTab}
                shopInfo={settings.shopInfo}
                depositRate={settings.depositRate}
              />
            </div>

            {/* ต้นทุน/กำไรของงานนี้ — ข้อมูลภายในร้าน ไม่พิมพ์ออกเอกสาร */}
            {(() => {
              const cost = bookingCostSummary(previewBooking, menus, settings)
              return (
                <div className="no-print border-t border-gray-100 p-4 bg-gray-50">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    ต้นทุน / กำไร (ไม่แสดงในเอกสาร)
                  </p>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-white rounded-lg p-2 border border-gray-100">
                      <p className="text-[10px] text-gray-400">ต้นทุนเมนู</p>
                      <p className="text-sm font-bold text-gray-800">฿{cost.menuCost.toLocaleString()}</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 border border-gray-100">
                      <p className="text-[10px] text-gray-400">ค่าแรง</p>
                      <p className="text-sm font-bold text-gray-800">฿{cost.wageCost.toLocaleString()}</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 border border-gray-100">
                      <p className="text-[10px] text-gray-400">ต้นทุนรวม</p>
                      <p className="text-sm font-bold text-gray-800">฿{cost.totalCost.toLocaleString()}</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 border border-gray-100">
                      <p className="text-[10px] text-gray-400">กำไร</p>
                      <p className={`text-sm font-bold ${cost.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        ฿{cost.profit.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 flex items-center justify-center h-64">
            <div className="text-center text-gray-400">
              <FileText size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">เลือกรายการเพื่อดูตัวอย่างเอกสาร</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
