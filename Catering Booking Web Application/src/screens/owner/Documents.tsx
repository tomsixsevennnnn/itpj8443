import { useState } from 'react'
import { Download, Eye, FileText, Printer, Search } from 'lucide-react'
import { MOCK_BOOKINGS } from '../../data'
import type { Booking } from '../../types'

type DocType = 'quotation' | 'booking'

export default function Documents() {
  const [activeTab, setActiveTab] = useState<DocType>('quotation')
  const [search, setSearch] = useState('')
  const [previewBooking, setPreviewBooking] = useState<Booking | null>(null)

  const filtered = MOCK_BOOKINGS.filter(b =>
    b.customerName.includes(search) || b.id.includes(search) || search === ''
  )

  const docLabel = activeTab === 'quotation' ? 'ใบเสนอราคา' : 'ใบจอง'

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
              const docId = activeTab === 'quotation' ? `QT-${b.id.split('-').slice(1).join('-')}` : b.id
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
                      <button className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Download size={12} />
                      </button>
                      <button className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
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
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-0">
            {/* Preview toolbar */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
              <p className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                <Eye size={16} className="text-orange-500" />
                ตัวอย่าง {docLabel}
              </p>
              <div className="flex gap-2">
                <button className="flex items-center gap-1 text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg transition-colors">
                  <Download size={12} />
                  PDF
                </button>
                <button className="flex items-center gap-1 text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1.5 rounded-lg transition-colors">
                  <Printer size={12} />
                  พิมพ์
                </button>
              </div>
            </div>

            {/* Document preview */}
            <div className="p-6 font-['Inter',_sans-serif]" style={{ background: '#fff' }}>
              {/* Header */}
              <div className="flex items-start justify-between mb-6 pb-6 border-b-2 border-orange-500">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">KT</div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">ร้านพิพัฒน์โภชนา</p>
                      <p className="text-[10px] text-gray-400">Krathai Catering Service</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">123 ถ.รัชดาภิเษก กรุงเทพฯ 10310</p>
                  <p className="text-xs text-gray-400">โทร: 02-XXX-XXXX | Line: @krathai</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-orange-600">{docLabel}</p>
                  <p className="text-xs font-mono text-gray-600 mt-0.5">
                    {activeTab === 'quotation' ? `QT-${previewBooking.id.split('-').slice(1).join('-')}` : previewBooking.id}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    วันที่ออก: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* Customer */}
              <div className="mb-5">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">ข้อมูลลูกค้า</p>
                <p className="font-semibold text-gray-800">{previewBooking.customerName}</p>
                <p className="text-xs text-gray-500">โทร: {previewBooking.phone}</p>
              </div>

              {/* Event details */}
              <div className="bg-orange-50 rounded-xl p-4 mb-5">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">รายละเอียดงาน</p>
                <div className="grid grid-cols-2 gap-y-2 text-xs">
                  {[
                    { label: 'วันที่จัดงาน', value: new Date(previewBooking.date + 'T00:00:00').toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
                    { label: 'ช่วงเวลา', value: previewBooking.timeSlot },
                    { label: 'จำนวนโต๊ะ', value: `${previewBooking.tables} โต๊ะ` },
                    { label: 'สถานที่', value: previewBooking.location },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-gray-400">{label}</p>
                      <p className="font-semibold text-gray-700 mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Items table */}
              <table className="w-full text-xs mb-4">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-gray-500 font-semibold">รายการ</th>
                    <th className="text-right py-2 text-gray-500 font-semibold">จำนวน</th>
                    <th className="text-right py-2 text-gray-500 font-semibold">ราคา/หน่วย</th>
                    <th className="text-right py-2 text-gray-500 font-semibold">รวม</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 text-gray-700">แพ็กเกจ {previewBooking.packageName}</td>
                    <td className="py-2 text-right text-gray-700">{previewBooking.tables} โต๊ะ</td>
                    <td className="py-2 text-right text-gray-700">—</td>
                    <td className="py-2 text-right font-semibold text-gray-800">฿{previewBooking.totalPrice.toLocaleString()}</td>
                  </tr>
                  {previewBooking.menus.map(m => (
                    <tr key={m} className="border-b border-gray-50">
                      <td className="py-1.5 pl-4 text-gray-500">• {m}</td>
                      <td colSpan={3} />
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Total */}
              <div className="flex justify-end">
                <div className="text-right">
                  <div className="flex justify-between gap-8 text-xs text-gray-500 mb-1">
                    <span>ค่าบริการ (7%)</span>
                    <span>฿{Math.round(previewBooking.totalPrice * 0.07).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between gap-8 font-bold text-sm text-orange-600 border-t border-orange-200 pt-2">
                    <span>ยอดรวมทั้งสิ้น</span>
                    <span>฿{Math.round(previewBooking.totalPrice * 1.07).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-gray-400 text-center mt-6 pt-4 border-t border-gray-100">
                ขอบคุณที่ใช้บริการ ครัวไทย Catering Service · ติดต่อ 02-XXX-XXXX
              </p>
            </div>
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
