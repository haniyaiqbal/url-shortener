import { useState, type FormEvent } from 'react'
import { api } from '../api'

export function AuthForm({ onSignedIn }: { onSignedIn: (token: string) => void }) {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const call = mode === 'sign-in' ? api.signIn : api.signUp
      const { accessToken } = await call(email, password)
      onSignedIn(accessToken)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="card auth" onSubmit={submit}>
      <h2>{mode === 'sign-in' ? 'Sign in' : 'Create an account'}</h2>
      <label>
        Email
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label>
        Password
        <input
          type="password"
          required
          minLength={mode === 'sign-up' ? 10 : 1}
          autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {mode === 'sign-up' && <p className="hint">At least 10 characters.</p>}
      {error && <p className="error" role="alert">{error}</p>}
      <button type="submit" disabled={busy}>
        {busy ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Sign up'}
      </button>
      <button
        type="button"
        className="link-button"
        onClick={() => {
          setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')
          setError(null)
        }}
      >
        {mode === 'sign-in' ? 'New here? Create an account' : 'Have an account? Sign in'}
      </button>
    </form>
  )
}
