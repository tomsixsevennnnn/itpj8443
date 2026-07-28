export type Screen =
  | 'login'
  | 'home'
  | 'booking-calendar'
  | 'select-table'
  | 'select-location'
  | 'select-package'
  | 'select-menu'
  | 'cart'
  | 'history'
  | 'notifications'
  | 'owner-dashboard'
  | 'owner-orders'
  | 'owner-calendar'
  | 'owner-packages'
  | 'owner-menus'
  | 'owner-documents'

export interface MenuItem {
  id: string
  name: string
  category: string
  description: string
  image: string
  extraPrice?: number
}

export interface Package {
  id: string
  name: string
  pricePerTable: number
  menuLimit: number
  description: string
  features: string[]
  badge?: string
}

export interface BookingData {
  date: string | null
  timeSlot: string | null
  tables: number
  guestCount: number
  location: { lat: number; lng: number; address: string } | null
  packageId: string | null
  packageName: string | null
  packagePrice: number
  menuLimit: number
  selectedMenus: MenuItem[]
  drinkOption?: 'provided' | 'self' | null
}

export interface Booking {
  id: string
  customerName: string
  date: string
  timeSlot: string
  tables: number
  guestCount: number
  packageName: string
  totalPrice: number
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  location: string
  menus: string[]
  phone: string
}

export interface UserProfile {
  name: string
  surname: string
  phone: string
  lineId: string
  email: string
  avatar: string
}
