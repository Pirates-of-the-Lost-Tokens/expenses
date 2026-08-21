import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  addDiscount,
  addExtra,
  addPayment,
  addReceipt,
  addVendor,
  deleteDiscount,
  deleteExtra,
  deletePayment,
  deleteReceipt,
  deleteVendor,
  listReceipts,
  listVendors,
  today,
  updateVendor,
} from './db.ts'
import {
  dashboardTotals,
  formatInr,
  fundsPosition,
  quotedTotal,
  receivedTotal,
  totalsFor,
} from './compute.ts'
import {
  CATEGORIES,
  type Receipt,
  type Vendor,
  type VendorStatus,
} from './types.ts'
import './styles.css'

function parseAmount(value: string): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

const statusLabel: Record<VendorStatus, string> = {
  unpaid: 'Unpaid',
  partial: 'Partial',
  settled: 'Settled',
  overpaid: 'Overpaid',
}

export default function App() {
  const [tab, setTab] = useState<'expenses' | 'funds'>('expenses')
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [category, setCategory] = useState<string>('Venue')
  const [customCategory, setCustomCategory] = useState('')
  const [quoted, setQuoted] = useState('')

  const [fundAmount, setFundAmount] = useState('')
  const [fundDate, setFundDate] = useState(today())
  const [fundNote, setFundNote] = useState('')

  const reload = useCallback(async () => {
    const [nextVendors, nextReceipts] = await Promise.all([
      listVendors(),
      listReceipts(),
    ])
    setVendors(nextVendors)
    setReceipts(nextReceipts)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  async function onAddVendor(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Add a vendor name.')
      return
    }
    const categoryValue =
      category === '__custom' ? customCategory.trim() : category
    if (!categoryValue) {
      setError('Pick or type a category.')
      return
    }
    const id = await addVendor({
      name: trimmed,
      category: categoryValue,
      quotedAmount: parseAmount(quoted),
    })
    setName('')
    setQuoted('')
    setCustomCategory('')
    setCategory('Venue')
    setError(null)
    setOpenId(id)
    await reload()
  }

  async function onAddReceipt(event: FormEvent) {
    event.preventDefault()
    const amount = parseAmount(fundAmount)
    if (amount <= 0) return
    await addReceipt({
      amount,
      date: fundDate,
      note: fundNote.trim() || undefined,
    })
    setFundAmount('')
    setFundNote('')
    setFundDate(today())
    await reload()
  }

  const dash = dashboardTotals(vendors)
  const quotedSum = quotedTotal(vendors)
  const received = receivedTotal(receipts)
  const { surplusOrDeficit, cashLeft } = fundsPosition(
    received,
    dash.finalAmount,
    dash.paid,
  )
  const open = vendors.find((vendor) => vendor.id === openId) ?? null

  return (
    <div className="page">
      <header className="masthead">
        <p className="eyebrow">Household ledger</p>
        <h1>Marriage expenses</h1>
        <p className="lede">
          Vendors and funds stay in this browser. Nothing is sent anywhere.
        </p>
      </header>

      <nav className="tabs" aria-label="Views">
        <button
          type="button"
          className={tab === 'expenses' ? 'tab active' : 'tab'}
          onClick={() => setTab('expenses')}
        >
          Expenses
        </button>
        <button
          type="button"
          className={tab === 'funds' ? 'tab active' : 'tab'}
          onClick={() => setTab('funds')}
        >
          Funds
        </button>
      </nav>

      {tab === 'expenses' ? (
        <>
          <section className="summary" aria-label="Expense totals">
            <SummaryTile label="Quoted" value={formatInr(quotedSum)} />
            <SummaryTile label="Extras" value={formatInr(dash.extrasTotal)} />
            <SummaryTile
              label="Discounts"
              value={formatInr(dash.discountTotal)}
            />
            <SummaryTile label="Final" value={formatInr(dash.finalAmount)} />
            <SummaryTile label="Paid" value={formatInr(dash.paid)} />
            <SummaryTile
              label="Remaining"
              value={formatInr(dash.remaining)}
              emphasize
            />
          </section>

          <form className="add-vendor" onSubmit={onAddVendor}>
            <h2>Add vendor</h2>
            {error ? <p className="error">{error}</p> : null}
            <div className="fields">
              <label>
                Name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Hall, caterer, jeweler…"
                  autoComplete="off"
                />
              </label>
              <label>
                Category
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                  <option value="__custom">Other (type it)</option>
                </select>
              </label>
              {category === '__custom' ? (
                <label>
                  Custom category
                  <input
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Mehndi, pandit…"
                  />
                </label>
              ) : null}
              <label>
                Quoted
                <input
                  inputMode="decimal"
                  value={quoted}
                  onChange={(e) => setQuoted(e.target.value)}
                  placeholder="0"
                />
              </label>
              <button type="submit">Add vendor</button>
            </div>
          </form>

          {vendors.length === 0 ? (
            <p className="empty">
              No vendors yet. Add the first booking — hall, clothes, or catering
              — to start the ledger.
            </p>
          ) : (
            <div className="table-wrap">
              <table className="ledger">
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Category</th>
                    <th className="num">Quoted</th>
                    <th className="num">Extras</th>
                    <th className="num">Discounts</th>
                    <th className="num">Paid</th>
                    <th className="num">Remaining</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((vendor) => {
                    const t = totalsFor(vendor)
                    const isOpen = vendor.id === openId
                    return (
                      <tr
                        key={vendor.id}
                        className={isOpen ? 'open' : undefined}
                        onClick={() => setOpenId(isOpen ? null : vendor.id)}
                      >
                        <td>{vendor.name}</td>
                        <td>{vendor.category}</td>
                        <td className="num">
                          {formatInr(vendor.quotedAmount)}
                        </td>
                        <td className="num">{formatInr(t.extrasTotal)}</td>
                        <td className="num">{formatInr(t.discountTotal)}</td>
                        <td className="num">{formatInr(t.paid)}</td>
                        <td className="num remaining">
                          {formatInr(t.remaining)}
                        </td>
                        <td>
                          <span className={`stamp ${t.status}`}>
                            {statusLabel[t.status]}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {open ? (
            <VendorPanel
              key={open.id}
              vendor={open}
              onChange={reload}
              onClose={() => setOpenId(null)}
            />
          ) : null}
        </>
      ) : (
        <>
          <section className="summary" aria-label="Funds totals">
            <SummaryTile label="Received" value={formatInr(received)} />
            <SummaryTile label="Final cost" value={formatInr(dash.finalAmount)} />
            <SummaryTile label="Paid out" value={formatInr(dash.paid)} />
            <SummaryTile label="Cash left" value={formatInr(cashLeft)} />
            <SummaryTile
              label={surplusOrDeficit >= 0 ? 'Surplus' : 'Deficit'}
              value={formatInr(surplusOrDeficit)}
              emphasize
              tone={surplusOrDeficit >= 0 ? 'surplus' : 'deficit'}
            />
          </section>

          <section className="funds" aria-label="Funds in">
            <h2>Funds in</h2>
            <p className="muted funds-hint">
              Add each lot you receive (e.g. 200000 for 2L). Surplus or deficit
              is received minus final cost.
            </p>
            {receipts.length === 0 ? (
              <p className="muted">No funds recorded yet.</p>
            ) : (
              <ul className="lines">
                {receipts.map((receipt) => (
                  <li key={receipt.id}>
                    <span>
                      <strong>{formatInr(receipt.amount)}</strong>
                      <em>
                        {receipt.date}
                        {receipt.note ? ` · ${receipt.note}` : ''}
                      </em>
                    </span>
                    <button
                      type="button"
                      className="text"
                      onClick={() =>
                        void deleteReceipt(receipt.id).then(reload)
                      }
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <form className="inline funds-form" onSubmit={onAddReceipt}>
              <input
                inputMode="decimal"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                placeholder="Amount (₹)"
              />
              <input
                type="date"
                value={fundDate}
                onChange={(e) => setFundDate(e.target.value)}
              />
              <input
                value={fundNote}
                onChange={(e) => setFundNote(e.target.value)}
                placeholder="Source (optional)"
              />
              <button type="submit">Add funds</button>
            </form>
          </section>
        </>
      )}
    </div>
  )
}

function SummaryTile({
  label,
  value,
  emphasize,
  tone,
}: {
  label: string
  value: string
  emphasize?: boolean
  tone?: 'surplus' | 'deficit'
}) {
  const classes = [
    'tile',
    emphasize ? 'emphasize' : '',
    tone === 'surplus' ? 'tone-surplus' : '',
    tone === 'deficit' ? 'tone-deficit' : '',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <div className={classes}>
      <span className="tile-label">{label}</span>
      <span className="tile-value">{value}</span>
    </div>
  )
}

function VendorPanel({
  vendor,
  onChange,
  onClose,
}: {
  vendor: Vendor
  onChange: () => Promise<void>
  onClose: () => void
}) {
  const t = totalsFor(vendor)
  const [quotedAmount, setQuotedAmount] = useState(String(vendor.quotedAmount))
  const [notes, setNotes] = useState(vendor.notes)
  const [extraDesc, setExtraDesc] = useState('')
  const [extraAmount, setExtraAmount] = useState('')
  const [extraDate, setExtraDate] = useState(today())
  const [discountAmount, setDiscountAmount] = useState('')
  const [discountDate, setDiscountDate] = useState(today())
  const [payAmount, setPayAmount] = useState('')
  const [payDate, setPayDate] = useState(today())
  const [payNote, setPayNote] = useState('')

  async function saveQuoted() {
    await updateVendor(vendor.id, { quotedAmount: parseAmount(quotedAmount) })
    await onChange()
  }

  async function saveNotes() {
    await updateVendor(vendor.id, { notes })
    await onChange()
  }

  async function onAddExtra(event: FormEvent) {
    event.preventDefault()
    await addExtra(vendor.id, {
      description: extraDesc.trim() || 'Extra',
      amount: parseAmount(extraAmount),
      date: extraDate,
    })
    setExtraDesc('')
    setExtraAmount('')
    setExtraDate(today())
    await onChange()
  }

  async function onAddDiscount(event: FormEvent) {
    event.preventDefault()
    await addDiscount(vendor.id, {
      amount: parseAmount(discountAmount),
      date: discountDate,
    })
    setDiscountAmount('')
    setDiscountDate(today())
    await onChange()
  }

  async function onAddPayment(event: FormEvent) {
    event.preventDefault()
    await addPayment(vendor.id, {
      amount: parseAmount(payAmount),
      date: payDate,
      note: payNote.trim(),
    })
    setPayAmount('')
    setPayNote('')
    setPayDate(today())
    await onChange()
  }

  async function onDelete() {
    if (!window.confirm(`Delete ${vendor.name}?`)) return
    await deleteVendor(vendor.id)
    onClose()
    await onChange()
  }

  return (
    <section className="panel" aria-label={`${vendor.name} detail`}>
      <div className="panel-head">
        <div>
          <p className="eyebrow">{vendor.category}</p>
          <h2>{vendor.name}</h2>
        </div>
        <button type="button" className="ghost" onClick={onClose}>
          Close
        </button>
      </div>

      <dl className="panel-math">
        <div>
          <dt>Quoted</dt>
          <dd>{formatInr(vendor.quotedAmount)}</dd>
        </div>
        <div>
          <dt>Extras</dt>
          <dd>{formatInr(t.extrasTotal)}</dd>
        </div>
        <div>
          <dt>Discounts</dt>
          <dd>{formatInr(t.discountTotal)}</dd>
        </div>
        <div>
          <dt>Final</dt>
          <dd>{formatInr(t.finalAmount)}</dd>
        </div>
        <div>
          <dt>Paid</dt>
          <dd>{formatInr(t.paid)}</dd>
        </div>
        <div>
          <dt>Remaining</dt>
          <dd>{formatInr(t.remaining)}</dd>
        </div>
      </dl>

      <div className="panel-grid">
        <label>
          Quoted amount
          <input
            inputMode="decimal"
            value={quotedAmount}
            onChange={(e) => setQuotedAmount(e.target.value)}
            onBlur={() => void saveQuoted()}
          />
        </label>
        <label className="span">
          Notes
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => void saveNotes()}
            placeholder="Contact, due date, what was agreed…"
          />
        </label>
      </div>

      <div className="split">
        <div className="stack">
          <div>
          <h3>Extras</h3>
          {vendor.extras.length === 0 ? (
            <p className="muted">No extras yet.</p>
          ) : (
            <ul className="lines">
              {vendor.extras.map((extra) => (
                <li key={extra.id}>
                  <span>
                    <strong>{extra.description}</strong>
                    <em>
                      {extra.date} · {formatInr(extra.amount)}
                    </em>
                  </span>
                  <button
                    type="button"
                    className="text"
                    onClick={() =>
                      void deleteExtra(vendor.id, extra.id).then(onChange)
                    }
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <form className="inline" onSubmit={onAddExtra}>
            <input
              value={extraDesc}
              onChange={(e) => setExtraDesc(e.target.value)}
              placeholder="What was added"
            />
            <input
              inputMode="decimal"
              value={extraAmount}
              onChange={(e) => setExtraAmount(e.target.value)}
              placeholder="Amount"
            />
            <input
              type="date"
              value={extraDate}
              onChange={(e) => setExtraDate(e.target.value)}
            />
            <button type="submit">Add extra</button>
          </form>
          </div>

          <div>
          <h3>Discounts</h3>
          {vendor.discounts.length === 0 ? (
            <p className="muted">No discounts yet.</p>
          ) : (
            <ul className="lines">
              {vendor.discounts.map((discount) => (
                <li key={discount.id}>
                  <span>
                    <strong>{formatInr(discount.amount)}</strong>
                    <em>{discount.date}</em>
                  </span>
                  <button
                    type="button"
                    className="text"
                    onClick={() =>
                      void deleteDiscount(vendor.id, discount.id).then(onChange)
                    }
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <form className="inline compact" onSubmit={onAddDiscount}>
            <input
              inputMode="decimal"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(e.target.value)}
              placeholder="Amount"
            />
            <input
              type="date"
              value={discountDate}
              onChange={(e) => setDiscountDate(e.target.value)}
            />
            <button type="submit">Add discount</button>
          </form>
          </div>
        </div>

        <div>
          <h3>Payments</h3>
          {vendor.payments.length === 0 ? (
            <p className="muted">No advances yet.</p>
          ) : (
            <ul className="lines">
              {vendor.payments.map((payment) => (
                <li key={payment.id}>
                  <span>
                    <strong>{formatInr(payment.amount)}</strong>
                    <em>
                      {payment.date}
                      {payment.note ? ` · ${payment.note}` : ''}
                    </em>
                  </span>
                  <button
                    type="button"
                    className="text"
                    onClick={() =>
                      void deletePayment(vendor.id, payment.id).then(onChange)
                    }
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <form className="inline" onSubmit={onAddPayment}>
            <input
              inputMode="decimal"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              placeholder="Amount"
            />
            <input
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
            />
            <input
              value={payNote}
              onChange={(e) => setPayNote(e.target.value)}
              placeholder="Advance, booking, final…"
            />
            <button type="submit">Add payment</button>
          </form>
        </div>
      </div>

      <button type="button" className="danger" onClick={() => void onDelete()}>
        Delete vendor
      </button>
    </section>
  )
}
