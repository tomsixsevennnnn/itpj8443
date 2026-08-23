import type { MenuItem } from '../types'
import { useNav } from '../NavContext'
import { resolveImageUrl } from '../api'

interface DishTileProps {
  item: MenuItem
  /** ใช้หมวดของ "ข้อ" แทนหมวดของจาน (เช่น สี่สีมังกรทอด ที่อยู่ในข้อจานหลัก) */
  category?: string
  emojiClass?: string
  className?: string
}

export default function DishTile({ item, category, emojiClass = 'text-4xl', className = '' }: DishTileProps) {
  const { categoryMap } = useNav()
  if (item.image) {
    const { x, y } = item.imagePosition ?? { x: 50, y: 50 }
    const scale = item.imageScale ?? 1
    return (
      <img
        src={resolveImageUrl(item.image)}
        alt={item.name}
        draggable={false}
        className={`w-full h-full object-cover ${className}`}
        style={
          x !== 50 || y !== 50 || scale !== 1
            ? { objectPosition: `${x}% ${y}%`, transform: `scale(${scale})`, transformOrigin: `${x}% ${y}%` }
            : undefined
        }
      />
    )
  }

  const cat = categoryMap[category ?? item.category]

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
