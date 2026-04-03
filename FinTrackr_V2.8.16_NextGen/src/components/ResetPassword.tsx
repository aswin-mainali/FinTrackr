import React, { useEffect, useState } from 'react'
import { Lock, MailCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const boot = async () => {
      const { data } = await supabase.auth.getSession()
      if (!active) return
      setReady(Boolean(data.session?.user))
    }

    void boot()

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return
      if (event === 'PASSWORD_RECOVERY' || Boolean(session?.user)) {
        setReady(true)
        setMsg(null)
      }
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)

    if (!ready) {
      setMsg('Open the reset link from your email first.')
      return
    }

    if (!password || !confirmPassword) {
      setMsg('Enter your new password in both fields.')
      return
    }

    if (password.length < 6) {
      setMsg('Password must be at least 6 characters.')
      return
    }

    if (password !== confirmPassword) {
      setMsg('Passwords do not match.')
      return
    }

    setBusy(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      await supabase.auth.signOut()
      setMsg('Password updated. You can now sign in with your new password.')
      setPassword('')
      setConfirmPassword('')
      setReady(false)
      window.setTimeout(() => {
        window.location.href = '/'
      }, 1200)
    } catch (err: any) {
      setMsg(err?.message ?? 'Could not reset password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="authWrap"><div style={{ maxWidth: 520, margin: '8vh auto', padding: 16 }}>
      <div className="card authCard">
        <div className="row space" style={{ marginBottom: 8 }}>
          <div>
            <h1 className="h1">Reset password</h1>
            <small>Set a new password for your FinTrackr account.</small>
          </div>
          <span className="badge"><MailCheck size={14}/> Recovery</span>
        </div>

        <form onSubmit={onSubmit} className="grid" style={{ gap: 10 }}>
          <label>
            <small>New password</small>
            <div className="row" style={{ marginTop: 6 }}>
              <span className="badge"><Lock size={14}/></span>
              <input
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                type="password"
              />
            </div>
          </label>

          <label>
            <small>Confirm new password</small>
            <div className="row" style={{ marginTop: 6 }}>
              <span className="badge"><Lock size={14}/></span>
              <input
                className="input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                type="password"
              />
            </div>
          </label>

          <div className="row" style={{ marginTop: 6 }}>
            <button className="btn primary" type="submit" disabled={busy}>
              {busy ? 'Please wait…' : 'Update password'}
            </button>
            <button className="btn ghost" type="button" onClick={() => { window.location.href = '/' }} disabled={busy}>
              Back to sign in
            </button>
          </div>

          {!ready ? (
            <div className="card" style={{ background: 'rgba(255,255,255,.03)' }}>
              Open the password reset link from your email. This page only works after that recovery link is opened.
            </div>
          ) : null}

          {msg ? <div className="card" style={{ background: 'rgba(255,255,255,.03)' }}>{msg}</div> : null}
        </form>
      </div>
    </div></div>
  )
}
