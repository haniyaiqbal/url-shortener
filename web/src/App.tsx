import { useCallback, useEffect, useState } from 'react'
import { api, ApiError, session, type Link } from './api'
import { AuthForm } from './components/AuthForm'
import { LinkForm } from './components/LinkForm'
import { LinkList } from './components/LinkList'

export default function App() {
  const [email, setEmail] = useState<string | null>(null)
  const [links, setLinks] = useState<Link[]>([])
  const [checking, setChecking] = useState(Boolean(session.token))
  const [error, setError] = useState<string | null>(null)

  const signOut = useCallback(() => {
    session.clear()
    setEmail(null)
    setLinks([])
  }, [])

  const load = useCallback(async () => {
    try {
      const [me, list] = await Promise.all([api.me(), api.listLinks()])
      setEmail(me.email)
      setLinks(list.items)
      setError(null)
    } catch (err) {
      // An expired token just means signing in again.
      if (err instanceof ApiError && err.status === 401) signOut()
      else setError((err as Error).message)
    } finally {
      setChecking(false)
    }
  }, [signOut])

  // On page load, pick up where a saved session left off.
  useEffect(() => {
    if (!session.token) return
    Promise.resolve().then(load)
  }, [load])

  async function remove(link: Link) {
    try {
      await api.deleteLink(link.id)
      setLinks((all) => all.filter((l) => l.id !== link.id))
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <main>
      <header>
        <h1>
          <span aria-hidden="true">🔗</span> Shortener
        </h1>
        {email && (
          <div className="who">
            <span className="muted">{email}</span>
            <button type="button" className="secondary" onClick={() => void load()}>
              Refresh
            </button>
            <button type="button" className="secondary" onClick={signOut}>
              Sign out
            </button>
          </div>
        )}
      </header>

      {checking ? (
        <p className="muted">Loading…</p>
      ) : email ? (
        <>
          <LinkForm onCreated={(link) => setLinks((all) => [link, ...all])} />
          {error && <p className="error" role="alert">{error}</p>}
          <LinkList links={links} onDelete={remove} />
        </>
      ) : (
        <AuthForm
          onSignedIn={(token) => {
            session.save(token)
            void load()
          }}
        />
      )}
    </main>
  )
}
