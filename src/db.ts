import Dexie, { type EntityTable } from 'dexie'
import type { Discount, Extra, Payment, Receipt, Vendor } from './types.ts'

const db = new Dexie('marriage-expenses') as Dexie & {
  vendors: EntityTable<Vendor, 'id'>
  receipts: EntityTable<Receipt, 'id'>
}

db.version(1).stores({
  vendors: 'id, name, category',
})

db.version(2).stores({
  vendors: 'id, name, category',
  receipts: 'id, date',
})

export function newId(): string {
  return crypto.randomUUID()
}

export function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function withDefaults(vendor: Vendor): Vendor {
  return {
    ...vendor,
    extras: vendor.extras ?? [],
    discounts: vendor.discounts ?? [],
    payments: vendor.payments ?? [],
  }
}

export async function listVendors(): Promise<Vendor[]> {
  const vendors = await db.vendors.toArray()
  return vendors.map(withDefaults).sort((a, b) => a.name.localeCompare(b.name))
}

export async function addVendor(input: {
  name: string
  category: string
  quotedAmount: number
}): Promise<string> {
  const id = newId()
  await db.vendors.add({
    id,
    name: input.name.trim(),
    category: input.category.trim() || 'Other',
    quotedAmount: input.quotedAmount,
    extras: [],
    discounts: [],
    payments: [],
    notes: '',
  })
  return id
}

export async function updateVendor(
  id: string,
  patch: Partial<Pick<Vendor, 'name' | 'category' | 'quotedAmount' | 'notes'>>,
): Promise<void> {
  await db.vendors.update(id, patch)
}

export async function deleteVendor(id: string): Promise<void> {
  await db.vendors.delete(id)
}

async function getVendor(vendorId: string): Promise<Vendor | undefined> {
  const vendor = await db.vendors.get(vendorId)
  return vendor ? withDefaults(vendor) : undefined
}

export async function addExtra(
  vendorId: string,
  extra: Omit<Extra, 'id'>,
): Promise<void> {
  const vendor = await getVendor(vendorId)
  if (!vendor) return
  await db.vendors.update(vendorId, {
    extras: [...vendor.extras, { ...extra, id: newId() }],
  })
}

export async function deleteExtra(vendorId: string, extraId: string): Promise<void> {
  const vendor = await getVendor(vendorId)
  if (!vendor) return
  await db.vendors.update(vendorId, {
    extras: vendor.extras.filter((extra) => extra.id !== extraId),
  })
}

export async function addDiscount(
  vendorId: string,
  discount: Omit<Discount, 'id'>,
): Promise<void> {
  const vendor = await getVendor(vendorId)
  if (!vendor) return
  await db.vendors.update(vendorId, {
    discounts: [...vendor.discounts, { ...discount, id: newId() }],
  })
}

export async function deleteDiscount(
  vendorId: string,
  discountId: string,
): Promise<void> {
  const vendor = await getVendor(vendorId)
  if (!vendor) return
  await db.vendors.update(vendorId, {
    discounts: vendor.discounts.filter((discount) => discount.id !== discountId),
  })
}

export async function addPayment(
  vendorId: string,
  payment: Omit<Payment, 'id'>,
): Promise<void> {
  const vendor = await getVendor(vendorId)
  if (!vendor) return
  await db.vendors.update(vendorId, {
    payments: [...vendor.payments, { ...payment, id: newId() }],
  })
}

export async function deletePayment(
  vendorId: string,
  paymentId: string,
): Promise<void> {
  const vendor = await getVendor(vendorId)
  if (!vendor) return
  await db.vendors.update(vendorId, {
    payments: vendor.payments.filter((payment) => payment.id !== paymentId),
  })
}

export async function listReceipts(): Promise<Receipt[]> {
  const receipts = await db.receipts.toArray()
  return receipts.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))
}

export async function addReceipt(input: {
  amount: number
  date: string
  note?: string
}): Promise<string> {
  const id = newId()
  const note = input.note?.trim()
  await db.receipts.add({
    id,
    amount: input.amount,
    date: input.date,
    ...(note ? { note } : {}),
  })
  return id
}

export async function updateReceipt(
  id: string,
  patch: { amount: number; date: string; note?: string },
): Promise<void> {
  const existing = await db.receipts.get(id)
  if (!existing) return
  const note = patch.note?.trim()
  await db.receipts.put({
    id,
    amount: patch.amount,
    date: patch.date,
    ...(note ? { note } : {}),
  })
}

export async function deleteReceipt(id: string): Promise<void> {
  await db.receipts.delete(id)
}
