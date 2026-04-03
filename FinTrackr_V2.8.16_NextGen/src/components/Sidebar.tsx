import React, { useEffect, useMemo, useState } from 'react'
import { BarChart3, ListChecks, Tags, Settings, LogOut, Menu, Cloud, ArrowLeftRight, Repeat, FileText, Target, Sparkles, LifeBuoy } from 'lucide-react'
import { FeatureAccess, SyncState } from '../types'

export type ViewKey = 'dashboard' | 'transactions' | 'categories' | 'recurring' | 'reports' | 'goals' | 'advice' | 'support' | 'converter' | 'settings' | 'super_admin'

const NAV_ITEMS: Array<{ key: Exclude<ViewKey, 'super_admin'>; label: string; icon: React.ReactNode; feature: keyof FeatureAccess }> = [
  { key: 'dashboard', label: 'Dashboard', icon: <BarChart3 size={18} />, feature: 'dashboard' },
  { key: 'transactions', label: 'Transactions', icon: <ListChecks size={18} />, feature: 'transactions' },
  { key: 'categories', label: 'Categories', icon: <Tags size={18} />, feature: 'categories' },
  { key: 'recurring', label: 'Recurring', icon: <Repeat size={18} />, feature: 'recurring' },
  { key: 'reports', label: 'Reports', icon: <FileText size={18} />, feature: 'reports' },
  { key: 'goals', label: 'Goals', icon: <Target size={18} />, feature: 'goals' },
  { key: 'advice', label: 'Advice', icon: <Sparkles size={18} />, feature: 'advice' },
  { key: 'converter', label: 'Currency Converter', icon: <ArrowLeftRight size={18} />, feature: 'converter' },
  { key: 'settings', label: 'Settings', icon: <Settings size={18} />, feature: 'settings' },
]

export default function Sidebar(props: {
  collapsed: boolean
  setCollapsed: (v: boolean) => void
  view: ViewKey
  setView: (v: ViewKey) => void
  sync: SyncState
  onSignOut: () => void
  email?: string | null
  features: FeatureAccess
}) {
  const { collapsed, setCollapsed, view, setView, sync, onSignOut, email, features } = props
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const clock = useMemo(() => {
    const hour = now.getHours()
    const minute = now.getMinutes().toString().padStart(2, '0')
    const meridiem = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    const weekday = now.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase()
    const day = now.getDate().toString().padStart(2, '0')
    return {
      meridiem,
      time: `${hour12}:${minute}`,
      weekday,
      day,
    }
  }, [now])

  const syncLabel =
    sync === 'synced' ? 'Synced' :
    sync === 'syncing' ? 'Syncing…' :
    sync === 'pending' ? 'Unsaved changes' :
    sync === 'offline' ? 'Offline' : 'Sync error'

  const visibleItems = NAV_ITEMS.filter((item) => features[item.feature])

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="brand">
        <div className="brandTitle">
          <strong>FinTrackr</strong>
          <span>{email ?? 'Signed in'}</span>
        </div>
        <button className="btn" onClick={() => setCollapsed(!collapsed)} title="Collapse sidebar">
          <Menu size={18} />
        </button>
      </div>

      <div className="sidebarClock" aria-label="Current date and time">
        <div className="clockMain">
          <span className="clockMeridiem">{clock.meridiem}</span>
          <span className="clockTime">{clock.time}</span>
        </div>
        <div className="clockDate">
          <span>{clock.weekday}</span>
          <strong>{clock.day}</strong>
        </div>
      </div>

      <div className="nav">
        {visibleItems.map((item) => (
          <button key={item.key} className={view === item.key ? 'active' : ''} onClick={() => setView(item.key)}>
            {item.icon} <span className="navLabel">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="sidebarFooter">
        <span className="pill">
          <Cloud size={14} /> {syncLabel}
        </span>
        {features.support ? (
          <button className={`btn support ${view === 'support' ? 'active' : ''}`} onClick={() => setView('support')}>
            <LifeBuoy size={18} /> <span className="navLabel">Help & Support</span>
          </button>
        ) : null}
        <button className="btn danger" onClick={onSignOut}>
          <LogOut size={18} /> <span className="navLabel">Sign out</span>
        </button>
      </div>
    </aside>
  )
}
