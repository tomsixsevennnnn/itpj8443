import type { Booking, ShopInfo } from '../types'
import { resolveImageUrl } from '../api'
import PromptPayQr from './PromptPayQr'
import {
  DEFAULT_BOOKING_TERMS,
  DEFAULT_DEPOSIT_RATE,
  DEFAULT_QUOTATION_TERMS,
  DEFAULT_QUOTATION_VALID_DAYS,
  DEFAULT_SHOP_INFO,
  DOC_LABEL,
  bahtText,
  bookingPricing,
  docNumber,
  formatThaiDate,
  quotationValidUntil,
  bookingCustomerName,
  type DocType,
} from '../documents'
import { DEFAULT_FREE_DELIVERY_MIN_TABLES, DEFAULT_HOME_PROVINCE } from '../geo'

interface BookingDocumentProps {
  booking: Booking
  type: DocType
  className?: string
  shopInfo?: ShopInfo
  depositRate?: number
  homeProvince?: string
  freeDeliveryMinTables?: number
  quotationValidDays?: number
  /** เงื่อนไขเพิ่มเติมที่เจ้าของร้านแก้ไขเอง — ต่อท้ายเงื่อนไขที่ระบบคำนวณให้อัตโนมัติ (ดู AppSettings.quotationTerms/bookingTerms) */
  quotationTerms?: string[]
  bookingTerms?: string[]
}

const STATUS_TH: Record<Booking['status'], string> = {
  pending: 'รอยืนยัน',
  confirmed: 'ยืนยันแล้ว',
  completed: 'เสร็จสิ้น',
  cancelled: 'ยกเลิก',
}

