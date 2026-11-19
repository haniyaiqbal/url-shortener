import { useEffect, useState } from 'react'
import { api, type Link, type LinkStats } from '../api'
import { DailyChart } from './DailyChart'

export function StatsPanel({ link }: { link: Link }) {
  // Refetch when the link changes or gets new clicks.
  const key = `${link.id}:${link.clickCount}`
  const [result, setResult] = useState<{
    key: string
    stats?: LinkStats
    error?: string
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .stats(link.id)
      .then((stats) => !cancelled && setResult({ key, stats }))
      .catch((err: Error) => !cancelled && setResult({ key, error: err.message }))
    return () => {
      cancelled = true
    }
  }, [link.id, key])

  if (result?.key !== key) return <p className="muted">Loading stats…</p>
  if (result.error || !result.stats) return <p className="error">{result.error}</p>
  const stats = result.stats

  return (
    <div className="stats">
      <div className="stat-tiles">
        <div className="tile">
          <span className="tile-label">Total clicks</span>
          <span className="tile-value">{stats.totalClicks}</span>
        </div>
        <Breakdown title="Top referrers" rows={stats.topReferrers.map((r) => [r.referrer, r.clicks])} />
        <Breakdown title="Devices" rows={stats.devices.map((d) => [d.device, d.clicks])} />
      </div>
      <DailyChart days={stats.daily} />
    </div>
  )
}

function Breakdown({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <div className="tile">
      <span className="tile-label">{title}</span>
      {rows.length === 0 ? (
        <span className="muted">No clicks yet</span>
      ) : (
        <ul className="breakdown">
          {rows.map(([name, count]) => (
            <li key={name}>
              <span>{name}</span>
              <span>{count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
