import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Check, MapPin } from 'lucide-react'
import { THAI_PROVINCES, filterProvinces, splitMatch } from '../provinces'

interface SuggestInputProps {
  value: string
  onChange: (value: string) => void
  /** กด Enter ตอนที่ไม่ได้เลือกตัวเลือกใดในรายการ (เช่นช่อง "เพิ่มจังหวัด" ใช้กด Enter เพื่อเพิ่ม) */
  onEnter?: () => void
  placeholder?: string
  id?: string
  className?: string
  /** รายการตัวเลือก — ไม่ส่งมา = รายชื่อจังหวัด */
  options?: readonly string[]
  /** ไอคอนหน้าแต่ละตัวเลือก (เช่นป้ายธนาคาร) — ไม่ส่งมา = ไอคอนหมุด (ถ้าส่งมาแล้วคืน null จะใช้ไอคอนหมุดแทนเฉพาะตัวนั้น) */
  renderIcon?: (name: string) => ReactNode
  /** ไอคอนที่แสดงในช่องพิมพ์ด้านซ้าย (เช่นป้ายของธนาคารที่เลือกอยู่) — null = ไม่แสดง */
  leadingIcon?: ReactNode
}

/**
 * ช่องพิมพ์พร้อมรายการให้เลือก (ค่าเริ่มต้นเป็นจังหวัด ใช้กับรายชื่อธนาคารได้ด้วย)ที่ดีไซน์เข้ากับแอป (แทน <datalist> ของเบราว์เซอร์ที่จัดสไตล์ไม่ได้)
 * พิมพ์แล้วกรองรายการ (ตัวที่ขึ้นต้นด้วยคำที่พิมพ์ขึ้นก่อน) ไฮไลต์ตัวอักษรที่ตรง เลื่อนด้วยลูกศรขึ้น/ลง เลือกด้วย Enter/คลิก ปิดด้วย Esc
 * หรือคลิกข้างนอก — ยังพิมพ์ชื่ออื่นที่ไม่อยู่ในรายการได้ (ไม่บังคับให้เลือก)
 */
export default function SuggestInput({
  value,
  onChange,
  onEnter,
  placeholder,
  id,
  className = '',
  options: optionList = THAI_PROVINCES,
  renderIcon,
  leadingIcon,
}: Readonly<SuggestInputProps>) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const listId = useId()

  const options = filterProvinces(value, optionList)

  // คลิกนอกกล่อง = ปิดรายการ
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // เลื่อนรายการตามตัวเลือกที่กำลังเลือกด้วยคีย์บอร์ด
  useEffect(() => {
    if (active < 0) return
    listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const choose = (name: string) => {
    onChange(name)
    setOpen(false)
    setActive(-1)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive(i => (options.length === 0 ? -1 : (i + 1) % options.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
      setActive(i => (options.length === 0 ? -1 : (i <= 0 ? options.length - 1 : i - 1)))
    } else if (e.key === 'Enter') {
      if (open && active >= 0 && options[active]) {
        e.preventDefault()
        choose(options[active])
      } else if (onEnter) {
        e.preventDefault()
        onEnter()
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActive(-1)
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={e => {
          onChange(e.target.value)
          setOpen(true)
          setActive(-1)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className={`w-full border border-gray-200 rounded-xl py-2.5 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${
          leadingIcon ? 'pl-11' : 'pl-4'
        }`}
      />
      {leadingIcon && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">{leadingIcon}</span>}

      {open && (
        <ul
          id={listId}
          ref={listRef}
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-gray-100 bg-white py-1.5 shadow-xl shadow-gray-200/70"
        >
          {options.length === 0 ? (
            <li className="px-4 py-3 text-xs text-gray-400">ไม่พบรายการที่ตรงกับ "{value.trim()}" — ใช้ชื่อที่พิมพ์ต่อได้เลย</li>
          ) : (
            options.map((name, i) => {
              const [before, match, after] = splitMatch(name, value)
              const selected = name === value.trim()
              return (
                <li
                  key={name}
                  role="option"
                  aria-selected={selected}
                  // mousedown (ไม่ใช่ click) กัน input เสียโฟกัสก่อนเลือกทัน
                  onMouseDown={e => {
                    e.preventDefault()
                    choose(name)
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={`flex cursor-pointer items-center gap-2 px-4 py-2 text-sm transition-colors ${
                    i === active ? 'bg-orange-50 text-orange-700' : 'text-gray-700 hover:bg-orange-50/60'
                  }`}
                >
                  {renderIcon?.(name) ?? (
                    <MapPin size={13} className={i === active || selected ? 'text-orange-500' : 'text-gray-300'} />
                  )}
                  <span className="flex-1">
                    {before}
                    <span className="font-bold text-orange-600">{match}</span>
                    {after}
                  </span>
                  {selected && <Check size={14} className="text-orange-500" />}
                </li>
              )
            })
          )}
        </ul>
      )}
    </div>
  )
}
