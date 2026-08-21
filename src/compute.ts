import type { Vendor, VendorStatus, VendorTotals } from './types.ts'

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
})

export function formatInr(amount: number): string {
  return inr.format(amount)
}

function statusFor(paid: number, remaining: number): VendorStatus {
  if (remaining < 0) return 'overpaid'
  if (remaining === 0 && paid > 0) return 'settled'
  if (paid === 0) return 'unpaid'
  return 'partial'
}

export function totalsFor(vendor: Vendor): VendorTotals {
  const extrasTotal = vendor.extras.reduce((sum, extra) => sum + extra.amount, 0)
  const paid = vendor.payments.reduce((sum, payment) => sum + payment.amount, 0)
  const finalAmount = vendor.quotedAmount + extrasTotal
  const remaining = finalAmount - paid
  return {
    extrasTotal,
    finalAmount,
    paid,
    remaining,
    status: statusFor(paid, remaining),
  }
}

export function dashboardTotals(vendors: Vendor[]): Omit<VendorTotals, 'status'> {
  return vendors.reduce(
    (acc, vendor) => {
      const t = totalsFor(vendor)
      acc.extrasTotal += t.extrasTotal
      acc.finalAmount += t.finalAmount
      acc.paid += t.paid
      acc.remaining += t.remaining
      return acc
    },
    {
      extrasTotal: 0,
      finalAmount: 0,
      paid: 0,
      remaining: 0,
    },
  )
}

export function quotedTotal(vendors: Vendor[]): number {
  return vendors.reduce((sum, vendor) => sum + vendor.quotedAmount, 0)
}
