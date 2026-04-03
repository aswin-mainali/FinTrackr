import React, { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis,
  PieChart, Pie, Cell,
  LineChart, Line, AreaChart, Area, ComposedChart,
} from 'recharts'
import { Plus, Trash2, Download, Upload, Search, CalendarDays, FileDown, ChevronDown, ChevronUp, ShieldCheck, Users, ToggleLeft, ToggleRight, RefreshCw, Lock, Eye, EyeOff } from 'lucide-react'
import { Category, TxType, RecurrenceType, RecurringKind, FeatureAccess, UserRole } from '../types'
import { useBudgetApp } from '../hooks/useBudgetApp'
import { useSuperAdmin } from '../hooks/useSuperAdmin'
import { downloadPdfFromJpeg } from '../lib/utils'
import { supabase } from '../lib/supabase'

type BudgetAppState = ReturnType<typeof useBudgetApp>

type SharedProps = {
  budget: BudgetAppState
  theme: 'dark' | 'light'
  email: string | null
  onThemeToggle: () => void
  admin?: ReturnType<typeof useSuperAdmin>
}


const COUNTRY_BY_CURRENCY: Record<string, string> = {
  AED: 'United Arab Emirates',
  AUD: 'Australia',
  BDT: 'Bangladesh',
  BGN: 'Bulgaria',
  BHD: 'Bahrain',
  BRL: 'Brazil',
  CAD: 'Canada',
  CHF: 'Switzerland',
  CNY: 'China',
  CZK: 'Czech Republic',
  DKK: 'Denmark',
  EGP: 'Egypt',
  EUR: 'Euro Area',
  GBP: 'United Kingdom',
  HKD: 'Hong Kong',
  HUF: 'Hungary',
  IDR: 'Indonesia',
  ILS: 'Israel',
  INR: 'India',
  ISK: 'Iceland',
  JPY: 'Japan',
  KRW: 'South Korea',
  KWD: 'Kuwait',
  LKR: 'Sri Lanka',
  MAD: 'Morocco',
  MXN: 'Mexico',
  MYR: 'Malaysia',
  NGN: 'Nigeria',
  NOK: 'Norway',
  NPR: 'Nepal',
  NZD: 'New Zealand',
  OMR: 'Oman',
  PHP: 'Philippines',
  PKR: 'Pakistan',
  PLN: 'Poland',
  QAR: 'Qatar',
  RON: 'Romania',
  RUB: 'Russia',
  SAR: 'Saudi Arabia',
  SEK: 'Sweden',
  SGD: 'Singapore',
  THB: 'Thailand',
  TRY: 'Turkey',
  TWD: 'Taiwan',
  UAH: 'Ukraine',
  USD: 'United States',
  VND: 'Vietnam',
  ZAR: 'South Africa',
}

const RAW_FALLBACK_CURRENCIES: Record<string, string> = {
  AED: 'UAE Dirham',
  AUD: 'Australian Dollar',
  BDT: 'Bangladeshi Taka',
  BGN: 'Bulgarian Lev',
  BHD: 'Bahraini Dinar',
  BRL: 'Brazilian Real',
  CAD: 'Canadian Dollar',
  CHF: 'Swiss Franc',
  CNY: 'Chinese Yuan',
  CZK: 'Czech Koruna',
  DKK: 'Danish Krone',
  EGP: 'Egyptian Pound',
  EUR: 'Euro',
  GBP: 'Pound Sterling',
  HKD: 'Hong Kong Dollar',
  HUF: 'Hungarian Forint',
  IDR: 'Indonesian Rupiah',
  ILS: 'Israeli New Shekel',
  INR: 'Indian Rupee',
  ISK: 'Icelandic Króna',
  JPY: 'Japanese Yen',
  KRW: 'South Korean Won',
  KWD: 'Kuwaiti Dinar',
  LKR: 'Sri Lankan Rupee',
  MAD: 'Moroccan Dirham',
  MXN: 'Mexican Peso',
  MYR: 'Malaysian Ringgit',
  NGN: 'Nigerian Naira',
  NOK: 'Norwegian Krone',
  NPR: 'Nepalese Rupee',
  NZD: 'New Zealand Dollar',
  OMR: 'Omani Rial',
  PHP: 'Philippine Peso',
  PKR: 'Pakistani Rupee',
  PLN: 'Polish Złoty',
  QAR: 'Qatari Riyal',
  RON: 'Romanian Leu',
  RUB: 'Russian Ruble',
  SAR: 'Saudi Riyal',
  SEK: 'Swedish Krona',
  SGD: 'Singapore Dollar',
  THB: 'Thai Baht',
  TRY: 'Turkish Lira',
  TWD: 'New Taiwan Dollar',
  UAH: 'Ukrainian Hryvnia',
  USD: 'United States Dollar',
  VND: 'Vietnamese Đồng',
  ZAR: 'South African Rand',
}

function formatCurrencyLabel(code: string, currencyName: string) {
  const country = COUNTRY_BY_CURRENCY[code]
  return country ? `${country} — ${currencyName}` : currencyName
}

const FALLBACK_CURRENCIES: Record<string, string> = Object.fromEntries(
  Object.entries(RAW_FALLBACK_CURRENCIES).map(([code, currencyName]) => [code, formatCurrencyLabel(code, currencyName)]),
)

const CONVERTER_RANGES = [
  { key: '1D', label: '1D', days: 1 },
  { key: '5D', label: '5D', days: 5 },
  { key: '1M', label: '1M', days: 31 },
  { key: '1Y', label: '1Y', days: 365 },
  { key: '5Y', label: '5Y', days: 365 * 5 },
  { key: 'Max', label: 'Max', days: null as number | null },
]

type CurrencyApiLatest = {
  amount?: number
  base?: string
  date?: string
  rates?: Record<string, number>
}

type CurrencyApiSeries = {
  base?: string
  start_date?: string
  end_date?: string
  rates?: Record<string, Record<string, number>>
}

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10)

function subtractDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() - days)
  return next
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Request failed (${response.status})`)
  return response.json() as Promise<T>
}

const CATEGORY_EMOJIS = [
  "🛒","🍔","☕","🏠","🚗","⛽","🚌","✈️","🎬","🎮","🎵","📚","💼","💡","📱","💻","🧾","💳","🎁","💄","🏥","💊","🏋️","⚽","🐶","👶","❤️","🌴","📦","🔧","🛡️","🏷️"
]

function renderPieEmojiLabel(props: { cx?: number; cy?: number; midAngle?: number; innerRadius?: number; outerRadius?: number; percent?: number; payload?: { emoji?: string } }) {
  const { cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0, payload } = props
  if (percent < 0.08) return null
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55
  const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180))
  const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180))
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={22}>
      {payload?.emoji ?? '🏷️'}
    </text>
  )
}


function useIsPhone() {
  const [isPhone, setIsPhone] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 640 : false))

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 640px)')
    const onChange = () => setIsPhone(mediaQuery.matches)
    onChange()
    if ('addEventListener' in mediaQuery) {
      mediaQuery.addEventListener('change', onChange)
      return () => mediaQuery.removeEventListener('change', onChange)
    }
    mediaQuery.addListener(onChange)
    return () => mediaQuery.removeListener(onChange)
  }, [])

  return isPhone
}



declare global {
  interface Window {
    Tawk_API?: {
      maximize?: () => void
      toggle?: () => void
      hideWidget?: () => void
      showWidget?: () => void
      onLoad?: () => void
      visitor?: Record<string, unknown>
    }
    Tawk_LoadStart?: Date
    __fintrackrTawkLoaded?: boolean
  }
}

const TAWK_PROPERTY_ID = (import.meta as any).env?.VITE_TAWK_PROPERTY_ID || 'YOUR_TAWK_PROPERTY_ID'
const TAWK_WIDGET_ID = (import.meta as any).env?.VITE_TAWK_WIDGET_ID || 'YOUR_TAWK_WIDGET_ID'
const TAWK_ENABLED =
  !!TAWK_PROPERTY_ID &&
  !!TAWK_WIDGET_ID &&
  TAWK_PROPERTY_ID !== 'YOUR_TAWK_PROPERTY_ID' &&
  TAWK_WIDGET_ID !== 'YOUR_TAWK_WIDGET_ID'

function loadTawkWidget() {
  if (!TAWK_ENABLED || typeof window === 'undefined') return
  if (window.__fintrackrTawkLoaded) return

  window.Tawk_API = window.Tawk_API || {}
  window.Tawk_LoadStart = new Date()

  const script = document.createElement('script')
  script.async = true
  script.src = `https://embed.tawk.to/${TAWK_PROPERTY_ID}/${TAWK_WIDGET_ID}`
  script.charset = 'UTF-8'
  script.setAttribute('crossorigin', '*')
  script.dataset.fintrackrTawk = 'true'
  document.head.appendChild(script)
  window.__fintrackrTawkLoaded = true
}


