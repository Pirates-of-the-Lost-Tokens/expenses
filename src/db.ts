import Dexie, { type EntityTable } from 'dexie'
import type { BackupData, Discount, Extra, Payment, Receipt, Vendor } from './types.ts'

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

function normalizeVendor(raw: unknown): Vendor {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid vendor entry in backup.')
  }
  const v = raw as Partial<Vendor>
  if (!v.id || !v.name || typeof v.quotedAmount !== 'number') {
    throw new Error(`Invalid vendor: ${v.name ?? 'unknown'}`)
  }
  return withDefaults({
    id: String(v.id),
    name: String(v.name),
    category: String(v.category ?? 'Other'),
    quotedAmount: v.quotedAmount,
    extras: Array.isArray(v.extras) ? v.extras : [],
    discounts: Array.isArray(v.discounts) ? v.discounts : [],
    payments: Array.isArray(v.payments) ? v.payments : [],
    notes: String(v.notes ?? ''),
  })
}

function normalizeReceipt(raw: unknown): Receipt {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid receipt entry in backup.')
  }
  const r = raw as Partial<Receipt>
  if (!r.id || typeof r.amount !== 'number' || !r.date) {
    throw new Error('Invalid receipt in backup.')
  }
  const note = r.note?.trim()
  return {
    id: String(r.id),
    amount: r.amount,
    date: String(r.date),
    ...(note ? { note } : {}),
  }
}

export async function exportBackup(): Promise<BackupData> {
  const [vendors, receipts] = await Promise.all([listVendors(), listReceipts()])
  return {
    exportedAt: new Date().toISOString(),
    vendors,
    receipts,
  }
}

export async function importBackup(data: unknown): Promise<{
  vendors: number
  receipts: number
}> {
  if (!data || typeof data !== 'object') {
    throw new Error('Backup file is not valid JSON.')
  }
  const backup = data as Partial<BackupData>
  if (!Array.isArray(backup.vendors)) {
    throw new Error('Backup must include a vendors array.')
  }
  const vendors = backup.vendors.map(normalizeVendor)
  const receipts = Array.isArray(backup.receipts)
    ? backup.receipts.map(normalizeReceipt)
    : []

  await db.transaction('rw', db.vendors, db.receipts, async () => {
    await db.vendors.clear()
    await db.receipts.clear()
    if (vendors.length > 0) await db.vendors.bulkPut(vendors)
    if (receipts.length > 0) await db.receipts.bulkPut(receipts)
  })

  return { vendors: vendors.length, receipts: receipts.length }
}