/** เอกสารใบเสนอราคา / ใบจอง — ใช้ร่วมกันทั้งฝั่งลูกค้าและเจ้าของร้าน */
export default function BookingDocument({
  booking,
  type,
  className = '',
  shopInfo = DEFAULT_SHOP_INFO,
  depositRate = DEFAULT_DEPOSIT_RATE,
  homeProvince = DEFAULT_HOME_PROVINCE,
  freeDeliveryMinTables = DEFAULT_FREE_DELIVERY_MIN_TABLES,
  quotationValidDays = DEFAULT_QUOTATION_VALID_DAYS,
  quotationTerms = DEFAULT_QUOTATION_TERMS,
  bookingTerms = DEFAULT_BOOKING_TERMS,
}: BookingDocumentProps) {
  const price = bookingPricing(booking, depositRate)
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
              {shopInfo.initials}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-900 text-sm leading-tight">{shopInfo.name}</p>
              <p className="text-[10px] text-gray-400 leading-tight">{shopInfo.nameEn}</p>
            </div>
          </div>
          <p className="text-[11px] text-gray-500 mt-2">{shopInfo.address}</p>
          <p className="text-[11px] text-gray-500">
            โทร {shopInfo.phone} · Line {shopInfo.line}
          </p>
        </div>

        <div className="text-right flex-shrink-0">
          <p className="text-lg font-bold text-orange-600 leading-tight">{DOC_LABEL[type]}</p>
          <p className="text-xs font-mono text-gray-700 mt-1">{docNumber(booking, type)}</p>
          <p className="text-[11px] text-gray-400 mt-1">วันที่ออก {formatThaiDate(issuedAt)}</p>
          {type === 'quotation' ? (
            <p className="text-[11px] text-gray-400">ยืนราคาถึง {formatThaiDate(quotationValidUntil(new Date(), quotationValidDays))}</p>
          ) : (
            <p className="text-[11px] text-gray-400">สถานะ {STATUS_TH[booking.status]}</p>
          )}
        </div>
      </div>

      {/* ลูกค้า + สถานที่ */}
      <div className="grid sm:grid-cols-2 gap-4 mb-5">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">ข้อมูลลูกค้า</p>
          <p className="font-semibold text-gray-800 text-sm">{bookingCustomerName(booking)}</p>
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

          {type === 'quotation' && (
            <div className="mt-3 bg-orange-50 rounded-lg px-3 py-2.5 space-y-1">
              <div className="flex justify-between text-xs font-semibold text-orange-700">
                <span>มัดจำเพื่อยืนยันการจอง ({Math.round(depositRate * 100)}%)</span>
                <span>{price.deposit.toLocaleString()} ฿</span>
              </div>
              <div className="flex justify-between text-[11px] text-orange-500">
                <span>ชำระส่วนที่เหลือในวันจัดงาน</span>
                <span>{price.remaining.toLocaleString()} ฿</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ข้อมูลการโอนเงิน */}
      {(shopInfo.bankAccountNumber || shopInfo.promptPayQr || shopInfo.promptPayId) && (
        <div className="bg-gray-50 rounded-xl p-4 mb-5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3">ช่องทางการโอนเงิน</p>
          <div className="flex flex-wrap items-center gap-4">
            {shopInfo.bankAccountNumber && (
              <div className="flex-1 min-w-[180px] space-y-1">
                {shopInfo.bankName && <p className="text-sm font-semibold text-gray-700">{shopInfo.bankName}</p>}
                <p className="text-xl font-bold font-mono tracking-wider text-gray-900 leading-tight">
                  {shopInfo.bankAccountNumber}
                </p>
                {shopInfo.bankAccountName && <p className="text-sm text-gray-600">{shopInfo.bankAccountName}</p>}
              </div>
            )}
            {/* ฝังยอดมัดจำใน QR เหมือนกันทั้งใบเสนอราคาและใบจอง — ยอดที่ต้องโอนคือมัดจำเสมอ (ส่วนที่เหลือจ่ายวันงานจริง) */}
            {shopInfo.promptPayId ? (
              <div className="flex-shrink-0 text-center">
                <PromptPayQr
                  promptPayId={shopInfo.promptPayId}
                  amount={price.deposit}
                  className="w-28 h-28 rounded-lg border border-gray-200 bg-white"
                />
                {(shopInfo.promptPayFirstName || shopInfo.promptPayLastName) && (
                  <p className="text-xs text-gray-600 mt-1">
                    {shopInfo.promptPayFirstName} {shopInfo.promptPayLastName}
                  </p>
                )}
              </div>
            ) : shopInfo.promptPayQr ? (
              <div className="flex-shrink-0 text-center">
                <img
                  src={resolveImageUrl(shopInfo.promptPayQr)}
                  alt="QR พร้อมเพย์"
                  className="w-28 h-28 rounded-lg border border-gray-200 object-contain bg-white"
                />
                {(shopInfo.promptPayQrFirstName || shopInfo.promptPayQrLastName) && (
                  <p className="text-xs text-gray-600 mt-1">
                    {shopInfo.promptPayQrFirstName} {shopInfo.promptPayQrLastName}
                  </p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* เงื่อนไข */}
      <div className="bg-gray-50 rounded-xl p-4 mb-5">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">เงื่อนไข</p>
        <ul className="text-[11px] text-gray-600 space-y-1 leading-relaxed">
          {type === 'quotation' ? (
            <>
              <li>• ใบเสนอราคานี้ยืนราคาถึงวันที่ {formatThaiDate(quotationValidUntil(new Date(), quotationValidDays))}</li>
              <li>• ยืนยันการจองโดยชำระมัดจำ {Math.round(depositRate * 100)}% ({price.deposit.toLocaleString()} ฿) ส่วนที่เหลือชำระในวันจัดงาน</li>
              <li>• งานใน{homeProvince}ไม่มีค่าขนส่ง · นอก{homeProvince}ขั้นต่ำ {freeDeliveryMinTables} โต๊ะ</li>
              {quotationTerms.map((term, i) => (
                <li key={i}>• {term}</li>
              ))}
            </>
          ) : (
            <>
              <li>• กรุณาชำระมัดจำ {Math.round(depositRate * 100)}% ({price.deposit.toLocaleString()} ฿) เพื่อยืนยันการจอง ส่วนที่เหลือชำระในวันจัดงาน</li>
              {bookingTerms.map((term, i) => (
                <li key={i}>• {term}</li>
              ))}
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
        ขอบคุณที่ใช้บริการ {shopInfo.name} · โทร {shopInfo.phone}
      </p>
    </div>
  )
}