export function DashboardView({ budget, theme }: Pick<SharedProps, 'budget' | 'theme'>) {
  const { data, months, activeMonth, setActiveMonth, income, expenses, net, byCategory, daily, monthlyTrend, sortedCategories, upcomingRecurringThisMonth, helpers } = budget
  const isPhone = useIsPhone()
  const chartBar = theme === 'dark' ? '#60a5fa' : '#2563eb'
  const dashboardMonths = months.length ? months : [activeMonth]
  const chartGrid = theme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.10)'
  const chartAxis = theme === 'dark' ? 'rgba(226,232,240,.78)' : 'rgba(51,65,85,.82)'
  const trendThisYear = theme === 'dark' ? '#dbe3ff' : '#2f3b66'
  const trendLastYear = theme === 'dark' ? 'rgba(219,227,255,0.36)' : 'rgba(148,163,184,0.65)'
  const trendBar = theme === 'dark' ? 'rgba(219,227,255,0.14)' : 'rgba(99,102,241,0.12)'
  const trendTooltipBg = theme === 'dark' ? 'rgba(9,18,39,0.94)' : 'rgba(255,255,255,0.98)'
  const trendTooltipBorder = theme === 'dark' ? 'rgba(148,163,184,0.25)' : 'rgba(148,163,184,0.32)'
  const trendTooltipText = theme === 'dark' ? '#f8fafc' : '#1e293b'

  return (
    <div className="grid cols2">
      <div className="card">
        <div className="row space" style={{ marginBottom: 10 }}>
          <div>
            <div className="h1">Dashboard</div>
            <small>Month: {helpers.monthLabel(activeMonth)}</small>
          </div>
          <select className="select" style={{ maxWidth: 220 }} value={activeMonth} onChange={(event) => setActiveMonth(event.target.value)}>
            {dashboardMonths.map((month) => <option key={month} value={month}>{helpers.monthLabel(month)}</option>)}
          </select>
        </div>

        <div className="grid cols3" style={{ marginBottom: 14 }}>
          <div className="kpi income"><span>Income</span><strong>{helpers.fmtMoney(income, data.currency)}</strong></div>
          <div className="kpi expenses"><span>Expenses</span><strong>{helpers.fmtMoney(expenses, data.currency)}</strong></div>
          <div className="kpi net"><span>Net</span><strong>{helpers.fmtMoney(net, data.currency)}</strong></div>
        </div>

        <div className="grid cols2">
          <div className="card" style={{ background: 'rgba(255,255,255,.02)' }}>
            <h3>Spending by category</h3>
            <div style={{ height: isPhone ? 220 : 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCategory}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} height={60} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => helpers.fmtMoney(Number(value), data.currency)} />
                  {isPhone ? null : <Legend />}
                  <Bar dataKey="total" name="Spent" fill={chartBar} radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card" style={{ background: 'rgba(255,255,255,.02)' }}>
            <h3>Share of spending</h3>
            <div style={{ height: isPhone ? 220 : 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byCategory}
                    dataKey="total"
                    nameKey="name"
                    outerRadius={95}
                    labelLine={false}
                    label={renderPieEmojiLabel}
                  >
                    {byCategory.map((row) => <Cell key={row.id} fill={row.color} />)}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => helpers.fmtMoney(Number(value), data.currency)}
                    labelFormatter={(_, payload) => {
                      const row = payload?.[0]?.payload
                      return row ? `${row.emoji ?? '🏷️'} ${row.name}` : ''
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card" style={{ background: theme === 'dark' ? 'rgba(255,255,255,.02)' : 'rgba(255,255,255,0.78)', marginTop: 14 }}>
          <div className="row space" style={{ alignItems: 'center', marginBottom: 8 }}>
            <h3 style={{ marginBottom: 0 }}>Monthly spending trends</h3>
            {isPhone ? null : (
              <div className="row" style={{ gap: 20, color: theme === 'dark' ? 'rgba(226,232,240,.82)' : 'rgba(51,65,85,.82)', fontSize: 12, fontWeight: 600 }}>
                <span className="row" style={{ gap: 8 }}><span style={{ width: 20, height: 4, borderRadius: 999, background: trendThisYear, display: 'inline-block' }} />This year</span>
                <span className="row" style={{ gap: 8 }}><span style={{ width: 20, height: 4, borderRadius: 999, background: trendLastYear, display: 'inline-block' }} />Last year</span>
              </div>
            )}
          </div>
          <div style={{ height: isPhone ? 240 : 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyTrend} margin={{ top: 14, right: 16, left: 8, bottom: 10 }}>
                <CartesianGrid vertical={false} strokeDasharray="4 6" stroke={chartGrid} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: chartAxis, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: chartAxis, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                  tickFormatter={(value: number) => {
                    if (value >= 1000) return `$${Math.round(value / 1000)}K`
                    return `$${Math.round(value)}`
                  }}
                />
                <Tooltip
                  contentStyle={{
                    background: trendTooltipBg,
                    border: `1px solid ${trendTooltipBorder}`,
                    borderRadius: 14,
                    boxShadow: '0 16px 30px rgba(0,0,0,.28)',
                  }}
                  labelStyle={{ color: trendTooltipText, fontWeight: 700, marginBottom: 8 }}
                  formatter={(value: number, name: string) => [helpers.fmtMoney(Number(value), data.currency), name === 'thisYear' ? 'This year' : name === 'lastYear' ? 'Last year' : 'Current month']}
                />
                <Bar dataKey="highlight" fill={trendBar} radius={[12, 12, 0, 0]} barSize={isPhone ? 24 : 44} />
                <Line
                  type="monotone"
                  dataKey="thisYear"
                  stroke={trendThisYear}
                  strokeWidth={4}
                  dot={{ r: 0 }}
                  activeDot={{ r: 7, fill: trendThisYear, stroke: theme === 'dark' ? '#0b1730' : '#ffffff', strokeWidth: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="lastYear"
                  stroke={trendLastYear}
                  strokeWidth={4}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid dashboardRightCol" style={{ gap: 14 }}>
        <div className="card">
          <div className="row space" style={{ marginBottom: 10 }}>
            <h3 style={{ marginBottom: 0 }}>Budgets (this month)</h3>
            <span className="badge">Top 4 visible • scroll for more</span>
          </div>
          <div className="grid budgetScrollArea" style={{ gap: 10 }}>
            {sortedCategories.map((category) => {
              const spent = byCategory.find((row) => row.id === category.id)?.total ?? 0
              const budgetAmount = Number(category.budget_monthly ?? 0)
              const progress = budgetAmount > 0 ? Math.min(1, spent / budgetAmount) : 0
              const overBudget = budgetAmount > 0 && spent > budgetAmount
              return (
                <div key={category.id} className="card budgetItemCard" style={{ background: 'rgba(255,255,255,.02)' }}>
                  <div className="row space" style={{ marginBottom: 8 }}>
                    <span className="badge">
                      <span className="dot" style={{ background: category.color ?? '#94a3b8' }} />
                      <span>{category.emoji ?? '🏷️'}</span>
                      {category.name}
                    </span>
                    <span className="badge">{helpers.fmtMoney(spent, data.currency)} / {helpers.fmtMoney(budgetAmount, data.currency)}</span>
                  </div>
                  <div className="progress" title={overBudget ? 'Over budget' : 'On track'}>
                    <div style={{ width: `${progress * 100}%`, background: overBudget ? 'var(--danger)' : 'var(--accent)' }} />
                  </div>
                  {overBudget ? <small className="budgetOverBudget" style={{ color: 'var(--danger)' }}>Over budget</small> : null}
                </div>
              )
            })}
          </div>
        </div>

        <div className="card">
          <div className="row between" style={{ marginBottom: 10 }}>
            <div>
              <h3 style={{ marginBottom: 4 }}>Recurring</h3>
              <div className="h1" style={{ fontSize: 28, marginBottom: 0 }}>{upcomingRecurringThisMonth.length} upcoming this month</div>
            </div>
            <span className="badge">This month</span>
          </div>
          <div className="grid recurringScrollArea" style={{ gap: 8 }}>
            {upcomingRecurringThisMonth.length === 0 ? (
              <div className="muted recurringEmpty">No recurring bills or income are still due this month.</div>
            ) : upcomingRecurringThisMonth.map((item) => (
              <div key={item.id} className="recurringUpcomingItem">
                <div className="recurringUpcomingMain">
                  <div className="recurringUpcomingIcon">{item.category?.emoji ?? (item.kind === 'income' ? '💰' : '📆')}</div>
                  <div>
                    <div className="recurringUpcomingTitle">{item.name}</div>
                    <div className="muted">{item.category?.name ?? (item.kind === 'income' ? 'Recurring income' : 'Recurring bill')} • {item.kind === 'income' ? 'Income' : 'Expense'} • {item.recurrenceLabel} • {new Date(`${item.dueDateIso}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                  </div>
                </div>
                <div className="recurringUpcomingAmount">
                  <strong style={{ color: item.kind === 'income' ? 'var(--accent)' : undefined }}>{item.kind === 'income' ? '+' : ''}{helpers.fmtMoney(Number(item.amount ?? 0), data.currency)}</strong>
                  <small>in {item.daysAway} day{item.daysAway === 1 ? '' : 's'}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function TransactionsView({ budget }: Pick<SharedProps, 'budget'>) {
  const { data, categories, txDraft, setTxDraft, txSearch, setTxSearch, txType, setTxType, filteredTx, deleteTx, addTransaction, saveTransactions, transactionDirty, helpers, catsById } = budget
  const isPhone = useIsPhone()
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="card mobileSectionCard">
      <div className="row between">
        <div>
          <h2>Transactions</h2>
          <div className="muted">Add, search, and manage your monthly transactions.</div>
        </div>
      </div>

      <div className="row gap txAddRow" style={{ marginTop: 12 }}>
        <div className="field txField">
          <label>Date</label>
          <input value={txDraft.date} onChange={(event) => setTxDraft((current) => ({ ...current, date: event.target.value }))} type="date" max={data.settings.allowTxnInFutureDate ? undefined : today} />
        </div>

        <div className="field txField">
          <label>Type</label>
          <select value={txDraft.type} onChange={(event) => setTxDraft((current) => ({ ...current, type: event.target.value as TxType }))}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>

        <div className="field txField">
          <label>Category</label>
          <select
            value={txDraft.category_id}
            onChange={(event) => setTxDraft((current) => ({ ...current, category_id: event.target.value }))}
            disabled={txDraft.type === 'income'}
          >
            <option value="">Uncategorized</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field txField">
          <label>Amount</label>
          <input
            inputMode="decimal"
            placeholder="0.00"
            value={txDraft.amount}
            onChange={(event) => setTxDraft((current) => ({ ...current, amount: event.target.value }))}
          />
        </div>

        <div className="field txField txGrow">
          <label>Note</label>
          <input placeholder="Optional note" value={txDraft.note} onChange={(event) => setTxDraft((current) => ({ ...current, note: event.target.value }))} />
        </div>

        <button className="btn primary" onClick={() => addTransaction()}>
          <Plus size={16} /> Add
        </button>
      </div>

      <div className="row between txFilterRow" style={{ marginTop: 14, gap: 12 }}>
        <div className="row gap txFilterInner">
          <div className="field txField txGrow">
            <label>Search</label>
            <div className="input-icon">
              <Search size={16} />
              <input value={txSearch} onChange={(event) => setTxSearch(event.target.value)} placeholder="Search by note, category, amount…" />
            </div>
          </div>

          <div className="field txField">
            <label>Filter</label>
            <select value={txType} onChange={(event) => setTxType(event.target.value as 'all' | TxType)}>
              <option value="all">All</option>
              <option value="expense">Expenses</option>
              <option value="income">Income</option>
            </select>
          </div>
        </div>

        <div className="muted">{filteredTx.length} item(s)</div>
      </div>

      {isPhone ? (
        <div className="mobileList" style={{ marginTop: 12 }}>
          {filteredTx.length === 0 ? <div className="muted mobileEmptyCard">No transactions found.</div> : filteredTx.map((transaction) => {
            const categoryName = transaction.category_id ? catsById.get(transaction.category_id)?.name ?? 'Unknown' : 'Uncategorized'
            return (
              <div key={transaction.id} className="mobileInfoCard">
                <div className="row between" style={{ gap: 10, alignItems: 'flex-start' }}>
                  <div>
                    <div className="mobileCardTitle">{categoryName}</div>
                    <div className="muted">{transaction.note?.trim() || 'No note'}</div>
                  </div>
                  <button className="icon danger" onClick={() => void deleteTx(transaction.id)} title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="mobileMetaRow">
                  <span className="badge">{transaction.date}</span>
                  <span className="badge" style={{ textTransform: 'capitalize' }}>{transaction.type}</span>
                </div>
                <div className="mobileAmountRow">{helpers.fmtMoney(transaction.amount, data.currency)}</div>
              </div>
            )
          })}
        </div>
      ) : (
      <div style={{ marginTop: 12, overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 120 }}>Date</th>
              <th style={{ width: 90 }}>Type</th>
              <th>Category</th>
              <th style={{ width: 140, textAlign: 'right' }}>Amount</th>
              <th>Note</th>
              <th style={{ width: 70 }} />
            </tr>
          </thead>
          <tbody>
            {filteredTx.map((transaction) => {
              const categoryName = transaction.category_id ? catsById.get(transaction.category_id)?.name ?? 'Unknown' : 'Uncategorized'
              return (
                <tr key={transaction.id}>
                  <td>{transaction.date}</td>
                  <td style={{ textTransform: 'capitalize' }}>{transaction.type}</td>
                  <td>{categoryName}</td>
                  <td style={{ textAlign: 'right' }}>{helpers.fmtMoney(transaction.amount, data.currency)}</td>
                  <td className="muted">{transaction.note ?? ''}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="icon danger" onClick={() => void deleteTx(transaction.id)} title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              )
            })}
            {filteredTx.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted" style={{ padding: 18, textAlign: 'center' }}>
                  No transactions found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>)}
      <div className="row between" style={{ marginTop: 16, alignItems: 'center', gap: 12 }}>
        <div className="muted">{transactionDirty ? 'You have unsaved transaction changes.' : 'All transaction changes are saved.'}</div>
        <button className="btn primary" onClick={() => void saveTransactions()} disabled={!transactionDirty}>
          Update Transactions
        </button>
      </div>
    </div>
  )
}

export function CategoriesView({ budget }: Pick<SharedProps, 'budget'>) {
  const { sortedCategories, addCategory, updateCategoryField, deleteCategory, saveCategories, categoryDirty } = budget
  const isPhone = useIsPhone()
  const [pickerFor, setPickerFor] = React.useState<string | null>(null)
  const activeCategory = React.useMemo(() => sortedCategories.find((category) => category.id === pickerFor) ?? null, [sortedCategories, pickerFor])

  return (
    <div className="card">
      <div className="row between">
        <div>
          <h2>Categories</h2>
          <div className="muted">Budgets are monthly. Pick an emoji to make each category easier to spot.</div>
        </div>
        <button className="btn primary" onClick={() => addCategory()}>
          <Plus size={16} /> Add
        </button>
      </div>

      {isPhone ? (
        <div className="mobileList" style={{ marginTop: 12 }}>
          {sortedCategories.length === 0 ? <div className="muted mobileEmptyCard">No categories yet.</div> : sortedCategories.map((category: Category) => (
            <div key={category.id} className="mobileInfoCard">
              <div className="row between" style={{ alignItems: 'center', gap: 10 }}>
                <button className="emojiChip" onClick={() => setPickerFor(category.id)} title="Choose emoji">
                  <span className="emojiChipIcon">{category.emoji ?? '🏷️'}</span>
                  <span className="emojiChipLabel">Emoji</span>
                </button>
                <button className="icon danger" onClick={() => deleteCategory(category.id)} title="Delete"><Trash2 size={16} /></button>
              </div>
              <div className="goalFields compact" style={{ marginTop: 12 }}>
                <div>
                  <small>Name</small>
                  <input className="input" value={category.name} onChange={(event) => updateCategoryField(category.id, 'name', event.target.value)} />
                </div>
                <div>
                  <small>Monthly budget</small>
                  <input className="input" inputMode="decimal" value={String(category.budget_monthly ?? 0)} onChange={(event) => updateCategoryField(category.id, 'budget_monthly', event.target.value)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
      <div style={{ marginTop: 12, overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 110 }}>Emoji</th>
              <th>Name</th>
              <th style={{ width: 180 }}>Monthly Budget</th>
              <th style={{ width: 70 }} />
            </tr>
          </thead>
          <tbody>
            {sortedCategories.map((category: Category) => {
              return (
                <tr key={category.id}>
                  <td>
                    <button className="emojiChip" onClick={() => setPickerFor(category.id)} title="Choose emoji">
                      <span className="emojiChipIcon">{category.emoji ?? '🏷️'}</span>
                      <span className="emojiChipLabel">Pick</span>
                    </button>
                  </td>
                  <td>
                    <input
                      className="input"
                      value={category.name}
                      onChange={(event) => updateCategoryField(category.id, 'name', event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="input"
                      inputMode="decimal"
                      value={String(category.budget_monthly ?? 0)}
                      onChange={(event) => updateCategoryField(category.id, 'budget_monthly', event.target.value)}
                    />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="icon danger" onClick={() => deleteCategory(category.id)} title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              )
            })}
            {sortedCategories.length === 0 ? (
              <tr>
                <td colSpan={4} className="muted" style={{ padding: 18, textAlign: 'center' }}>
                  No categories yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>)}
      <div className="row between" style={{ marginTop: 16, alignItems: 'center', gap: 12 }}>
        <div className="muted">{categoryDirty ? 'You have unsaved category changes.' : 'All category changes are saved.'}</div>
        <button className="btn primary" onClick={() => void saveCategories()} disabled={!categoryDirty}>
          Update Categories
        </button>
      </div>

      {pickerFor && activeCategory ? (
        <div className="emojiPickerOverlay" onClick={() => setPickerFor(null)}>
          <div className="emojiPickerModal" onClick={(event) => event.stopPropagation()}>
            <div className="row between" style={{ marginBottom: 10 }}>
              <div>
                <div className="h1" style={{ fontSize: 18, marginBottom: 4 }}>Choose category emoji</div>
                <small>{activeCategory.name || 'New Category'}</small>
              </div>
              <button className="btn ghost" onClick={() => setPickerFor(null)}>Close</button>
            </div>
            <div className="emojiPreview">
              <span className="emojiPreviewBubble" style={{ background: activeCategory.color ?? '#334155' }}>{activeCategory.emoji ?? '🏷️'}</span>
              <div>
                <strong>{activeCategory.name || 'New Category'}</strong>
                <div className="muted">This emoji will appear in categories, transactions, and the dashboard pie chart.</div>
              </div>
            </div>
            <div className="emojiGrid">
              {CATEGORY_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  className={`emojiOption ${activeCategory.emoji === emoji ? 'selected' : ''}`}
                  onClick={() => {
                    updateCategoryField(activeCategory.id, 'emoji', emoji)
                    setPickerFor(null)
                  }}
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}


export function GoalsView({ budget }: Pick<SharedProps, 'budget'>) {
  const { sortedGoals, addGoal, updateGoalField, contributeToGoal, deleteGoal, saveGoals, goalDirty, helpers, data } = budget
  const isPhone = useIsPhone()
  const [contributions, setContributions] = useState<Record<string, string>>({})
  const [collapsedGoals, setCollapsedGoals] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setCollapsedGoals((current) => {
      const next: Record<string, boolean> = {}
      for (const goal of sortedGoals) next[goal.id] = current[goal.id] ?? true
      return next
    })
  }, [sortedGoals, isPhone])

  const totalTarget = sortedGoals.reduce((sum, goal) => sum + Number(goal.target_amount || 0), 0)
  const totalSaved = sortedGoals.reduce((sum, goal) => sum + Number(goal.current_amount || 0), 0)

  const applyContribution = (goalId: string) => {
    const raw = contributions[goalId] ?? ''
    const amount = Number(raw)
    if (!Number.isFinite(amount) || amount <= 0) return
    contributeToGoal(goalId, amount)
    setContributions((current) => ({ ...current, [goalId]: '' }))
  }

  const toggleGoalCollapsed = (goalId: string) => {
    setCollapsedGoals((current) => ({ ...current, [goalId]: !current[goalId] }))
  }

  return (
    <div className="card">
      <div className="row between" style={{ alignItems: 'flex-start', gap: 12 }}>
        <div>
          <h2>Goals</h2>
          <div className="muted">Create custom goals like savings, retirement, a new car, or a vacation. Add emojis, set a target, and track progress as you contribute.</div>
        </div>
        <button className="btn primary" onClick={() => addGoal()}>
          <Plus size={16} /> Add Goal
        </button>
      </div>

      <div className="grid cols3" style={{ marginTop: 14, marginBottom: 14 }}>
        <div className="kpi net"><span>Total target</span><strong>{helpers.fmtMoney(totalTarget, data.currency)}</strong></div>
        <div className="kpi income"><span>Total saved</span><strong>{helpers.fmtMoney(totalSaved, data.currency)}</strong></div>
        <div className="kpi expenses"><span>Remaining</span><strong>{helpers.fmtMoney(Math.max(totalTarget - totalSaved, 0), data.currency)}</strong></div>
      </div>

      <div className="goalGrid">
        {sortedGoals.map((goal) => {
          const targetAmount = Number(goal.target_amount || 0)
          const currentAmount = Number(goal.current_amount || 0)
          const progress = targetAmount > 0 ? Math.min(100, Math.round((currentAmount / targetAmount) * 100)) : 0
          const isCollapsed = !!collapsedGoals[goal.id]
          return (
            <div key={goal.id} className={`goalCard${isCollapsed ? ' collapsed' : ''}`}>
              <div className="row between goalHeaderRow" style={{ alignItems: 'flex-start', gap: 12 }}>
                <div className="row goalHeaderMain" style={{ gap: 12, alignItems: 'center' }}>
                  <div className="goalEmojiBadge">{goal.emoji || '🎯'}</div>
                  <div>
                    <div className="goalTitle">{goal.name || 'Untitled goal'}</div>
                    <div className="muted">{helpers.fmtMoney(currentAmount, data.currency)} saved of {helpers.fmtMoney(targetAmount, data.currency)}</div>
                  </div>
                </div>
                <div className="row goalHeaderActions" style={{ gap: 8, alignItems: 'center' }}>
                  <button className="icon" onClick={() => toggleGoalCollapsed(goal.id)} title={isCollapsed ? 'Expand goal' : 'Collapse goal'}>
                    {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                  </button>
                  <button className="icon danger" onClick={() => deleteGoal(goal.id)} title="Delete goal">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="goalProgressSummary" style={{ marginTop: 12 }}>
                <div className="row between goalProgressMeta" style={{ marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
                  <span className="badge">{progress}% complete</span>
                  {goal.target_date ? <span className="badge">Target {new Date(`${goal.target_date}T00:00:00`).toLocaleDateString()}</span> : null}
                </div>
                <div className="progress">
                  <div style={{ width: `${progress}%`, background: 'linear-gradient(90deg, rgba(34,197,94,.95), rgba(59,130,246,.95))' }} />
                </div>
              </div>

              {!isCollapsed ? (
                <>
                  <div className="goalFields">
                    <div>
                      <small>Name</small>
                      <input className="input" value={goal.name} onChange={(event) => updateGoalField(goal.id, 'name', event.target.value)} placeholder="Goal name" />
                    </div>
                    <div>
                      <small>Emoji</small>
                      <select className="select" value={goal.emoji || '🎯'} onChange={(event) => updateGoalField(goal.id, 'emoji', event.target.value)}>
                        {CATEGORY_EMOJIS.map((emoji) => <option key={emoji} value={emoji}>{emoji}</option>)}
                      </select>
                    </div>
                    <div>
                      <small>Target amount</small>
                      <input className="input" inputMode="decimal" value={goal.target_amount} onChange={(event) => updateGoalField(goal.id, 'target_amount', event.target.value)} placeholder="0.00" />
                    </div>
                    <div>
                      <small>Saved so far</small>
                      <input className="input" inputMode="decimal" value={goal.current_amount} onChange={(event) => updateGoalField(goal.id, 'current_amount', event.target.value)} placeholder="0.00" />
                    </div>
                    <div>
                      <small>Target date</small>
                      <input className="input" type="date" value={goal.target_date ?? ''} onChange={(event) => updateGoalField(goal.id, 'target_date', event.target.value)} />
                    </div>
                    <div>
                      <small>Quick contribution</small>
                      <div className="goalContributionRow">
                        <input className="input" inputMode="decimal" value={contributions[goal.id] ?? ''} onChange={(event) => setContributions((current) => ({ ...current, [goal.id]: event.target.value }))} placeholder="0.00" />
                        <button className="btn" onClick={() => applyContribution(goal.id)}>Add</button>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <small>Note</small>
                    <textarea className="input" rows={3} value={goal.note ?? ''} onChange={(event) => updateGoalField(goal.id, 'note', event.target.value)} placeholder="Optional note" />
                  </div>
                </>
              ) : null}
            </div>
          )
        })}
      </div>

      {sortedGoals.length === 0 ? <div className="muted" style={{ marginTop: 16 }}>No goals yet. Add one to start tracking progress.</div> : null}

      <div className="row between recurringSummaryRow" style={{ marginTop: 16, alignItems: 'center', gap: 12 }}>
        <div className="muted">{goalDirty ? 'You have unsaved goal changes.' : 'All goal changes are saved.'}</div>
        <div className="badge">Progress {totalTarget > 0 ? `${Math.min(100, Math.round((totalSaved / totalTarget) * 100))}%` : '0%'}</div>
        <button className="btn primary" onClick={() => void saveGoals()} disabled={!goalDirty}>Update Goals</button>
      </div>
    </div>
  )
}


export function CurrencyConverterView({ budget, theme }: Pick<SharedProps, 'budget' | 'theme'>) {
  const primaryCurrency = budget.data.currency || 'CAD'
  const [amount, setAmount] = useState('1')
  const [fromCurrency, setFromCurrency] = useState(primaryCurrency)
  const [toCurrency, setToCurrency] = useState(primaryCurrency === 'USD' ? 'CAD' : 'USD')
  const [currencyMap, setCurrencyMap] = useState<Record<string, string>>(FALLBACK_CURRENCIES)
  const [latestRate, setLatestRate] = useState<number | null>(null)
  const [latestDate, setLatestDate] = useState('')
  const [chartPoints, setChartPoints] = useState<Array<{ date: string; rate: number }>>([])
  const [rangeKey, setRangeKey] = useState('1M')
  const [loading, setLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (toCurrency === fromCurrency) {
      const fallback = Object.keys(currencyMap).find((code) => code !== fromCurrency) || 'USD'
      setToCurrency(fallback)
    }
  }, [fromCurrency, toCurrency, currencyMap])

  useEffect(() => {
    let cancelled = false
    fetchJson<Record<string, string>>('https://api.frankfurter.dev/v1/currencies')
      .then((result) => {
        if (!cancelled && result && Object.keys(result).length > 0) {
          const normalized = Object.fromEntries(
            Object.entries(result).map(([code, currencyName]) => [code, formatCurrencyLabel(code, currencyName)]),
          )
          setCurrencyMap((current) => ({ ...current, ...normalized }))
        }
      })
      .catch(() => {
        // fallback list is enough if this fails
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const loadLatest = async () => {
      setLoading(true)
      setError('')
      try {
        const latest = await fetchJson<CurrencyApiLatest>(`https://api.frankfurter.dev/v1/latest?base=${fromCurrency}&symbols=${toCurrency}`)
        const rate = latest.rates?.[toCurrency]
        if (!rate) throw new Error('Conversion rate unavailable right now.')
        if (!cancelled) {
          setLatestRate(rate)
          setLatestDate(latest.date ?? '')
        }
      } catch (err) {
        if (!cancelled) {
          setLatestRate(null)
          setError(err instanceof Error ? err.message : 'Could not load the latest exchange rate.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadLatest()
    return () => {
      cancelled = true
    }
  }, [fromCurrency, toCurrency])

  useEffect(() => {
    let cancelled = false
    const loadSeries = async () => {
      setChartLoading(true)
      setError('')
      try {
        const selectedRange = CONVERTER_RANGES.find((item) => item.key === rangeKey)
        const end = new Date()
        const start = selectedRange?.days == null ? new Date('1999-01-04') : subtractDays(end, selectedRange.days)
        const url = `https://api.frankfurter.dev/v1/${toIsoDate(start)}..${toIsoDate(end)}?base=${fromCurrency}&symbols=${toCurrency}`
        const series = await fetchJson<CurrencyApiSeries>(url)
        const points = Object.entries(series.rates ?? {})
          .map(([date, rates]) => ({ date, rate: Number(rates[toCurrency] ?? 0) }))
          .filter((item) => Number.isFinite(item.rate) && item.rate > 0)
          .sort((a, b) => a.date.localeCompare(b.date))
        if (!cancelled) setChartPoints(points)
      } catch (err) {
        if (!cancelled) {
          setChartPoints([])
          setError(err instanceof Error ? err.message : 'Could not load exchange history.')
        }
      } finally {
        if (!cancelled) setChartLoading(false)
      }
    }
    void loadSeries()
    return () => {
      cancelled = true
    }
  }, [fromCurrency, toCurrency, rangeKey])

  const numericAmount = Number(amount)
  const safeAmount = Number.isFinite(numericAmount) ? numericAmount : 0
  const convertedAmount = latestRate == null ? null : safeAmount * latestRate

  const currencyOptions = useMemo(
    () => Object.entries(currencyMap).sort((a, b) => a[0].localeCompare(b[0])),
    [currencyMap],
  )

  const fromLabel = currencyMap[fromCurrency] ?? fromCurrency
  const toLabel = currencyMap[toCurrency] ?? toCurrency
  const headlineAmount = convertedAmount == null ? '—' : new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(convertedAmount)
  const chartStroke = theme === 'dark' ? '#f87171' : '#dc2626'
  const chartFill = theme === 'dark' ? 'rgba(248, 113, 113, 0.22)' : 'rgba(220, 38, 38, 0.15)'

  return (
    <div className="grid cols2 converterGrid">
      <div className="card converterCard">
        <div className="converterOverline">Live exchange conversion</div>
        <div className="converterHeadline">
          {loading ? 'Loading…' : `${headlineAmount} ${toLabel}`}
        </div>
        <div className="muted" style={{ marginBottom: 18 }}>
          {safeAmount} {fromLabel} · {latestDate ? `Rates date: ${latestDate}` : 'Latest working day'}
        </div>

        <div className="converterFields">
          <label>
            <small>Amount</small>
            <input className="input" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Enter amount" />
          </label>
          <label>
            <small>From</small>
            <select className="select" value={fromCurrency} onChange={(event) => setFromCurrency(event.target.value)}>
              {currencyOptions.map(([code, label]) => (
                <option key={code} value={code}>{code} — {label}</option>
              ))}
            </select>
          </label>
          <label>
            <small>Converted</small>
            <input className="input" value={convertedAmount == null ? '' : convertedAmount.toFixed(2)} readOnly />
          </label>
          <label>
            <small>To</small>
            <select className="select" value={toCurrency} onChange={(event) => setToCurrency(event.target.value)}>
              {currencyOptions.filter(([code]) => code !== fromCurrency).map(([code, label]) => (
                <option key={code} value={code}>{code} — {label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="converterSwapRow">
          <button className="btn" onClick={() => { setFromCurrency(toCurrency); setToCurrency(fromCurrency) }}>
            Swap currencies
          </button>
          <span className="pill">
            1 {fromCurrency} = {latestRate == null ? '—' : latestRate.toFixed(4)} {toCurrency}
          </span>
        </div>

        {error ? <div className="converterError">{error}</div> : null}
      </div>

      <div className="card converterCard converterChartCard">
        <div className="row between" style={{ alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <div>
            <div className="h1" style={{ marginBottom: 4 }}>Rate trend</div>
            <small>{fromCurrency} to {toCurrency}</small>
          </div>
          <div className="converterRangeButtons">
            {CONVERTER_RANGES.map((item) => (
              <button key={item.key} className={`rangeChip ${rangeKey === item.key ? 'active' : ''}`} onClick={() => setRangeKey(item.key)}>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartPoints}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={32} tickFormatter={(value: string) => {
                const date = new Date(`${value}T00:00:00`)
                return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
              }} />
              <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
              <Tooltip formatter={(value: number) => Number(value).toFixed(4)} labelFormatter={(value: string) => new Date(`${value}T00:00:00`).toLocaleDateString()} />
              <Area type="monotone" dataKey="rate" stroke={chartStroke} fill={chartFill} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="muted" style={{ marginTop: 10 }}>
          {chartLoading ? 'Loading chart…' : chartPoints.length > 0 ? `${chartPoints.length} data points loaded.` : 'No chart data available for this pair yet.'}
        </div>
      </div>
    </div>
  )
}


export function RecurringView({ budget }: Pick<SharedProps, 'budget'>) {
  const { categories, sortedRecurring, addRecurring, updateRecurringField, deleteRecurring, saveRecurring, recurringDirty, helpers, data } = budget
  const isPhone = useIsPhone()
  const recurrenceOptions: Array<{ value: RecurrenceType; label: string }> = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'biweekly', label: 'Bi-weekly' },
  ]

  const recurringKindOptions: Array<{ value: RecurringKind; label: string }> = [
    { value: 'expense', label: 'Expense' },
    { value: 'income', label: 'Income' },
  ]

  return (
    <div className="card">
      <div className="row between">
        <div>
          <h2>Recurring</h2>
          <div className="muted">Add recurring bills or recurring income and choose whether they repeat monthly, weekly, or every 2 weeks so the dashboard can show what is coming up this month.</div>
        </div>
        <button className="btn primary" onClick={() => addRecurring()}>
          <Plus size={16} /> Add
        </button>
      </div>

      {isPhone ? (
        <div className="mobileList" style={{ marginTop: 12 }}>
          {sortedRecurring.length === 0 ? <div className="muted mobileEmptyCard">No recurring items yet.</div> : sortedRecurring.map((item) => {
            const recurrenceType = item.recurrence_type === 'weekly' || item.recurrence_type === 'biweekly' ? item.recurrence_type : 'monthly'
            return (
              <div key={item.id} className="mobileInfoCard recurringMobileCard">
                <div className="row between" style={{ gap: 10, alignItems: 'flex-start' }}>
                  <div>
                    <div className="mobileCardTitle">{item.name || 'Untitled recurring item'}</div>
                    <div className="muted">{item.kind === 'income' ? 'Income' : 'Expense'} • {recurrenceType === 'biweekly' ? 'Bi-weekly' : recurrenceType === 'weekly' ? 'Weekly' : 'Monthly'}</div>
                  </div>
                  <button className="icon danger" onClick={() => deleteRecurring(item.id)} title="Delete"><Trash2 size={16} /></button>
                </div>
                <div className="goalFields compact" style={{ marginTop: 12 }}>
                  <div><small>Name</small><input className="input" value={item.name} onChange={(event) => updateRecurringField(item.id, 'name', event.target.value)} placeholder="Bill name" /></div>
                  <div><small>Type</small><select className="select" value={item.kind} onChange={(event) => updateRecurringField(item.id, 'kind', event.target.value)}>{recurringKindOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
                  <div><small>Category</small><select className="select" value={item.category_id ?? ''} onChange={(event) => updateRecurringField(item.id, 'category_id', event.target.value)}><option value="">None</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.emoji ?? '🏷️'} {category.name}</option>)}</select></div>
                  <div><small>Amount</small><input className="input" inputMode="decimal" value={String(item.amount ?? '')} onChange={(event) => updateRecurringField(item.id, 'amount', event.target.value)} placeholder="0.00" /></div>
                  <div><small>Frequency</small><select className="select" value={recurrenceType} onChange={(event) => updateRecurringField(item.id, 'recurrence_type', event.target.value)}>{recurrenceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
                  {recurrenceType === 'monthly' ? <div><small>Day of month</small><input className="input" type="number" min={1} max={31} value={String(item.day_of_month ?? '')} onChange={(event) => updateRecurringField(item.id, 'day_of_month', event.target.value)} /></div> : <div><small>Anchor date</small><input className="input" type="date" value={item.anchor_date ?? ''} onChange={(event) => updateRecurringField(item.id, 'anchor_date', event.target.value)} /></div>}
                </div>
                <div style={{ marginTop: 12 }}><small>Note</small><input className="input" value={item.note ?? ''} onChange={(event) => updateRecurringField(item.id, 'note', event.target.value)} placeholder="Optional note" /></div>
              </div>
            )
          })}
        </div>
      ) : (
      <div style={{ marginTop: 12, overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th style={{ width: 140 }}>Type</th>
              <th style={{ width: 170 }}>Category</th>
              <th style={{ width: 140 }}>Amount</th>
              <th style={{ width: 160 }}>Frequency</th>
              <th style={{ width: 160 }}>Schedule</th>
              <th>Note</th>
              <th style={{ width: 70 }} />
            </tr>
          </thead>
          <tbody>
            {sortedRecurring.map((item) => {
              const recurrenceType = item.recurrence_type === 'weekly' || item.recurrence_type === 'biweekly' ? item.recurrence_type : 'monthly'
              return (
              <tr key={item.id}>
                <td>
                  <input className="input" value={item.name} onChange={(event) => updateRecurringField(item.id, 'name', event.target.value)} placeholder="Bill name" />
                </td>
                <td>
                  <select className="select" value={item.kind} onChange={(event) => updateRecurringField(item.id, 'kind', event.target.value)}>
                    {recurringKindOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </td>
                <td>
                  <select className="select" value={item.category_id ?? ''} onChange={(event) => updateRecurringField(item.id, 'category_id', event.target.value)}>
                    <option value="">None</option>
                    {categories.map((category) => <option key={category.id} value={category.id}>{category.emoji ?? '🏷️'} {category.name}</option>)}
                  </select>
                </td>
                <td>
                  <input className="input" inputMode="decimal" value={String(item.amount ?? '')} onChange={(event) => updateRecurringField(item.id, 'amount', event.target.value)} placeholder="0.00" />
                </td>
                <td>
                  <select className="select" value={recurrenceType} onChange={(event) => updateRecurringField(item.id, 'recurrence_type', event.target.value)}>
                    {recurrenceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </td>
                <td>
                  {recurrenceType === 'monthly' ? (
                    <input className="input" type="number" min={1} max={31} value={String(item.day_of_month ?? '')} onChange={(event) => updateRecurringField(item.id, 'day_of_month', event.target.value)} />
                  ) : (
                    <input className="input" type="date" value={item.anchor_date ?? ''} onChange={(event) => updateRecurringField(item.id, 'anchor_date', event.target.value)} />
                  )}
                </td>
                <td>
                  <input className="input" value={item.note ?? ''} onChange={(event) => updateRecurringField(item.id, 'note', event.target.value)} placeholder="Optional note" />
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button className="icon danger" onClick={() => deleteRecurring(item.id)} title="Delete"><Trash2 size={16} /></button>
                </td>
              </tr>
              )
            })}
            {sortedRecurring.length === 0 ? (
              <tr>
                <td colSpan={8} className="muted" style={{ padding: 18, textAlign: 'center' }}>No recurring items yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>)}
      <div className="row between recurringSummaryRow" style={{ marginTop: 16, alignItems: 'center', gap: 12 }}>
        <div className="muted">{recurringDirty ? 'You have unsaved recurring changes.' : 'All recurring changes are saved.'}</div>
        <div className="badge">Estimated monthly net {helpers.fmtMoney(sortedRecurring.reduce((sum, item) => {
          const frequency = item.recurrence_type === 'weekly' ? 4 : item.recurrence_type === 'biweekly' ? 2 : 1
          const signedAmount = Number(item.amount ?? 0) * frequency
          return sum + ((item.kind === 'income' ? 1 : -1) * signedAmount)
        }, 0), data.currency)}</div>
        <button className="btn primary" onClick={() => void saveRecurring()} disabled={!recurringDirty}>Update Recurring</button>
      </div>
    </div>
  )
}



const REPORT_COLORS = ['#2F80ED', '#F2994A', '#EB5757', '#56CCF2', '#27AE60', '#9B51E0', '#F2C94C']

function createReportCanvas(options: {
  appName: string
  reportTitle: string
  periodLabel: string
  generatedAt: string
  currency: string
  totals: { income: number; expenses: number; balance: number }
  overviewRows: { label: string; value: string }[]
  donutRows: { label: string; value: number }[]
  comboTitle: string
  comboRows: { label: string; income: number; expenses: number; line: number }[]
  comboLineLabel: string
  topCategories: { label: string; value: string }[]
  tableTitle: string
  tableHeaders: string[]
  tableRows: string[][]
  bottomBarTitle: string
  bottomBarRows: { label: string; income: number; expenses: number }[]
  bottomLineTitle: string
  bottomLineRows: { label: string; value: number }[]
  footerText: string
}) {
  const canvas = document.createElement('canvas')
  canvas.width = 1240
  canvas.height = 1754
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas context unavailable')

  const w = canvas.width
  const h = canvas.height

  const roundRect = (x: number, y: number, width: number, height: number, radius = 18, fill?: string, stroke?: string, lineWidth = 1) => {
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.arcTo(x + width, y, x + width, y + height, radius)
    ctx.arcTo(x + width, y + height, x, y + height, radius)
    ctx.arcTo(x, y + height, x, y, radius)
    ctx.arcTo(x, y, x + width, y, radius)
    ctx.closePath()
    if (fill) {
      ctx.fillStyle = fill
      ctx.fill()
    }
    if (stroke) {
      ctx.strokeStyle = stroke
      ctx.lineWidth = lineWidth
      ctx.stroke()
    }
  }

  const text = (value: string, x: number, y: number, font = '400 24px Inter, Arial, sans-serif', color = '#243B5A', align: CanvasTextAlign = 'left') => {
    ctx.font = font
    ctx.fillStyle = color
    ctx.textAlign = align
    ctx.fillText(value, x, y)
  }

  const line = (x1: number, y1: number, x2: number, y2: number, color = '#D6DEE8', width = 1) => {
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.strokeStyle = color
    ctx.lineWidth = width
    ctx.stroke()
  }

  const moneyColor = '#1A936F'
  const primary = '#284A73'
  const muted = '#6B7C93'
  const lightFill = '#F5F7FB'
  const lightStroke = '#D8DFEA'

  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, w, h)

  // Header
  const margin = 56
  roundRect(margin, 28, 50, 50, 12, '#2F80ED')
  roundRect(margin + 10, 42, 30, 20, 8, '#9FD0FF')
  text(options.appName, margin + 70, 62, '700 34px Inter, Arial, sans-serif', '#2A5C90')
  line(margin, 102, w - margin, 102)

  text(options.reportTitle, margin, 150, '700 34px Inter, Arial, sans-serif', primary)
  text(options.periodLabel, margin, 194, '500 26px Inter, Arial, sans-serif', muted)
  line(margin, 218, w - margin, 218)
  text(`Generated on: ${options.generatedAt}`, margin, 266, '500 18px Inter, Arial, sans-serif', '#4A5B73')

  // Summary cards
  const cardTop = 300
  const cardW = (w - margin * 2 - 20 * 2) / 3
  const summaries = [
    { title: 'Total Income', value: options.totals.income, color: primary },
    { title: 'Total Expenses', value: options.totals.expenses, color: primary },
    { title: 'Ending Balance', value: options.totals.balance, color: moneyColor },
  ]
  summaries.forEach((item, index) => {
    const x = margin + index * (cardW + 20)
    roundRect(x, cardTop, cardW, 92, 14, lightFill, '#E7ECF3')
    text(item.title, x + cardW / 2, cardTop + 34, '700 20px Inter, Arial, sans-serif', '#516580', 'center')
    text(new Intl.NumberFormat(undefined, { style: 'currency', currency: options.currency, maximumFractionDigits: 0 }).format(item.value), x + cardW / 2, cardTop + 72, '700 28px Inter, Arial, sans-serif', item.color, 'center')
  })

  line(margin, 412, w - margin, 412)

  // Monthly overview + donut
  const sectionTop = 448
  text('Monthly Overview', margin, sectionTop, '700 22px Inter, Arial, sans-serif', primary)
  text('Expense Breakdown', 640, sectionTop, '700 22px Inter, Arial, sans-serif', primary)

  roundRect(margin, sectionTop + 22, 510, 200, 16, lightFill, lightStroke)
  options.overviewRows.forEach((row, idx) => {
    const y = sectionTop + 74 + idx * 58
    if (idx > 0) line(margin + 20, y - 28, margin + 490, y - 28, '#E0E6EE')
    roundRect(margin + 20, y - 20, 28, 28, 8, '#2F80ED')
    text(row.label + ':', margin + 64, y, '600 18px Inter, Arial, sans-serif', primary)
    text(row.value, margin + 470, y, '700 22px Inter, Arial, sans-serif', idx === 2 ? moneyColor : primary, 'right')
  })

  roundRect(640, sectionTop + 22, 544, 308, 16, '#FFFFFF', '#FFFFFF')
  const donutX = 912
  const donutY = sectionTop + 176
  const outer = 120
  const inner = 64
  const donutTotal = Math.max(1, options.donutRows.reduce((sum, row) => sum + row.value, 0))
  let startAngle = -Math.PI / 2
  options.donutRows.slice(0, 6).forEach((row, idx) => {
    const angle = (row.value / donutTotal) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(donutX, donutY)
    ctx.arc(donutX, donutY, outer, startAngle, startAngle + angle)
    ctx.arc(donutX, donutY, inner, startAngle + angle, startAngle, true)
    ctx.closePath()
    ctx.fillStyle = REPORT_COLORS[idx % REPORT_COLORS.length]
    ctx.fill()

    const mid = startAngle + angle / 2
    const lx = donutX + Math.cos(mid) * 92
    const ly = donutY + Math.sin(mid) * 92
    const pct = `${Math.round((row.value / donutTotal) * 100)}%`
    text(pct, lx, ly, '700 16px Inter, Arial, sans-serif', '#FFFFFF', 'center')
    startAngle += angle
  })
  // white behind chart already; title already above.

  line(margin, 782, w - margin, 782)

  // combo chart + top categories
  const chartTop = 826
  text(options.comboTitle, margin, chartTop, '700 22px Inter, Arial, sans-serif', primary)
  roundRect(margin, chartTop + 28, 620, 252, 16, '#FFFFFF', '#FFFFFF')
  const chartX = margin + 48
  const chartY = chartTop + 228
  const chartW = 520
  const chartH = 150
  const comboMax = Math.max(1, ...options.comboRows.flatMap((row) => [row.income, row.expenses, row.line]))
  ;[0, 0.25, 0.5, 0.75, 1].forEach((step, idx) => {
    const y = chartY - chartH * step
    line(chartX, y, chartX + chartW, y, '#E3E8F0')
    text(`$${Math.round(comboMax * step / 1000)}K`, chartX - 18, y + 5, '500 14px Inter, Arial, sans-serif', muted, 'right')
  })
  options.comboRows.forEach((row, idx) => {
    const groupX = chartX + idx * (chartW / options.comboRows.length) + 22
    const incomeH = (row.income / comboMax) * chartH
    const expenseH = (row.expenses / comboMax) * chartH
    roundRect(groupX, chartY - incomeH, 28, incomeH, 8, '#2F80ED')
    roundRect(groupX + 38, chartY - expenseH, 28, expenseH, 8, '#F2994A')
    text(row.label, groupX + 32, chartY + 28, '500 14px Inter, Arial, sans-serif', primary, 'center')
  })
  // line
  ctx.beginPath()
  options.comboRows.forEach((row, idx) => {
    const px = chartX + idx * (chartW / options.comboRows.length) + 54
    const py = chartY - (row.line / comboMax) * chartH
    if (idx === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  })
  ctx.strokeStyle = '#5C6470'
  ctx.lineWidth = 3
  ctx.stroke()
  options.comboRows.forEach((row, idx) => {
    const px = chartX + idx * (chartW / options.comboRows.length) + 54
    const py = chartY - (row.line / comboMax) * chartH
    ctx.beginPath()
    ctx.arc(px, py, 5, 0, Math.PI * 2)
    ctx.fillStyle = '#5C6470'
    ctx.fill()
  })
  // legend
  const legendY = chartTop + 270
  roundRect(chartX + 155, legendY, 14, 14, 4, '#2F80ED'); text('Income', chartX + 176, legendY + 12, '500 14px Inter, Arial, sans-serif', primary)
  roundRect(chartX + 255, legendY, 14, 14, 4, '#F2994A'); text('Expense', chartX + 276, legendY + 12, '500 14px Inter, Arial, sans-serif', primary)
  line(chartX + 380, legendY + 7, chartX + 408, legendY + 7, '#5C6470', 3); text(options.comboLineLabel, chartX + 416, legendY + 12, '500 14px Inter, Arial, sans-serif', primary)

  const topBoxX = 730
  text('Top Categories', topBoxX, chartTop + 34, '700 22px Inter, Arial, sans-serif', primary)
  roundRect(topBoxX, chartTop + 60, 454, 170, 16, lightFill, lightStroke)
  options.topCategories.slice(0, 3).forEach((row, idx) => {
    const y = chartTop + 110 + idx * 46
    if (idx > 0) line(topBoxX + 18, y - 28, topBoxX + 436, y - 28, '#E0E6EE')
    text(`${idx + 1}.`, topBoxX + 18, y, '600 18px Inter, Arial, sans-serif', primary)
    text(row.label + ':', topBoxX + 56, y, '500 18px Inter, Arial, sans-serif', primary)
    text(row.value, topBoxX + 410, y, '700 18px Inter, Arial, sans-serif', primary, 'right')
  })

  line(margin, 1128, w - margin, 1128)

  // table
  text(options.tableTitle, margin, 1166, '700 22px Inter, Arial, sans-serif', primary)
  const tableTop = 1196
  const tableW = w - margin * 2
  const headerH = 46
  roundRect(margin, tableTop, tableW, headerH, 10, lightFill, '#DCE3EE')
  const cols = options.tableHeaders.length
  const colXs = cols === 4 ? [margin + 24, margin + 190, margin + 400, margin + 638] : [margin + 24, margin + 240, margin + 460, margin + 670]
  options.tableHeaders.forEach((label, idx) => text(label, colXs[idx], tableTop + 30, '700 17px Inter, Arial, sans-serif', primary))
  const visibleRows = options.tableRows.slice(0, 5)
  visibleRows.forEach((row, rowIdx) => {
    const y = tableTop + headerH + 38 + rowIdx * 42
    line(margin, y - 22, margin + tableW, y - 22, '#E1E7F0')
    row.forEach((cell, idx) => text(cell, colXs[idx], y, idx === row.length - 1 ? '600 16px Inter, Arial, sans-serif' : '500 16px Inter, Arial, sans-serif', primary))
  })

  const bottomSectionY = 1490
  line(margin, bottomSectionY - 20, w - margin, bottomSectionY - 20)

  // bottom left bars
  text(options.bottomBarTitle, margin, bottomSectionY, '700 22px Inter, Arial, sans-serif', primary)
  const miniChartX = margin + 36
  const miniChartY = bottomSectionY + 148
  const miniChartW = 430
  const miniChartH = 92
  roundRect(margin, bottomSectionY + 24, 520, 182, 16, lightFill, lightStroke)
  const bottomMax = Math.max(1, ...options.bottomBarRows.flatMap((row) => [row.income, row.expenses]))
  ;[0, .5, 1].forEach(step => line(miniChartX, miniChartY - miniChartH * step, miniChartX + miniChartW, miniChartY - miniChartH * step, '#E4E9F1'))
  options.bottomBarRows.slice(0, 8).forEach((row, idx) => {
    const gx = miniChartX + idx * (miniChartW / Math.max(1, options.bottomBarRows.slice(0,8).length)) + 10
    const ih = (row.income / bottomMax) * miniChartH
    const eh = (row.expenses / bottomMax) * miniChartH
    roundRect(gx, miniChartY - ih, 18, ih, 4, '#2F80ED')
    roundRect(gx + 24, miniChartY - eh, 18, eh, 4, '#F2994A')
    text(row.label, gx + 16, miniChartY + 24, '500 12px Inter, Arial, sans-serif', primary, 'center')
  })

  // bottom right line chart
  const lineBoxX = 664
  text(options.bottomLineTitle, lineBoxX, bottomSectionY, '700 22px Inter, Arial, sans-serif', primary)
  roundRect(lineBoxX, bottomSectionY + 24, 520, 182, 16, lightFill, lightStroke)
  const growthX = lineBoxX + 34
  const growthY = bottomSectionY + 152
  const growthW = 450
  const growthH = 94
  const growthMax = Math.max(1, ...options.bottomLineRows.map((row) => row.value))
  ;[0, .5, 1].forEach(step => line(growthX, growthY - growthH * step, growthX + growthW, growthY - growthH * step, '#E4E9F1'))
  ctx.beginPath()
  options.bottomLineRows.slice(0, 9).forEach((row, idx) => {
    const px = growthX + idx * (growthW / Math.max(1, options.bottomLineRows.slice(0,9).length - 1))
    const py = growthY - (row.value / growthMax) * growthH
    if (idx === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  })
  ctx.strokeStyle = '#2F80ED'
  ctx.lineWidth = 4
  ctx.stroke()
  options.bottomLineRows.slice(0, 9).forEach((row, idx) => {
    const px = growthX + idx * (growthW / Math.max(1, options.bottomLineRows.slice(0,9).length - 1))
    const py = growthY - (row.value / growthMax) * growthH
    ctx.beginPath()
    ctx.arc(px, py, 4, 0, Math.PI * 2)
    ctx.fillStyle = '#2F80ED'
    ctx.fill()
    text(row.label, px, growthY + 22, '500 12px Inter, Arial, sans-serif', primary, 'center')
  })
  const last = options.bottomLineRows[Math.min(options.bottomLineRows.length - 1, 8)]
  if (last) {
    const bx = growthX + Math.min(options.bottomLineRows.length - 1, 8) * (growthW / Math.max(1, options.bottomLineRows.slice(0,9).length - 1))
    roundRect(bx - 34, bottomSectionY + 44, 90, 40, 10, '#2F80ED')
    text(new Intl.NumberFormat(undefined, { style: 'currency', currency: options.currency, maximumFractionDigits: 0 }).format(last.value), bx + 12, bottomSectionY + 70, '700 16px Inter, Arial, sans-serif', '#FFFFFF', 'center')
  }

  // footer
  line(margin, h - 60, w - margin, h - 60)
  text(options.footerText, w / 2, h - 24, '600 20px Inter, Arial, sans-serif', '#2A5C90', 'center')
  return canvas
}


export function ReportsView({ budget }: Pick<SharedProps, 'budget'>) {
  const { data, months, activeMonth, categories, recurring, helpers } = budget
  const isPhone = useIsPhone()

  const safeMonths = Array.isArray(months) ? months.filter((month): month is string => typeof month === 'string' && month.length >= 7) : []
  const safeCategories = Array.isArray(categories) ? categories : []
  const safeRecurring = Array.isArray(recurring) ? recurring : []
  const safeTransactions = Array.isArray(data?.transactions) ? data.transactions : []

  const currentMonth = new Date().toISOString().slice(0, 7)
  const availableMonths = safeMonths.length ? safeMonths : [typeof activeMonth === 'string' && activeMonth.length === 7 ? activeMonth : currentMonth]
  const fallbackMonth = typeof activeMonth === 'string' && activeMonth.length === 7 ? activeMonth : (availableMonths[0] ?? currentMonth)
  const [selectedMonth, setSelectedMonth] = useState(fallbackMonth)
  const [selectedYear, setSelectedYear] = useState(() => (fallbackMonth || currentMonth).slice(0, 4))

  useEffect(() => {
    if (!selectedMonth || !availableMonths.includes(selectedMonth)) {
      setSelectedMonth(fallbackMonth)
    }
  }, [availableMonths, selectedMonth, fallbackMonth])

  useEffect(() => {
    if (!selectedYear) setSelectedYear((fallbackMonth || currentMonth).slice(0, 4))
  }, [selectedYear, fallbackMonth, currentMonth])

  const years = useMemo(() => {
    const fromMonths = availableMonths.filter(Boolean).map((month) => month.slice(0, 4))
    const currentYear = String(new Date().getFullYear())
    return Array.from(new Set([currentYear, ...fromMonths])).sort((a, b) => Number(b) - Number(a))
  }, [availableMonths])

  const categoryMap = useMemo(() => Object.fromEntries(safeCategories.map((category) => [category.id, category])), [safeCategories])

  const monthlyTransactions = useMemo(
    () => safeTransactions.filter((tx) => tx.date.slice(0, 7) === selectedMonth),
    [safeTransactions, selectedMonth],
  )

  const monthlyIncome = monthlyTransactions.filter((tx) => tx.type === 'income').reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
  const monthlyExpenses = monthlyTransactions.filter((tx) => tx.type === 'expense').reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
  const monthlyNet = monthlyIncome - monthlyExpenses

  const monthlyByCategory = useMemo(() => {
    const bucket = new Map<string, { name: string; total: number }>()
    for (const tx of monthlyTransactions.filter((tx) => tx.type === 'expense')) {
      const category = tx.category_id ? categoryMap[tx.category_id] : null
      const key = category?.id ?? 'uncategorized'
      const label = category?.name ?? 'Uncategorized'
      const current = bucket.get(key) ?? { name: label, total: 0 }
      current.total += Number(tx.amount || 0)
      bucket.set(key, current)
    }
    return Array.from(bucket.values()).sort((a, b) => b.total - a.total)
  }, [monthlyTransactions, categoryMap])

  const yearTransactions = useMemo(
    () => safeTransactions.filter((tx) => tx.date.startsWith(`${selectedYear}-`)),
    [safeTransactions, selectedYear],
  )

  const yearSummary = useMemo(() => {
    const bucket = new Map<string, { month: string; income: number; expenses: number }>()
    for (const tx of yearTransactions) {
      const key = tx.date.slice(0, 7)
      const current = bucket.get(key) ?? { month: key, income: 0, expenses: 0 }
      if (tx.type === 'income') current.income += Number(tx.amount || 0)
      else current.expenses += Number(tx.amount || 0)
      bucket.set(key, current)
    }
    return Array.from(bucket.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((row) => ({ ...row, net: row.income - row.expenses }))
  }, [yearTransactions])

  const recurringCount = safeRecurring.length

  const yearByCategory = useMemo(() => {
    const bucket = new Map<string, { name: string; total: number }>()
    for (const tx of yearTransactions.filter((tx) => tx.type === 'expense')) {
      const category = tx.category_id ? categoryMap[tx.category_id] : null
      const key = category?.id ?? 'uncategorized'
      const label = category?.name ?? 'Uncategorized'
      const current = bucket.get(key) ?? { name: label, total: 0 }
      current.total += Number(tx.amount || 0)
      bucket.set(key, current)
    }
    return Array.from(bucket.values()).sort((a, b) => b.total - a.total)
  }, [yearTransactions, categoryMap])

  const monthSeriesForYear = useMemo(() => {
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return labels.map((label, index) => {
      const monthKey = `${selectedYear}-${String(index + 1).padStart(2, '0')}`
      const found = yearSummary.find((row) => row.month === monthKey)
      return {
        label,
        income: found?.income ?? 0,
        expenses: found?.expenses ?? 0,
        net: found?.net ?? 0,
      }
    })
  }, [selectedYear, yearSummary])

  const monthlyWeekSeries = useMemo(() => {
    const buckets = Array.from({ length: 4 }, (_, index) => ({
      label: `Week ${index + 1}`,
      income: 0,
      expenses: 0,
      line: 0,
    }))
    for (const tx of monthlyTransactions) {
      const dt = new Date(`${tx.date}T00:00:00`)
      const day = dt.getDate()
      const weekIndex = Math.min(3, Math.floor((day - 1) / 7))
      if (tx.type === 'income') buckets[weekIndex].income += Number(tx.amount || 0)
      else buckets[weekIndex].expenses += Number(tx.amount || 0)
    }
    let running = 0
    for (const bucket of buckets) {
      running += bucket.income - bucket.expenses
      bucket.line = Math.max(running, 0)
    }
    return buckets
  }, [monthlyTransactions])

  const savingsGrowthRows = useMemo(() => {
    let running = 0
    return monthSeriesForYear.map((row) => {
      running += Math.max(row.net, 0)
      return { label: row.label, value: running }
    })
  }, [monthSeriesForYear])

  const formatCurrency = (value: number) => helpers.fmtMoney(value, data.currency)
  const generatedLabel = new Date().toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  const exportCanvasPdf = (filename: string, canvas: HTMLCanvasElement) => {
    const jpeg = canvas.toDataURL('image/jpeg', 0.92)
    downloadPdfFromJpeg(filename, jpeg, canvas.width, canvas.height)
  }

  const makeMonthlyReport = () => {
    const canvas = createReportCanvas({
      appName: 'FinTrackr',
      reportTitle: 'Monthly Financial Report',
      periodLabel: helpers.monthLabel(selectedMonth),
      generatedAt: generatedLabel,
      currency: data.currency,
      totals: { income: monthlyIncome, expenses: monthlyExpenses, balance: monthlyNet },
      overviewRows: [
        { label: 'Income', value: formatCurrency(monthlyIncome) },
        { label: 'Expenses', value: formatCurrency(monthlyExpenses) },
        { label: 'Balance', value: formatCurrency(monthlyNet) },
      ],
      donutRows: monthlyByCategory.slice(0, 6).map((row) => ({ label: row.name, value: row.total })),
      comboTitle: 'Spending vs. Income',
      comboRows: monthlyWeekSeries,
      comboLineLabel: 'Line',
      topCategories: monthlyByCategory.slice(0, 3).map((row) => ({ label: row.name, value: formatCurrency(row.total) })),
      tableTitle: 'Transaction Summary',
      tableHeaders: ['Date', 'Category', 'Description', 'Amount'],
      tableRows: monthlyTransactions
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 5)
        .map((tx) => {
          const category = tx.category_id ? categoryMap[tx.category_id] : null
          return [
            new Date(`${tx.date}T00:00:00`).toLocaleDateString(undefined, { month: '2-digit', day: '2-digit', year: 'numeric' }),
            category?.name ?? 'Uncategorized',
            (((tx.note ?? '').trim() || (tx.type === 'income' ? 'Income entry' : 'Expense entry')).slice(0, 28)),
            formatCurrency(Number(tx.amount || 0)),
          ]
        }),
      bottomBarTitle: 'Yearly Overview',
      bottomBarRows: monthSeriesForYear.map((row) => ({ label: row.label, income: row.income, expenses: row.expenses })),
      bottomLineTitle: 'Yearly Savings Growth',
      bottomLineRows: savingsGrowthRows,
      footerText: 'FinTrackr - Finances at your fingertips',
    })
    exportCanvasPdf(`FinTrackr-Monthly-Report-${selectedMonth}.pdf`, canvas)
  }

  const makeYearlyReport = () => {
    const totalIncome = yearTransactions.filter((tx) => tx.type === 'income').reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
    const totalExpenses = yearTransactions.filter((tx) => tx.type === 'expense').reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
    const yearlyNet = totalIncome - totalExpenses

    const canvas = createReportCanvas({
      appName: 'FinTrackr',
      reportTitle: 'Yearly Financial Report',
      periodLabel: selectedYear,
      generatedAt: generatedLabel,
      currency: data.currency,
      totals: { income: totalIncome, expenses: totalExpenses, balance: yearlyNet },
      overviewRows: [
        { label: 'Income', value: formatCurrency(totalIncome) },
        { label: 'Expenses', value: formatCurrency(totalExpenses) },
        { label: 'Balance', value: formatCurrency(yearlyNet) },
      ],
      donutRows: yearByCategory.slice(0, 6).map((row) => ({ label: row.name, value: row.total })),
      comboTitle: 'Income vs. Expenses by Month',
      comboRows: monthSeriesForYear.map((row) => ({ label: row.label, income: row.income, expenses: row.expenses, line: Math.max(row.net, 0) })),
      comboLineLabel: 'Net',
      topCategories: yearByCategory.slice(0, 3).map((row) => ({ label: row.name, value: formatCurrency(row.total) })),
      tableTitle: 'Monthly Summary',
      tableHeaders: ['Month', 'Income', 'Expenses', 'Net'],
      tableRows: monthSeriesForYear
        .filter((row) => row.income > 0 || row.expenses > 0 || row.net > 0)
        .slice(0, 5)
        .map((row) => [row.label, formatCurrency(row.income), formatCurrency(row.expenses), formatCurrency(row.net)]),
      bottomBarTitle: 'Yearly Overview',
      bottomBarRows: monthSeriesForYear.map((row) => ({ label: row.label, income: row.income, expenses: row.expenses })),
      bottomLineTitle: 'Yearly Savings Growth',
      bottomLineRows: savingsGrowthRows,
      footerText: 'FinTrackr - Finances at your fingertips',
    })
    exportCanvasPdf(`FinTrackr-Yearly-Report-${selectedYear}.pdf`, canvas)
  }

  return (
    <div className="card reportsPage">
      <div className="row between reportsHeader">
        <div>
          <h2>Reports</h2>
          <div className="muted">Download clean PDF reports for a specific month or full year.</div>
        </div>
      </div>

      <div className={`grid ${isPhone ? '' : 'cols2'} reportsGrid`} style={{ marginTop: 14 }}>
        <div className="card reportsPanel">
          <div className="row between" style={{ marginBottom: 12 }}>
            <div>
              <h3 style={{ marginBottom: 4 }}>Monthly PDF report</h3>
              <small>Detailed month summary with category spend and transactions.</small>
            </div>
            <span className="badge">PDF</span>
          </div>

          <div className="field">
            <label>Month</label>
            <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
              {availableMonths.map((month) => <option key={month} value={month}>{helpers.monthLabel(month)}</option>)}
            </select>
          </div>

          <div className="reportsStats">
            <div className="kpi income"><span>Income</span><strong>{helpers.fmtMoney(monthlyIncome, data.currency)}</strong></div>
            <div className="kpi expenses"><span>Expenses</span><strong>{helpers.fmtMoney(monthlyExpenses, data.currency)}</strong></div>
            <div className="kpi net"><span>Net</span><strong>{helpers.fmtMoney(monthlyNet, data.currency)}</strong></div>
          </div>

          <div className="reportsPreviewList">
            <div className="reportsPreviewTitle">Top category spend</div>
            {monthlyByCategory.slice(0, 5).map((row) => (
              <div key={row.name} className="reportsPreviewRow">
                <span>{row.name}</span>
                <strong>{helpers.fmtMoney(row.total, data.currency)}</strong>
              </div>
            ))}
            {!monthlyByCategory.length ? <small>No expense categories in this month.</small> : null}
          </div>

          <button className="btn primary reportsDownloadBtn" onClick={makeMonthlyReport}>
            <FileDown size={16} /> Download monthly PDF
          </button>
        </div>

        <div className="card reportsPanel">
          <div className="row between" style={{ marginBottom: 12 }}>
            <div>
              <h3 style={{ marginBottom: 4 }}>Yearly PDF report</h3>
              <small>Year summary with month-by-month totals and recurring snapshot.</small>
            </div>
            <span className="badge">PDF</span>
          </div>

          <div className="field">
            <label>Year</label>
            <select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)}>
              {years.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>

          <div className="reportsYearGrid">
            <div className="badge">Transactions: {yearTransactions.length}</div>
            <div className="badge">Recurring items: {recurringCount}</div>
          </div>

          <div className="reportsPreviewList">
            <div className="reportsPreviewTitle">Month-by-month net</div>
            {yearSummary.slice(-6).reverse().map((row) => (
              <div key={row.month} className="reportsPreviewRow">
                <span>{helpers.monthLabel(row.month)}</span>
                <strong>{helpers.fmtMoney(row.net, data.currency)}</strong>
              </div>
            ))}
            {!yearSummary.length ? <small>No transactions in this year.</small> : null}
          </div>

          <button className="btn primary reportsDownloadBtn" onClick={makeYearlyReport}>
            <FileDown size={16} /> Download yearly PDF
          </button>
        </div>
      </div>
    </div>
  )
}




export function AdviceView({ budget }: Pick<SharedProps, 'budget'>) {
  const { data, activeMonth, income, expenses, net, byCategory, sortedCategories, upcomingRecurringThisMonth, helpers } = budget
  const isPhone = useIsPhone()

  const topCategory = byCategory[0]
  const totalBudget = sortedCategories.reduce((sum, category) => sum + Number(category.budget_monthly || 0), 0)
  const budgetUsage = totalBudget > 0 ? Math.min(100, Math.round((expenses / totalBudget) * 100)) : 0
  const savingsRate = income > 0 ? Math.round((Math.max(net, 0) / income) * 100) : 0
  const recurringExpenseTotal = upcomingRecurringThisMonth
    .filter((item) => item.kind !== 'income')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)

  const budgetInsight = {
    title: 'Budget status',
    value: totalBudget > 0 ? `${budgetUsage}% of monthly budget used` : 'No category budgets set',
    body: totalBudget > 0
      ? budgetUsage >= 90
        ? 'You are very close to your total budget limit. Reduce non-essential spending now instead of waiting until month-end.'
        : budgetUsage >= 70
          ? 'You are moving through your budget quickly. Track the next few expense decisions more carefully.'
          : 'Your budget usage is still under control. Keep spending intentional so you do not lose that position later in the month.'
      : 'Set monthly budgets for your categories. Without limits, the app can track spending but cannot judge whether you are on budget.',
    tone: budgetUsage >= 90 ? 'warn' : budgetUsage >= 70 ? 'caution' : 'good',
  }

  const savingsInsight = {
    title: 'Savings signal',
    value: income > 0 ? `${savingsRate}% current savings rate` : 'No income recorded this month',
    body: income > 0
      ? net < 0
        ? 'You spent more than you earned this month. Fix recurring leaks first before chasing tiny savings tips.'
        : savingsRate < 10
          ? 'Your savings rate is low. Start by moving a fixed amount aside right after income arrives, not at the end of the month.'
          : 'Your savings rate is decent. The next improvement is consistency, not random large contributions once in a while.'
      : 'Add your income entries consistently. Without income data, the app cannot judge whether your spending pattern is sustainable.',
    tone: net < 0 ? 'warn' : savingsRate < 10 ? 'caution' : 'good',
  }

  const recurringInsight = {
    title: 'Upcoming fixed costs',
    value: `${helpers.fmtMoney(recurringExpenseTotal, data.currency)} upcoming recurring expenses`,
    body: recurringExpenseTotal > 0
      ? 'Recurring bills deserve attention before flexible spending. If fixed costs are heavy, lower your optional categories before they hit.'
      : 'No recurring expenses are scheduled for the rest of this month. That gives you more room, but it does not remove the need for disciplined spending.',
    tone: recurringExpenseTotal > 0 ? 'neutral' : 'good',
  }

  const evergreenTips = [
    { title: 'Pay yourself first', body: 'Treat savings like a bill with a fixed due date. If you wait to save whatever is left over, there usually will not be much left.', icon: '💰' },
    { title: 'Review subscriptions regularly', body: 'Small recurring charges drain more money than a single larger purchase. Audit subscriptions, bills, and auto-payments regularly.', icon: '🔁' },
    { title: 'Use goals to make saving visible', body: 'People save better when the money is tied to a specific target. A vague plan like “save more” is weak. A goal with a number and deadline is stronger.', icon: '🎯' },
    { title: 'Cut the category that gives the biggest impact', body: 'If you want results fast, reduce the category where most of your money is going. Tiny cuts everywhere feel productive but often change very little.', icon: '✂️' },
    { title: 'Review weekly, not just monthly', body: 'Monthly reviews are too slow if your spending is drifting. A quick weekly check helps you correct course before the damage gets locked in.', icon: '📅' },
  ]

  const [tipIndex, setTipIndex] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => {
      setTipIndex((current) => (current + 1) % evergreenTips.length)
    }, 7000)
    return () => window.clearInterval(timer)
  }, [evergreenTips.length])

  const tip = evergreenTips[tipIndex]

  const [chatOpen, setChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'bot' | 'user'; text: string }>>([])
  const faqQuestions = [
    'How much did I spend on food this month?',
    'Which category is highest?',
    'Did I save more than last month?',
    'What is my income this month?',
    'How much are my recurring bills?'
  ]

  const getPrevMonth = (month: string) => {
    const [y, m] = month.split('-').map(Number)
    const date = new Date(y, (m || 1) - 2, 1)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  }

  const monthOf = (date: string) => date.slice(0, 7)
  const previousMonth = getPrevMonth(activeMonth)
  const previousMonthTx = data.transactions.filter((tx) => monthOf(tx.date) === previousMonth)
  const previousNet = previousMonthTx.reduce((sum, tx) => {
    const amount = Number(tx.amount || 0)
    return sum + (tx.type === 'income' ? amount : -amount)
  }, 0)

  const foodSpend = byCategory.find((row) => row.name.toLowerCase().includes('food') || row.name.toLowerCase().includes('grocer'))?.total ?? 0
  const housingSpend = byCategory.find((row) => row.name.toLowerCase().includes('rent') || row.name.toLowerCase().includes('housing') || row.name.toLowerCase().includes('mortgage'))?.total ?? 0
  const transportSpend = byCategory.find((row) => row.name.toLowerCase().includes('car') || row.name.toLowerCase().includes('transport'))?.total ?? 0

  const answerFinancialQuestion = (rawQuestion: string) => {
    const q = rawQuestion.trim().toLowerCase()
    if (!q) return `Ask something about ${helpers.monthLabel(activeMonth)} spending, savings, categories, or recurring bills.`

    if ((q.includes('welcome') || q.includes('help')) && q.length < 20) {
      return `I can help with your ${helpers.monthLabel(activeMonth)} income, expenses, savings, categories, and recurring bills.`
    }

    if ((q.includes('food') || q.includes('grocery')) && (q.includes('spend') || q.includes('spent') || q.includes('expense') || q.includes('how much'))) {
      return `You spent ${helpers.fmtMoney(foodSpend, data.currency)} on food this month.`
    }

    if ((q.includes('housing') || q.includes('rent') || q.includes('mortgage')) && (q.includes('spend') || q.includes('spent') || q.includes('expense') || q.includes('how much'))) {
      return `You spent ${helpers.fmtMoney(housingSpend, data.currency)} on housing this month.`
    }

    if ((q.includes('transport') || q.includes('car') || q.includes('gas')) && (q.includes('spend') || q.includes('spent') || q.includes('expense') || q.includes('how much'))) {
      return `You spent ${helpers.fmtMoney(transportSpend, data.currency)} on transportation this month.`
    }

    if ((q.includes('highest') || q.includes('top') || q.includes('biggest')) && q.includes('category')) {
      if (!topCategory) return 'There is no expense category data yet for this month.'
      return `Your highest spending category is ${topCategory.emoji ?? '🏷️'} ${topCategory.name} at ${helpers.fmtMoney(topCategory.total, data.currency)} this month.`
    }

    if (q.includes('income') || q.includes('earn') || q.includes('salary') || q.includes('pay')) {
      return `Your income for ${helpers.monthLabel(activeMonth)} is ${helpers.fmtMoney(income, data.currency)}.`
    }

    if (q.includes('expense') || q.includes('spent') || q.includes('spending') || q.includes('cost')) {
      return `Your total expenses for ${helpers.monthLabel(activeMonth)} are ${helpers.fmtMoney(expenses, data.currency)}.`
    }

    if (q.includes('net') || q.includes('balance') || q.includes('saved') || q.includes('saving') || q.includes('left over')) {
      return `Your current net for ${helpers.monthLabel(activeMonth)} is ${helpers.fmtMoney(net, data.currency)}.`
    }

    if ((q.includes('save more') || q.includes('saved more') || q.includes('more than last month')) || (q.includes('compare') && q.includes('last month'))) {
      if (!data.transactions.length) return 'There is not enough transaction history yet to compare with last month.'
      if (net > previousNet) return `Yes. Your net this month is ${helpers.fmtMoney(net, data.currency)} versus ${helpers.fmtMoney(previousNet, data.currency)} last month.`
      if (net < previousNet) return `No. Your net this month is ${helpers.fmtMoney(net, data.currency)} versus ${helpers.fmtMoney(previousNet, data.currency)} last month.`
      return `You saved the same amount as last month: ${helpers.fmtMoney(net, data.currency)}.`
    }

    if (q.includes('recurring') || q.includes('bill') || q.includes('upcoming')) {
      const recurringItems = upcomingRecurringThisMonth.slice(0, 4)
      if (!recurringItems.length) return 'You have no recurring items coming up this month.'
      const recurringTotal = upcomingRecurringThisMonth.reduce((sum, item) => sum + Number(item.amount || 0), 0)
      return `Upcoming recurring items total ${helpers.fmtMoney(recurringTotal, data.currency)} this month. Next items: ${recurringItems.map((item) => `${item.emoji ?? '🔁'} ${item.name}`).join(', ')}.`
    }

    if (q.includes('budget')) {
      if (!totalBudget) return 'You have not set monthly category budgets yet.'
      return `You have used about ${budgetUsage}% of your total category budgets in ${helpers.monthLabel(activeMonth)}.`
    }

    if (q.includes('advice') || q.includes('tip')) {
      return `${budgetInsight.body} ${savingsInsight.body}`
    }

    return `I can help with spending by category, total income, total expenses, savings vs last month, and recurring bills for ${helpers.monthLabel(activeMonth)}.`
  }

  const openChat = () => {
    setChatOpen(true)
    setChatMessages((current) => current.length ? current : [{ role: 'bot', text: 'Welcome to the Chat, how can I help you with?' }])
  }

  const sendChatQuestion = (preset?: string) => {
    const question = (preset ?? chatInput).trim()
    if (!question) return
    const answer = answerFinancialQuestion(question)
    setChatMessages((current) => [...current, { role: 'user', text: question }, { role: 'bot', text: answer }])
    setChatInput('')
  }

  return (
    <div className="card advicePage advicePageMatch">
      <div className="row between adviceHeader" style={{ alignItems: 'flex-start', gap: 12 }}>
        <div>
          <h2>Advice</h2>
          <div className="muted">Practical money tips and changing insights based on your budget activity.</div>
        </div>
        <span className="badge">Smart guidance</span>
      </div>

      <div className={`grid ${isPhone ? '' : 'adviceMatchGrid'}`} style={{ marginTop: 16 }}>
        <div className="adviceMatchLeft">
          <div className="card adviceHeroCard adviceMatchTopTip">
            <div className="adviceHeroLabel">Rotating money tip</div>
            <div className="adviceHeroIcon">{tip.icon}</div>
            <h3>{tip.title}</h3>
            <p>{tip.body}</p>
            <div className="adviceDots" aria-hidden="true">
              {evergreenTips.map((_, index) => <span key={index} className={index === tipIndex ? 'active' : ''} />)}
            </div>
          </div>

          <div className={`card adviceInsightCard ${budgetInsight.tone}`}>
            <div className="adviceInsightLabel">Insight</div>
            <h3>{budgetInsight.title}</h3>
            <div className="adviceInsightValue">{budgetInsight.value}</div>
            <p>{budgetInsight.body}</p>
          </div>

          <div className={`grid ${isPhone ? '' : 'adviceInsightStack'}`}>
            <div className={`card adviceInsightCard ${savingsInsight.tone}`}>
              <div className="adviceInsightLabel">Insight</div>
              <h3>{savingsInsight.title}</h3>
              <div className="adviceInsightValue">{savingsInsight.value}</div>
              <p>{savingsInsight.body}</p>
            </div>

            <div className={`card adviceInsightCard ${recurringInsight.tone}`}>
              <div className="adviceInsightLabel">Insight</div>
              <h3>{recurringInsight.title}</h3>
              <div className="adviceInsightValue">{recurringInsight.value}</div>
              <p>{recurringInsight.body}</p>
            </div>
          </div>

          <div className="card adviceQuickStats adviceQuickStatsMatch">
            <div className="kpi income"><span>Income</span><strong>{helpers.fmtMoney(income, data.currency)}</strong></div>
            <div className="kpi expenses"><span>Expenses</span><strong>{helpers.fmtMoney(expenses, data.currency)}</strong></div>
            <div className="kpi net"><span>Net</span><strong>{helpers.fmtMoney(net, data.currency)}</strong></div>
            <div className="badge">Savings rate {income > 0 ? `${savingsRate}%` : '—'}</div>
          </div>
        </div>

        <div className="card adviceMatchChat">
          <div className="row between adviceChatHeader" style={{ alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Need financial help?</h3>
            <button
              type="button"
              className="btn adviceChatTrigger"
              onClick={() => (chatOpen ? setChatOpen(false) : openChat())}
            >
              {chatOpen ? 'Close chat' : 'Click to chat'}
            </button>
          </div>

          <div className="adviceMatchChatTop">
            <img src="/advice-bot.png" alt="FinTrackr assistant bot" className="adviceBotImage" />
            <div className="adviceBotQuestion">How much did I spend on food this month?</div>
          </div>

          {!chatOpen ? (
            <>
              <div className="adviceChatBubble bot adviceMatchClosedBubble">
                You spent {helpers.fmtMoney(foodSpend, data.currency)} on food this month. Keep an eye on your food budget to stay within your financial goals.
              </div>

              <div className="adviceMatchInputDock">
                <div className="adviceMatchInputRow">
                  <input className="input" placeholder="Ask a question..." value="" readOnly />
                  <button type="button" className="btn primary adviceMatchSend">➤</button>
                </div>
                <div className="adviceChatDockMini">
                  <span className="adviceMiniDot active" />
                  <span className="adviceMiniDot" />
                  <span className="adviceMiniDot" />
                  <span className="adviceMiniIcon">☰</span>
                  <span className="adviceMiniIcon">⚙</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="adviceChatRailMessages adviceMatchMessages">
                {chatMessages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={`adviceChatBubble ${message.role}`}>
                    {message.text}
                  </div>
                ))}

                <div className="adviceFaqGrid">
                  {faqQuestions.map((question) => (
                    <button key={question} type="button" className="adviceFaqChip" onClick={() => sendChatQuestion(question)}>
                      {question}
                    </button>
                  ))}
                </div>
              </div>

              <div className="adviceMatchInputDock">
                <div className="adviceMatchInputRow">
                  <input
                    className="input"
                    placeholder="Ask a question..."
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        sendChatQuestion()
                      }
                    }}
                  />
                  <button type="button" className="btn primary adviceMatchSend" onClick={() => sendChatQuestion()}>➤</button>
                </div>
                <div className="adviceChatDockMini">
                  <span className="adviceMiniDot active" />
                  <span className="adviceMiniDot" />
                  <span className="adviceMiniDot" />
                  <span className="adviceMiniIcon">☰</span>
                  <span className="adviceMiniIcon">⚙</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function SettingsView({ budget, theme, email, onThemeToggle, admin }: SharedProps) {
  const { data, setCurrency, setAllowTxnInFutureDate, exportCSV, exportJSON, importJSON } = budget
  const [settingsSection, setSettingsSection] = useState<'general' | 'data' | 'account' | 'admin' | 'audit'>('general')
  const isSuperAdmin = !!admin?.isSuperAdmin

  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' })
  const [showPasswordFields, setShowPasswordFields] = useState({ current: false, next: false, confirm: false })
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')

  const passwordStrengthScore = useMemo(() => {
    const value = passwordForm.next || ''
    let score = 0
    if (value.length >= 8) score += 1
    if (value.length >= 12) score += 1
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1
    if (/\d/.test(value)) score += 1
    if (/[^A-Za-z0-9]/.test(value)) score += 1
    return score
  }, [passwordForm.next])

  const passwordStrengthLabel = useMemo(() => {
    if (!passwordForm.next) return 'Not set'
    if (passwordStrengthScore <= 1) return 'Weak'
    if (passwordStrengthScore <= 3) return 'Medium'
    if (passwordStrengthScore === 4) return 'Strong'
    return 'Very strong'
  }, [passwordForm.next, passwordStrengthScore])

  const handlePasswordField = (field: 'current' | 'next' | 'confirm', value: string) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }))
    if (passwordError) setPasswordError('')
    if (passwordSuccess) setPasswordSuccess('')
  }

  const togglePasswordVisibility = (field: 'current' | 'next' | 'confirm') => {
    setShowPasswordFields((prev) => ({ ...prev, [field]: !prev[field] }))
  }

  const handlePasswordChange = async () => {
    setPasswordError('')
    setPasswordSuccess('')
    const current = passwordForm.current.trim()
    const next = passwordForm.next.trim()
    const confirm = passwordForm.confirm.trim()

    if (!email) {
      setPasswordError('No active account email found.')
      return
    }
    if (!current || !next || !confirm) {
      setPasswordError('Fill in all password fields.')
      return
    }
    if (next.length < 8) {
      setPasswordError('New password must be at least 8 characters.')
      return
    }
    if (next !== confirm) {
      setPasswordError('New password and confirm password do not match.')
      return
    }
    if (current === next) {
      setPasswordError('New password must be different from the current password.')
      return
    }

    setPasswordBusy(true)
    try {
      const verify = await supabase.auth.signInWithPassword({ email, password: current })
      if (verify.error) throw verify.error

      const update = await supabase.auth.updateUser({ password: next })
      if (update.error) throw update.error

      setPasswordSuccess('Password updated successfully.')
      setPasswordForm({ current: '', next: '', confirm: '' })
      setShowPasswordFields({ current: false, next: false, confirm: false })
    } catch (error: any) {
      setPasswordError(error?.message || 'Failed to update password.')
    } finally {
      setPasswordBusy(false)
    }
  }

  useEffect(() => {
    if ((settingsSection === 'admin' || settingsSection === 'audit') && !isSuperAdmin) setSettingsSection('general')
  }, [settingsSection, isSuperAdmin])

  return (
    <div className="settingsShell settingsShellTopNav settingsShellSingle">
      <div className="settingsContentStack settingsContentStackTopNav">
        <div className="card settingsTopCard settingsTopCardFull">
          <div className="row between settingsTopHeader" style={{ gap: 12, alignItems: 'flex-start' }}>
            <div>
              <div className="h1" style={{ marginBottom: 6 }}>Settings</div>
              <div className="muted">Manage workspace preferences, exports, account details, and admin controls in one place.</div>
            </div>
            <span className="badge">Workspace controls</span>
          </div>
          <div className="settingsTopTabs" role="tablist" aria-label="Settings sections">
            <button className={`settingsNavBtn settingsTopNavBtn ${settingsSection === 'general' ? 'active' : ''}`} onClick={() => setSettingsSection('general')}>General</button>
            <button className={`settingsNavBtn settingsTopNavBtn ${settingsSection === 'data' ? 'active' : ''}`} onClick={() => setSettingsSection('data')}>Data & backup</button>
            <button className={`settingsNavBtn settingsTopNavBtn ${settingsSection === 'account' ? 'active' : ''}`} onClick={() => setSettingsSection('account')}>Account</button>
            {isSuperAdmin ? <button className={`settingsNavBtn settingsTopNavBtn ${settingsSection === 'admin' ? 'active' : ''}`} onClick={() => setSettingsSection('admin')}>Super Admin</button> : null}
            {isSuperAdmin ? <button className={`settingsNavBtn settingsTopNavBtn ${settingsSection === 'audit' ? 'active' : ''}`} onClick={() => setSettingsSection('audit')}>Audit Log</button> : null}
          </div>
        </div>
        {settingsSection === 'general' ? (
          <div className="card settingsPanelCard">
            <div className="row between" style={{ gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div className="h1">General preferences</div>
                <small>These settings affect your personal app experience on this device.</small>
              </div>
              <span className="badge">Local settings</span>
            </div>

            <div className="settingsGridTwo">
              <label className="field settingsFieldCard">
                <span>Currency</span>
                <select className="select" value={data.currency} onChange={(event) => setCurrency(event.target.value)}>
                  <option value="CAD">CAD</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="AUD">AUD</option>
                  <option value="NPR">NPR</option>
                </select>
                <small>Choose the default currency used across cards, summaries, and reports.</small>
              </label>

              <div className="settingsFieldCard">
                <div className="row between" style={{ alignItems: 'center', gap: 12 }}>
                  <div>
                    <div className="h1" style={{ fontSize: 16, margin: 0 }}>AllowTxnInFutureDate</div>
                    <small>Turn on to allow transactions dated after today.</small>
                  </div>
                  <button
                    className={`btn ${data.settings.allowTxnInFutureDate ? 'primary' : ''}`}
                    onClick={() => setAllowTxnInFutureDate(!data.settings.allowTxnInFutureDate)}
                    aria-pressed={data.settings.allowTxnInFutureDate}
                    title="Toggle future-dated transactions"
                  >
                    {data.settings.allowTxnInFutureDate ? 'On' : 'Off'}
                  </button>
                </div>
              </div>

              <div className="settingsFieldCard settingsFieldCardWide">
                <div className="row between" style={{ alignItems: 'center', gap: 12 }}>
                  <div>
                    <div className="h1" style={{ fontSize: 16, margin: 0 }}>Appearance</div>
                    <small>Switch between the current dark mode and light mode.</small>
                  </div>
                  <button className="btn primary" onClick={onThemeToggle} title="Toggle dark/light mode">
                    {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {settingsSection === 'data' ? (
          <div className="card settingsPanelCard">
            <div className="row between" style={{ gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div className="h1">Data & backup</div>
                <small>Export your workspace data or import a previous JSON backup.</small>
              </div>
              <span className="badge">Portable data tools</span>
            </div>
            <div className="row gap wrap">
              <button className="btn" onClick={exportCSV}><Download size={16} /> Export CSV</button>
              <button className="btn" onClick={exportJSON}><Download size={16} /> Export JSON</button>
              <label className="btn">
                <Upload size={16} /> Import JSON
                <input
                  type="file"
                  accept="application/json"
                  style={{ display: 'none' }}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (!file) return
                    void importJSON(file).catch((error) => alert(error?.message ?? 'Import failed.'))
                    event.currentTarget.value = ''
                  }}
                />
              </label>
            </div>
          </div>
        ) : null}

        {settingsSection === 'account' ? (
          <div className="card settingsPanelCard">
            <div className="row between" style={{ gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div className="h1">Account</div>
                <small>Your active sign-in and workspace-level access context.</small>
              </div>
              <span className="badge">Signed in</span>
            </div>
            <div className="settingsAccountCard">
              <div className="row" style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="pill">Email</span>
                <span className="pill">{email || '—'}</span>
                {isSuperAdmin ? <span className="pill">Super Admin</span> : null}
              </div>
            </div>

            <div className="card settingsPanelCard settingsPasswordCard">
              <div className="row between" style={{ gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div className="h1">Change password</div>
                  <small>Secure your account with a fresh password. We verify your current password before saving the new one.</small>
                </div>
                <span className="badge">Advanced security</span>
              </div>

              <div className="passwordSecurityStrip">
                <div className="passwordSecurityCopy">
                  <strong>Password strength</strong>
                  <span>{passwordStrengthLabel}</span>
                </div>
                <div className={`passwordStrengthPill ${passwordStrengthLabel.toLowerCase().replace(/\s+/g, '-')}`}>{passwordStrengthLabel}</div>
              </div>

              <div className="settingsPasswordGrid">
                <div className="settingsPasswordField">
                  <label>Current password</label>
                  <div className="passwordInputShell">
                    <Lock size={16} />
                    <input
                      className="input"
                      type={showPasswordFields.current ? 'text' : 'password'}
                      value={passwordForm.current}
                      onChange={(event) => handlePasswordField('current', event.target.value)}
                      placeholder="Enter current password"
                    />
                    <button type="button" className="passwordToggleBtn" onClick={() => togglePasswordVisibility('current')}>
                      {showPasswordFields.current ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="settingsPasswordField">
                  <label>New password</label>
                  <div className="passwordInputShell">
                    <Lock size={16} />
                    <input
                      className="input"
                      type={showPasswordFields.next ? 'text' : 'password'}
                      value={passwordForm.next}
                      onChange={(event) => handlePasswordField('next', event.target.value)}
                      placeholder="Create new password"
                    />
                    <button type="button" className="passwordToggleBtn" onClick={() => togglePasswordVisibility('next')}>
                      {showPasswordFields.next ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="settingsPasswordField settingsPasswordFieldWide">
                  <label>Confirm new password</label>
                  <div className="passwordInputShell">
                    <Lock size={16} />
                    <input
                      className="input"
                      type={showPasswordFields.confirm ? 'text' : 'password'}
                      value={passwordForm.confirm}
                      onChange={(event) => handlePasswordField('confirm', event.target.value)}
                      placeholder="Re-enter new password"
                    />
                    <button type="button" className="passwordToggleBtn" onClick={() => togglePasswordVisibility('confirm')}>
                      {showPasswordFields.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="passwordHintRow">
                <span className="pill">Use 8+ characters</span>
                <span className="pill">Mix upper/lower case</span>
                <span className="pill">Add a number or symbol</span>
              </div>

              {passwordError ? <div className="passwordFeedback error">{passwordError}</div> : null}
              {passwordSuccess ? <div className="passwordFeedback success">{passwordSuccess}</div> : null}

              <div className="row between wrap" style={{ gap: 12, marginTop: 16 }}>
                <div className="muted">Updating your password signs in the current account with the new credentials.</div>
                <button className="btn" onClick={() => void handlePasswordChange()} disabled={passwordBusy}>
                  <Lock size={16} /> {passwordBusy ? 'Updating...' : 'Update password'}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {settingsSection === 'admin' && isSuperAdmin && admin ? (
          <div className="settingsAdminSection">
            <SuperAdminView admin={admin} embedded hideAudit />
          </div>
        ) : null}

        {settingsSection === 'audit' && isSuperAdmin && admin ? (
          <div className="settingsAdminSection">
            <AdminAuditLogPanel admin={admin} embedded />
          </div>
        ) : null}
      </div>
    </div>
  )
}


function AdminAuditLogPanel({ admin, embedded = false }: { admin: ReturnType<typeof useSuperAdmin>; embedded?: boolean }) {
  const formatAuditAction = (action: string) => action.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase())
  const renderAuditDetails = (details?: Record<string, unknown> | null) => {
    if (!details || Object.keys(details).length === 0) return 'No extra details recorded.'
    return Object.entries(details)
      .map(([key, value]) => `${key.replaceAll('_', ' ')}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`)
      .join(' • ')
  }

  return (
    <div className={`card ${embedded ? 'settingsPanelCard' : ''}`}>
      <div className="row between" style={{ marginBottom: 10, gap: 12, alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ marginBottom: 4 }}>Audit Log</h3>
          <div className="muted">Clear, time-stamped history of changes made from Super Admin mode.</div>
        </div>
        <span className="badge">Last 15 actions</span>
      </div>
      <div className="adminAuditList adminAuditListClear adminAuditScrollable">
        {admin.auditLogs.length === 0 ? <div className="muted">No admin actions recorded yet.</div> : admin.auditLogs.map((item) => {
          const timestamp = item.created_at ? new Date(item.created_at) : null
          return (
            <div key={item.id} className="adminAuditRow adminAuditRowClear">
              <div className="adminAuditPrimary">
                <strong>{formatAuditAction(item.action)}</strong>
                <div className="muted adminSubRow">{renderAuditDetails(item.details)}</div>
              </div>
              <div className="adminAuditMeta">
                <span className="badge">{timestamp ? timestamp.toLocaleDateString() : 'Today'}</span>
                <span className="badge">{timestamp ? timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</span>
                <span className="badge">Target: {item.target_user_id ?? '—'}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}


export function HelpSupportView() {
  const isPhone = useIsPhone()
  const [chatReady, setChatReady] = useState(false)

  useEffect(() => {
    if (!TAWK_ENABLED) return
    loadTawkWidget()
    const timer = window.setInterval(() => {
      if (window.Tawk_API) {
        setChatReady(true)
        window.clearInterval(timer)
      }
    }, 400)
    return () => window.clearInterval(timer)
  }, [])

  const openChat = () => {
    if (!TAWK_ENABLED) return
    if (window.Tawk_API?.maximize) {
      window.Tawk_API.maximize()
      return
    }
    if (window.Tawk_API?.toggle) {
      window.Tawk_API.toggle()
    }
  }

  return (
    <div className="card supportPage">
      <div className="row between supportHeader" style={{ alignItems: 'flex-start', gap: 12 }}>
        <div>
          <h2>Help & Support</h2>
          <div className="muted">Use the live support chat for help with account issues, app questions, or technical problems.</div>
        </div>
        <span className="badge">24/7 support</span>
      </div>

      <div className={`grid ${isPhone ? '' : 'cols2'}`} style={{ marginTop: 16 }}>
        <div className="card supportHeroCard supportSaaSHero">
          <div className="supportHeroTop">
            <div>
              <div className="supportHeroLabel">Live support chat</div>
              <h3>Talk to CodeVerse support in real time</h3>
            </div>
            <div className="supportAgentStatus">
              <span className="supportAgentDot" />
              <span>{chatReady ? 'Agents online' : 'Widget loading'}</span>
            </div>
          </div>

          <p>
            Get help with account issues, sync problems, reports, and app questions from one place. Start a chat or use a quick action below.
          </p>

          <div className={`grid ${isPhone ? '' : 'cols2'}`} style={{ marginTop: 14 }}>
            <button className="btn primary" onClick={openChat} disabled={!TAWK_ENABLED}>
              {chatReady ? 'Open live chat' : 'Load live chat'}
            </button>
            <a className="btn" href="mailto:codeversesolutions@gmail.com?subject=FinTrackr%20Support%20Request">
              Email support
            </a>
          </div>

          <div className="supportQuickActions">
            <button className="supportQuickAction" onClick={openChat} disabled={!TAWK_ENABLED}>
              <span className="supportQuickIcon">💬</span>
              <span>
                <strong>Start chat</strong>
                <small>Fastest option</small>
              </span>
            </button>
            <a className="supportQuickAction" href="mailto:codeversesolutions@gmail.com?subject=Bug%20Report%20for%20FinTrackr">
              <span className="supportQuickIcon">🐞</span>
              <span>
                <strong>Report bug</strong>
                <small>Send issue details</small>
              </span>
            </a>
            <a className="supportQuickAction" href="mailto:codeversesolutions@gmail.com?subject=Billing%20or%20Account%20Support">
              <span className="supportQuickIcon">🧾</span>
              <span>
                <strong>Account help</strong>
                <small>Billing and access</small>
              </span>
            </a>
          </div>

          {!TAWK_ENABLED ? (
            <div className="supportNotice" style={{ marginTop: 14 }}>
              Add <code>VITE_TAWK_PROPERTY_ID</code> and <code>VITE_TAWK_WIDGET_ID</code> in Netlify or your local <code>.env</code> to activate the real chat widget.
            </div>
          ) : null}
        </div>

        <div className="card supportInfoCard supportContactCard">
          <div className="supportInfoTop">
            <div>
              <div className="supportHeroLabel">Contact panel</div>
              <h3>Contact Info</h3>
            </div>
            <span className="badge">Reply target</span>
          </div>

          <div className="supportContactRows">
            <a className="supportContactRow" href="tel:+16729719810">
              <span className="supportContactIcon">📞</span>
              <span>
                <strong>Call support</strong>
                <small>+1 672 971 9810</small>
              </span>
            </a>

            <a className="supportContactRow" href="mailto:CodeVerseSolutions@gmail.com">
              <span className="supportContactIcon">✉️</span>
              <span>
                <strong>Email</strong>
                <small>CodeVerseSolutions@gmail.com</small>
              </span>
            </a>

            <div className="supportContactRow">
              <span className="supportContactIcon">📍</span>
              <span>
                <strong>Location</strong>
                <small>Vancouver, Canada</small>
              </span>
            </div>
          </div>

          <div className="supportSocials">
            <a href="#" aria-label="LinkedIn">in</a>
            <a href="#" aria-label="GitHub">gh</a>
            <a href="mailto:CodeVerseSolutions@gmail.com" aria-label="Email">@</a>
            <a href="#" aria-label="X">x</a>
            <a href="#" aria-label="Telegram">tg</a>
          </div>

          <div className="supportMicroStatus">
            <div>
              <strong>Average reply</strong>
              <small>Usually within minutes when agents are online</small>
            </div>
            <div>
              <strong>Coverage</strong>
              <small>24/7 support channel with email follow-up</small>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>What users can ask here</h3>
        <div className={`grid ${isPhone ? '' : 'cols3'}`}>
          <div className="supportMiniCard">
            <div className="supportMiniIcon">🔐</div>
            <strong>Account help</strong>
            <span>Password reset, sign in issues, and access problems.</span>
          </div>
          <div className="supportMiniCard">
            <div className="supportMiniIcon">🛠️</div>
            <strong>Technical support</strong>
            <span>Bug reports, sync issues, and app behavior questions.</span>
          </div>
          <div className="supportMiniCard">
            <div className="supportMiniIcon">💬</div>
            <strong>General guidance</strong>
            <span>Questions about features, setup, and how to use the app better.</span>
          </div>
        </div>
      </div>
    </div>
  )
}


export function SuperAdminView({ admin, embedded = false, hideAudit = false }: { admin: ReturnType<typeof useSuperAdmin>; embedded?: boolean; hideAudit?: boolean }) {
  const selectedUser = admin.selectedUser
  const [draftRole, setDraftRole] = useState<UserRole>('user')
  const [draftActive, setDraftActive] = useState(true)
  const [draftFeatures, setDraftFeatures] = useState<FeatureAccess>(admin.defaultFeatureAccess)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all')

  useEffect(() => {
    if (!selectedUser) return
    setDraftRole(selectedUser.role)
    setDraftActive(selectedUser.is_active)
    setDraftFeatures({ ...admin.defaultFeatureAccess, ...(selectedUser.feature_access ?? {}) })
  }, [selectedUser, admin.defaultFeatureAccess])

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return admin.managedUsers.filter((user) => {
      const matchesSearch = !query || user.email.toLowerCase().includes(query)
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? user.is_active : !user.is_active)
      const matchesRole = roleFilter === 'all' || user.role === roleFilter
      return matchesSearch && matchesStatus && matchesRole
    })
  }, [admin.managedUsers, searchTerm, statusFilter, roleFilter])

  const dirty = !!selectedUser && (
    draftRole !== selectedUser.role ||
    draftActive !== selectedUser.is_active ||
    admin.featureKeys.some((key) => draftFeatures[key] !== ({ ...admin.defaultFeatureAccess, ...(selectedUser.feature_access ?? {}) })[key])
  )

  const saveUser = async () => {
    if (!selectedUser) return
    if (draftRole !== selectedUser.role || draftActive !== selectedUser.is_active) {
      await admin.updateManagedUser(selectedUser.id, { role: draftRole, is_active: draftActive })
    }
    const base = { ...admin.defaultFeatureAccess, ...(selectedUser.feature_access ?? {}) }
    const hasFeatureChanges = admin.featureKeys.some((key) => draftFeatures[key] !== base[key])
    if (hasFeatureChanges) {
      await admin.updateManagedFeatures(selectedUser.id, draftFeatures)
    }
  }

  const formatAuditAction = (action: string) => action.replaceAll('_', ' ').replace(/\w/g, (char) => char.toUpperCase())
  const renderAuditDetails = (details?: Record<string, unknown> | null) => {
    if (!details || Object.keys(details).length === 0) return 'No extra details recorded.'
    const parts = Object.entries(details).map(([key, value]) => `${key.replaceAll('_', ' ')}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`)
    return parts.join(' • ')
  }

  return (
    <div className="grid" style={{ gap: 14 }}>
      {!embedded && <div className="card superAdminHero">
        <div className="row between" style={{ gap: 12, alignItems: 'flex-start' }}>
          <div>
            <span className="badge"><ShieldCheck size={14} /> Super Admin mode</span>
            <h2 style={{ marginTop: 10 }}>Centralized access and feature control</h2>
            <div className="muted">Manage user roles, account status, and feature visibility from one protected admin surface.</div>
          </div>
          <button className="btn" onClick={() => void admin.refresh()} disabled={!!admin.busyAction}><RefreshCw size={16} /> Refresh</button>
        </div>
        {admin.error ? <div className="supportNotice" style={{ marginTop: 12 }}>{admin.error}</div> : null}
      </div>}

      <div className="grid cols2 adminMainGrid adminMainGridWide">
        <div className="card adminUserListCard">
          <div className="row between" style={{ marginBottom: 10, gap: 12, alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ marginBottom: 4 }}>User management</h3>
              <div className="muted">Search users, filter access levels, and open a user only when you need to manage them.</div>
            </div>
            <span className="badge"><Users size={14} /> {filteredUsers.length} shown</span>
          </div>
          <div className="adminToolbar">
            <label className="field adminSearchField">
              <span>Search users</span>
              <input className="input" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search by email" />
            </label>
            <label className="field adminCompactField">
              <span>Status</span>
              <select className="select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')}>
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label className="field adminCompactField">
              <span>Role</span>
              <select className="select" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as 'all' | UserRole)}>
                <option value="all">All roles</option>
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </label>
          </div>
          <div className="adminUserList adminUserListTall">
            {filteredUsers.length === 0 ? <div className="muted">No users match this search.</div> : filteredUsers.map((user) => (
              <button key={user.id} className={`adminUserRow ${admin.selectedUserId === user.id ? 'active' : ''}`} onClick={() => admin.setSelectedUserId(admin.selectedUserId === user.id ? null : user.id)}>
                <div>
                  <strong>{user.email}</strong>
                  <div className="muted adminSubRow">{user.role.replace('_', ' ')} • {user.is_active ? 'Active' : 'Inactive'}</div>
                </div>
                <span className={`badge ${user.is_active ? '' : 'dangerOutline'}`}>{user.is_active ? 'Live' : 'Paused'}</span>
              </button>
            ))}
          </div>
        </div>

        {selectedUser ? (
          <div className="card adminDetailCard adminDetailScrollable">
            <div className="adminDetailInner">
              <div className="row between" style={{ gap: 12, marginBottom: 14, alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ marginBottom: 4 }}>Admin controls</h3>
                  <div className="muted">{selectedUser.email}</div>
                </div>
                <div className="row gap" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="badge"><Lock size={14} /> Protected controls</span>
                  <button className="btn" onClick={() => admin.setSelectedUserId(null)}>Close</button>
                </div>
              </div>

              <div className="grid cols2" style={{ marginBottom: 14 }}>
                <label className="field">
                  <span>Role</span>
                  <select className="select" value={draftRole} onChange={(event) => setDraftRole(event.target.value as UserRole)}>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </label>
                <div className="field">
                  <span>Account status</span>
                  <button className={`btn ${draftActive ? 'primary' : 'danger'}`} onClick={() => setDraftActive((current) => !current)}>
                    {draftActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />} {draftActive ? 'Active' : 'Inactive'}
                  </button>
                </div>
              </div>

              <div className="row gap" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
                <button className="btn" onClick={() => setDraftFeatures({ ...admin.defaultFeatureAccess })}>Enable all features</button>
                <button className="btn" onClick={() => setDraftFeatures({ ...admin.defaultFeatureAccess, reports: false, goals: false, advice: false, converter: false })}>Starter access</button>
                <button className="btn" onClick={() => setDraftFeatures({ ...admin.defaultFeatureAccess, dashboard: true, settings: true, support: true, transactions: false, categories: false, recurring: false, reports: false, goals: false, advice: false, converter: false })}>Read-only lite</button>
              </div>

              <div className="adminFeatureGrid">
                {admin.featureKeys.map((feature) => (
                  <label key={feature} className={`adminFeatureToggle ${draftFeatures[feature] ? 'on' : 'off'}`}>
                    <div>
                      <strong>{feature.replace('_', ' ')}</strong>
                      <small>{draftFeatures[feature] ? 'Visible for this user' : 'Hidden from this user'}</small>
                    </div>
                    <input type="checkbox" checked={draftFeatures[feature]} onChange={(event) => setDraftFeatures((current) => ({ ...current, [feature]: event.target.checked }))} />
                  </label>
                ))}
              </div>

              <div className="row between adminDetailFooter" style={{ marginTop: 16, gap: 12 }}>
                <div className="muted">User ID: <code>{selectedUser.id}</code></div>
                <button className="btn primary" onClick={() => void saveUser()} disabled={!dirty || !!admin.busyAction}>
                  {admin.busyAction ? 'Saving…' : 'Save admin changes'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="card adminDetailCard adminEmptyState">
            <div className="adminEmptyIcon"><ShieldCheck size={24} /></div>
            <h3>Select a user</h3>
            <div className="muted">Choose any account from the user list to open the protected admin controls panel.</div>
          </div>
        )}
      </div>

      {!hideAudit ? <AdminAuditLogPanel admin={admin} /> : null}
    </div>
  )
}
