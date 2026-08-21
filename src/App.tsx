import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  addExtra,
  addPayment,
  addVendor,
  deleteExtra,
  deletePayment,
  deleteVendor,
  listVendors,
  today,
  updateVendor,
} from './db.ts'
import {
  dashboardTotals,
  formatInr,
  quotedTotal,
  totalsFor,
} from './compute.ts'
import { CATEGORIES, type Vendor, type VendorStatus } from './types.ts'
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
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [category, setCategory] = useState<string>('Venue')
  const [customCategory, setCustomCategory] = useState('')
  const [quoted, setQuoted] = useState('')

  const reload = useCallback(async () => {
    setVendors(await listVendors())
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

  const dash = dashboardTotals(vendors)
  const quotedSum = quotedTotal(vendors)
  const open = vendors.find((vendor) => vendor.id === openId) ?? null

  return (
    <div className="page">
      <header className="masthead">
        <p className="eyebrow">Household ledger</p>
        <h1>Marriage expenses</h1>
        <p className="lede">
          Quoted, extras, and advances stay in this browser. Nothing is sent
          anywhere.
        </p>
      </header>

      <section className="summary" aria-label="Totals">
        <SummaryTile label="Quoted" value={formatInr(quotedSum)} />
        <SummaryTile label="Extras" value={formatInr(dash.extrasTotal)} />
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
          No vendors yet. Add the first booking — hall, clothes, or catering —
          to start the ledger.
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
                    onClick={() =>
                      setOpenId(isOpen ? null : vendor.id)
                    }
                  >
                    <td>{vendor.name}</td>
                    <td>{vendor.category}</td>
                    <td className="num">{formatInr(vendor.quotedAmount)}</td>
                    <td className="num">{formatInr(t.extrasTotal)}</td>
                    <td className="num">{formatInr(t.paid)}</td>
                    <td className="num remaining">{formatInr(t.remaining)}</td>
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
    </div>
  )
}

function SummaryTile({
  label,
  value,
  emphasize,
}: {
  label: string
  value: string
  emphasize?: boolean
}) {
  return (
    <div className={emphasize ? 'tile emphasize' : 'tile'}>
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
