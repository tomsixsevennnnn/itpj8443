import type { Booking } from '../types'
import {
  DOC_LABEL,
  SHOP_INFO,
  bahtText,
  bookingPricing,
  docNumber,
  formatThaiDate,
  quotationValidUntil,
  type DocType,
} from '../documents'

interface BookingDocumentProps {
  booking: Booking
  type: DocType
  className?: string
}

const STATUS_TH: Record<Booking['status'], string> = {
  pending: 'รอยืนยัน',
  confirmed: 'ยืนยันแล้ว',
  completed: 'เสร็จสิ้น',
  cancelled: 'ยกเลิก',
}

/** เอกสารใบเสนอราคา / ใบจอง — ใช้ร่วมกันทั้งฝั่งลูกค้าและเจ้าของร้าน */
export default function BookingDocument({ booking, type, className = '' }: BookingDocumentProps) {
  const price = bookingPricing(booking)
  const issuedAt = new Date().toISOString().slice(0, 10)

  const lines = [
    {
      label: `แพ็กเกจ ${booking.packageName}`,
      qty: `${booking.tables} โต๊ะ`,
      unit: price.pricePerTable,
      amount: price.subtotal,
    },
    ...(price.deliveryFee > 0
      ? [{ label: 'ค่าขนส่ง (นอกนครปฐม ไม่ถึง 30 โต๊ะ)', qty: '—', unit: null, amount: price.deliveryFee }]
      : []),
  ]

  return (
    <div className={`bg-white text-gray-800 p-6 sm:p-8 ${className}`}>
      {/* หัวเอกสาร */}
      <div className="flex items-start justify-between gap-4 pb-5 mb-5 border-b-2 border-orange-500">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {SHOP_INFO.initials}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-900 text-sm leading-tight">{SHOP_INFO.name}</p>
              <p className="text-[10px] text-gray-400 leading-tight">{SHOP_INFO.nameEn}</p>
            </div>
          </div>
          <p className="text-[11px] text-gray-500 mt-2">{SHOP_INFO.address}</p>
          <p className="text-[11px] text-gray-500">
            โทร {SHOP_INFO.phone} · Line {SHOP_INFO.line}
          </p>
        </div>

        <div className="text-right flex-shrink-0">
          <p className="text-lg font-bold text-orange-600 leading-tight">{DOC_LABEL[type]}</p>
          <p className="text-xs font-mono text-gray-700 mt-1">{docNumber(booking, type)}</p>
          <p className="text-[11px] text-gray-400 mt-1">วันที่ออก {formatThaiDate(issuedAt)}</p>
          {type === 'quotation' ? (
            <p className="text-[11px] text-gray-400">ยืนราคาถึง {formatThaiDate(quotationValidUntil())}</p>
          ) : (
            <p className="text-[11px] text-gray-400">สถานะ {STATUS_TH[booking.status]}</p>
          )}
        </div>
      </div>

      {/* ลูกค้า + สถานที่ */}
      <div className="grid sm:grid-cols-2 gap-4 mb-5">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">ข้อมูลลูกค้า</p>
          <p className="font-semibold text-gray-800 text-sm">{booking.customerName}</p>
          <p className="text-xs text-gray-500">โทร {booking.phone}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">สถานที่จัดงาน</p>
          <p className="text-xs text-gray-700 leading-relaxed">{booking.location}</p>
          {booking.locationDetail && (
            <p className="text-[10px] text-gray-400 font-mono mt-0.5">
              {booking.locationDetail.lat.toFixed(6)}, {booking.locationDetail.lng.toFixed(6)}
            </p>
          )}
        </div>
      </div>

      {/* รายละเอียดงาน */}
      <div className="bg-orange-50 rounded-xl p-4 mb-5">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3">รายละเอียดงาน</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-3 gap-x-4 text-xs">
          {[
            { label: 'วันที่จัดงาน', value: formatThaiDate(booking.date, true) },
            { label: 'ช่วงเวลา', value: booking.timeSlot },
            { label: 'จำนวนโต๊ะ', value: `${booking.tables} โต๊ะ` },
            { label: 'ผู้ร่วมงาน', value: `${booking.guestCount ?? booking.tables * 10} คน` },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-gray-400 text-[10px]">{label}</p>
              <p className="font-semibold text-gray-700 mt-0.5 leading-snug">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ตารางราคา */}
      <table className="w-full text-xs mb-4">
        <thead>
          <tr className="border-b-2 border-gray-200">
            <th className="text-left py-2 text-gray-500 font-semibold">รายการ</th>
            <th className="text-right py-2 text-gray-500 font-semibold whitespace-nowrap">จำนวน</th>
            <th className="text-right py-2 text-gray-500 font-semibold whitespace-nowrap">ราคา/หน่วย</th>
            <th className="text-right py-2 text-gray-500 font-semibold whitespace-nowrap">รวม</th>
          </tr>
        </thead>
        <tbody>
          {lines.map(line => (
            <tr key={line.label} className="border-b border-gray-100">
              <td className="py-2 text-gray-700">{line.label}</td>
              <td className="py-2 text-right text-gray-600 whitespace-nowrap">{line.qty}</td>
              <td className="py-2 text-right text-gray-600 whitespace-nowrap">
                {line.unit != null ? `${line.unit.toLocaleString()} ฿` : '—'}
              </td>
              <td className="py-2 text-right font-semibold text-gray-800 whitespace-nowrap">
                {line.amount.toLocaleString()} ฿
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* รายการอาหาร */}
      {booking.menus.length > 0 && (
        <div className="mb-5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">
            รายการอาหาร ({booking.menus.length} อย่าง)
          </p>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1">
            {booking.menus.map((m, i) => (
              <p key={`${m}-${i}`} className="text-xs text-gray-600">
                <span className="text-gray-400 mr-1.5">{i + 1}.</span>
                {m}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* ยอดรวม */}
      <div className="flex flex-col sm:flex-row sm:justify-end gap-3 mb-5">
        <div className="sm:w-72">
          <div className="flex justify-between text-xs text-gray-500 py-1">
            <span>ยอดรวมค่าอาหาร</span>
            <span>{price.subtotal.toLocaleString()} ฿</span>
          </div>
          {price.deliveryFee > 0 && (
            <div className="flex justify-between text-xs text-gray-500 py-1">
              <span>ค่าขนส่ง</span>
              <span>{price.deliveryFee.toLocaleString()} ฿</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-sm text-orange-600 border-t-2 border-orange-200 mt-1 pt-2">
            <span>ยอดรวมทั้งสิ้น</span>
            <span>{price.total.toLocaleString()} ฿</span>
          </div>
          <p className="text-[10px] text-gray-400 text-right mt-1">({bahtText(price.total)})</p>
        </div>
      </div>

      {/* เงื่อนไข */}
      <div className="bg-gray-50 rounded-xl p-4 mb-5">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">เงื่อนไข</p>
        <ul className="text-[11px] text-gray-600 space-y-1 leading-relaxed">
          {type === 'quotation' ? (
            <>
              <li>• ใบเสนอราคานี้ยืนราคาถึงวันที่ {formatThaiDate(quotationValidUntil())}</li>
              <li>• ราคานี้รวมอุปกรณ์จัดเลี้ยง โต๊ะ เก้าอี้ และพนักงานเสิร์ฟแล้ว ไม่มีค่าบริการเพิ่ม</li>
              <li>• ยืนยันการจองโดยชำระมัดจำ 50% ส่วนที่เหลือชำระในวันจัดงาน</li>
              <li>• งานในนครปฐมไม่มีค่าขนส่ง · นอกนครปฐมขั้นต่ำ 30 โต๊ะ</li>
            </>
          ) : (
            <>
              <li>• กรุณาชำระมัดจำ 50% เพื่อยืนยันการจอง ส่วนที่เหลือชำระในวันจัดงาน</li>
              <li>• ทีมงานจะเข้าพื้นที่ก่อนเวลาเริ่มงานอย่างน้อย 2 ชั่วโมง</li>
              <li>• แจ้งเปลี่ยนแปลงเมนูหรือจำนวนโต๊ะล่วงหน้าอย่างน้อย 7 วัน</li>
              <li>• ยกเลิกก่อนวันงานน้อยกว่า 7 วัน ขอสงวนสิทธิ์ไม่คืนเงินมัดจำ</li>
            </>
          )}
        </ul>
      </div>

      {/* ลายเซ็น */}
      <div className="grid grid-cols-2 gap-8 pt-2">
        {['ผู้สั่งจอง', 'ผู้รับจอง'].map(role => (
          <div key={role} className="text-center">
            <div className="border-b border-dashed border-gray-300 h-10" />
            <p className="text-[10px] text-gray-400 mt-1.5">({role})</p>
            <p className="text-[10px] text-gray-300">วันที่ ......../......../........</p>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-gray-400 text-center mt-6 pt-4 border-t border-gray-100">
        ขอบคุณที่ใช้บริการ {SHOP_INFO.name} · โทร {SHOP_INFO.phone}
      </p>
    </div>
  )
}
