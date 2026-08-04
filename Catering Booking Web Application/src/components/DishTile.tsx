import type { MenuItem } from '../types'
import { CATEGORY_MAP } from '../data'

interface DishTileProps {
  item: MenuItem
  /** ใช้หมวดของ "ข้อ" แทนหมวดของจาน (เช่น สี่สีมังกรทอด ที่อยู่ในข้อจานหลัก) */
  category?: string
  emojiClass?: string
  className?: string
}

export default function DishTile({ item, category, emojiClass = 'text-4xl', className = '' }: DishTileProps) {
  if (item.image) {
    return (
      <img src={item.image} alt={item.name} draggable={false} className={`w-full h-full object-cover ${className}`} />
    )
  }

  const cat = CATEGORY_MAP[category ?? item.category]

  return (
    <div
      className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${
        cat?.gradient ?? 'from-gray-100 to-gray-200'
      } ${className}`}
    >
      <span className={emojiClass}>{cat?.icon ?? '🍽️'}</span>
    </div>
  )
}
