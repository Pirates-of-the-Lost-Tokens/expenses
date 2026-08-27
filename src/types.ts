export type Extra = {
  id: string
  description: string
  amount: number
  date: string
}

export type Payment = {
  id: string
  amount: number
  date: string
  note: string
}

export type Discount = {
  id: string
  amount: number
  date: string
  description?: string
}

export type Receipt = {
  id: string
  amount: number
  date: string
  note?: string
}

export type Vendor = {
  id: string
  name: string
  category: string
  quotedAmount: number
  extras: Extra[]
  discounts: Discount[]
  payments: Payment[]
  notes: string
}

export type VendorStatus = 'unpaid' | 'partial' | 'settled' | 'overpaid'

export type VendorTotals = {
  extrasTotal: number
  discountTotal: number
  finalAmount: number
  paid: number
  remaining: number
  status: VendorStatus
}

export const CATEGORIES = [
  'Venue',
  'Catering',
  'Clothes',
  'Jewelry',
  'Photo',
  'Makeup',
  'Decor',
  'Travel',
  'Gifts',
  'Other',
] as const

export type BackupData = {
  exportedAt: string
  vendors: Vendor[]
  receipts: Receipt[]
}
