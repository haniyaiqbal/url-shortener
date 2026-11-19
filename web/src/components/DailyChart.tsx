import { useState } from 'react'

interface Day {
  day: string
  clicks: number
}

const WIDTH = 600
const HEIGHT = 160
const PAD = { top: 12, right: 8, bottom: 22, left: 32 }
const GAP = 2

/** Clicks per day for the last 30 days: one series, so no legend. */
export function DailyChart({ days }: { days: Day[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...days.map((d) => d.clicks))
  const ticks = niceTicks(max)
  const top = ticks[ticks.length - 1]
  const plotW = WIDTH - PAD.left - PAD.right
  const plotH = HEIGHT - PAD.top - PAD.bottom
  const slot = plotW / days.length
  const barW = Math.max(1, slot - GAP)
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH

  return (
    <figure className="chart">
      <figcaption>Clicks per day, last 30 days</figcaption>
      <div className="chart-frame">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Clicks per day, last 30 days">
          {ticks.map((t) => (
            <g key={t}>
              <line className="grid" x1={PAD.left} x2={WIDTH - PAD.right} y1={y(t)} y2={y(t)} />
              <text className="axis" x={PAD.left - 6} y={y(t)} dy="0.32em" textAnchor="end">
                {t}
              </text>
            </g>
          ))}
          {days.map((d, i) => {
            const x = PAD.left + i * slot + GAP / 2
            const h = (d.clicks / top) * plotH
            return (
              <g key={d.day}>
                {d.clicks > 0 && (
                  <path className="bar" d={roundedTopBar(x, PAD.top + plotH, barW, h)} opacity={hover === null || hover === i ? 1 : 0.45} />
                )}
                {/* Hit area is the whole column, bigger than the bar itself. */}
                <rect
                  x={PAD.left + i * slot}
                  y={PAD.top}
                  width={slot}
                  height={plotH}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                />
              </g>
            )
          })}
          {[0, Math.floor(days.length / 2), days.length - 1].map((i) =>
            days[i] ? (
              <text key={i} className="axis" x={PAD.left + i * slot + slot / 2} y={HEIGHT - 6} textAnchor="middle">
                {shortDate(days[i].day)}
              </text>
            ) : null,
          )}
        </svg>
        {hover !== null && days[hover] && (
          <div
            className="tooltip"
            style={{ left: `${((PAD.left + hover * slot + slot / 2) / WIDTH) * 100}%` }}
          >
            <strong>{days[hover].clicks}</strong> {days[hover].clicks === 1 ? 'click' : 'clicks'}
            <span>{shortDate(days[hover].day)}</span>
          </div>
        )}
      </div>
      <details>
        <summary>Show as table</summary>
        <table>
          <thead>
            <tr>
              <th>Day</th>
              <th>Clicks</th>
            </tr>
          </thead>
          <tbody>
            {days
              .filter((d) => d.clicks > 0)
              .map((d) => (
                <tr key={d.day}>
                  <td>{d.day}</td>
                  <td>{d.clicks}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}

/** A bar anchored to the baseline with 4px rounded corners on its top end only. */
function roundedTopBar(x: number, baseline: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h)
  const top = baseline - h
  return `M${x},${baseline} V${top + r} Q${x},${top} ${x + r},${top} H${x + w - r} Q${x + w},${top} ${x + w},${top + r} V${baseline} Z`
}

function niceTicks(max: number): number[] {
  const step = max <= 5 ? 1 : Math.pow(10, Math.floor(Math.log10(max))) * (max / Math.pow(10, Math.floor(Math.log10(max))) > 5 ? 2 : 1)
  const ticks = []
  for (let t = 0; t < max + step; t += step) ticks.push(t)
  return ticks.slice(0, 7)
}

function shortDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}
