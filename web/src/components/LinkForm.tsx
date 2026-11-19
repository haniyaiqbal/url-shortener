import { useState, type FormEvent } from 'react'
import { api, type Link } from '../api'

export function LinkForm({ onCreated }: { onCreated: (link: Link) => void }) {
  const [url, setUrl] = useState('')
  const [alias, setAlias] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const link = await api.createLink(url.trim(), alias.trim() || undefined)
      onCreated(link)
      setUrl('')
      setAlias('')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="card link-form" onSubmit={submit}>
      <div className="row">
        <label className="grow">
          Long URL
          <input
            type="url"
            required
            placeholder="https://example.com/a/very/long/path"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </label>
        <label>
          <span>
            Custom alias <span className="muted">(optional)</span>
          </span>
          <input
            pattern="[A-Za-z0-9_\-]{3,32}"
            title="3-32 letters, numbers, - or _"
            placeholder="my-link"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
          />
        </label>
        <button type="submit" disabled={busy}>
          {busy ? 'Shortening…' : 'Shorten'}
        </button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
    </form>
  )
}
