import { useState } from 'react'
import type { Link } from '../api'
import { StatsPanel } from './StatsPanel'

interface Props {
  links: Link[]
  onDelete: (link: Link) => void
}

export function LinkList({ links, onDelete }: Props) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  if (links.length === 0) {
    return <p className="card muted empty">No links yet. Shorten your first one above.</p>
  }

  async function copy(link: Link) {
    try {
      await navigator.clipboard.writeText(link.shortUrl)
      setCopiedId(link.id)
      setTimeout(() => setCopiedId(null), 1500)
    } catch {
      /* clipboard blocked: the link is still visible to copy by hand */
    }
  }

  return (
    <ul className="links">
      {links.map((link) => (
        <li key={link.id} className="card">
          <div className="link-row">
            <div className="link-text">
              <a href={link.shortUrl} target="_blank" rel="noreferrer" className="short">
                {link.shortUrl.replace(/^https?:\/\//, '')}
              </a>
              <span className="target" title={link.targetUrl}>
                {link.targetUrl}
              </span>
            </div>
            <span className="clicks">
              {link.clickCount} {link.clickCount === 1 ? 'click' : 'clicks'}
            </span>
            <div className="actions">
              <button type="button" className="secondary" onClick={() => copy(link)}>
                {copiedId === link.id ? 'Copied!' : 'Copy'}
              </button>
              <button
                type="button"
                className="secondary"
                aria-expanded={openId === link.id}
                onClick={() => setOpenId(openId === link.id ? null : link.id)}
              >
                {openId === link.id ? 'Hide stats' : 'Stats'}
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => {
                  if (confirm(`Delete ${link.shortUrl}?`)) onDelete(link)
                }}
              >
                Delete
              </button>
            </div>
          </div>
          {openId === link.id && <StatsPanel link={link} />}
        </li>
      ))}
    </ul>
  )
}
