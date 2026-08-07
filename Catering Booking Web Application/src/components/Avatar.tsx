import { useState } from 'react'

interface AvatarProps {
  src?: string
  name?: string
  className?: string
}

const COLORS = ['bg-orange-500', 'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-rose-500', 'bg-amber-500']

const colorFor = (initial: string) => COLORS[initial.charCodeAt(0) % COLORS.length]

/** โชว์รูปโปรไฟล์ ถ้าไม่มี src หรือโหลดไม่สำเร็จ (เช่น googleusercontent โดน rate limit) ใช้ตัวอักษรแรกของชื่อแทนแทนที่จะเป็นไอคอนรูปแตก */
export default function Avatar({ src, name = '', className = '' }: AvatarProps) {
  const [failed, setFailed] = useState(false)
  const initial = name.trim().charAt(0).toUpperCase() || '?'

  if (!src || failed) {
    return (
      <div className={`${className} ${colorFor(initial)} flex items-center justify-center text-white font-medium shrink-0`}>
        {initial}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={name}
      className={`${className} object-cover shrink-0`}
      onError={() => setFailed(true)}
    />
  )
}
