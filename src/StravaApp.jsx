import { useState, useEffect, useCallback } from 'react'

const CLIENT_ID = '228902'
const CLIENT_SECRET = '1524991602a55e9de6aed5ba03535e3b2b7d42fb'
const INITIAL_TOKENS = {
  accessToken: '16063584907a1da0a4659f7548e092f70c66df49',
  refreshToken: '9ccdee4fb1413fde0a3fa2972308f8d0a50d4578',
}
const getAnthropicKey = () => localStorage.getItem('anthropic_key') || ''

// ── Cache helpers ─────────────────────────────────────────────
const todayStr = () => new Date().toISOString().slice(0, 10)

function loadCache() {
  try { return JSON.parse(localStorage.getItem('strava_cache')) || {} }
  catch { return {} }
}

function getCachedClub(clubId) {
  const c = loadCache()[String(clubId)]
  return c?.date === todayStr() ? c : null
}

function setCachedClub(clubId, payload) {
  const cache = loadCache()
  cache[String(clubId)] = { date: todayStr(), ...payload }
  localStorage.setItem('strava_cache', JSON.stringify(cache))
}

// ── Formatters ────────────────────────────────────────────────
function fmtPace(mps) {
  if (!mps) return '--:--'
  const s = 1000 / mps
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}
function fmtDist(m) { return (m / 1000).toFixed(2) + ' km' }
function fmtTime(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  return h > 0
    ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
    : `${m}:${String(sec).padStart(2,'0')}`
}
function fmtDate(d) {
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

// ── Claude insight generator ──────────────────────────────────
async function generateInsights(leaderboard) {
  const key = getAnthropicKey()
  if (!key) return {}

  const lines = leaderboard.map((r, i) =>
    `${i + 1}. ${r.name}: ${(r.dist/1000).toFixed(1)}km total, ${r.runs}x lari, best pace ${fmtPace(r.topSpeed)}/km, avg ${(r.dist/r.runs/1000).toFixed(1)}km/sesi, total waktu ${fmtTime(r.time)}`
  ).join('\n')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-allow-browser': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Kamu adalah analis performa lari yang ramah. Berikan 1 kalimat insight unik (maks 12 kata, bahasa Indonesia, nada sportif & supportif) untuk setiap pelari berdasarkan data di bawah. Fokus pada hal yang paling menonjol dari masing-masing orang dibanding grup.

Data pelari:
${lines}

Balas HANYA dengan JSON object: {"Nama Pelari": "kalimat insight", ...}`,
      }],
    }),
  })

  if (!res.ok) throw new Error(`Claude API ${res.status}`)
  const data = await res.json()
  const text = data.content[0].text.trim()
  // extract JSON even if wrapped in markdown
  const match = text.match(/\{[\s\S]*\}/)
  return match ? JSON.parse(match[0]) : {}
}

// ── Component ─────────────────────────────────────────────────
export default function StravaApp({ onBack, dark, onToggleDark }) {
  const [anthropicKey, setAnthropicKey] = useState(getAnthropicKey)
  const [keyInput, setKeyInput] = useState('')
  const [showKeySetup, setShowKeySetup] = useState(!getAnthropicKey())
  const [tokens, setTokens] = useState(() => {
    try { return JSON.parse(localStorage.getItem('strava_tokens')) || INITIAL_TOKENS }
    catch { return INITIAL_TOKENS }
  })

  const [clubs, setClubs] = useState([])
  const [selectedClub, setSelectedClub] = useState(null)
  const [activities, setActivities] = useState([])
  const [members, setMembers] = useState([])
  const [insights, setInsights] = useState({})
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [tab, setTab] = useState('leaderboard')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [cacheHit, setCacheHit] = useState(false)

  // ── Strava API ──
  const refreshAccessToken = useCallback(async (rt) => {
    const res = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: 'refresh_token', refresh_token: rt }),
    })
    if (!res.ok) throw new Error('Gagal refresh token')
    const d = await res.json()
    const next = { accessToken: d.access_token, refreshToken: d.refresh_token }
    localStorage.setItem('strava_tokens', JSON.stringify(next))
    setTokens(next)
    return next.accessToken
  }, [])

  const stravaGet = useCallback(async (path, at) => {
    const res = await fetch(`https://www.strava.com/api/v3${path}`, {
      headers: { Authorization: `Bearer ${at}` },
    })
    if (res.status === 401) {
      const newAt = await refreshAccessToken(tokens.refreshToken)
      const retry = await fetch(`https://www.strava.com/api/v3${path}`, {
        headers: { Authorization: `Bearer ${newAt}` },
      })
      if (!retry.ok) throw new Error(`Strava API error ${retry.status}`)
      return retry.json()
    }
    if (!res.ok) throw new Error(`Strava API error ${res.status}`)
    return res.json()
  }, [tokens.refreshToken, refreshAccessToken])

  // ── Load club data (with cache) ──
  const loadClub = useCallback(async (club, at) => {
    const cached = getCachedClub(club.id)
    if (cached) {
      setActivities(cached.activities)
      setMembers(cached.members)
      setInsights(cached.insights || {})
      setCacheHit(true)
      return
    }

    setCacheHit(false)
    const [actsRes, memsRes] = await Promise.allSettled([
      stravaGet(`/clubs/${club.id}/activities?per_page=50`, at),
      stravaGet(`/clubs/${club.id}/members?per_page=100`, at),
    ])
    const acts = (actsRes.status === 'fulfilled' ? actsRes.value : [])
      .filter(a => a.type === 'Run' || a.sport_type === 'Run')
    const mems = memsRes.status === 'fulfilled' ? memsRes.value : []

    setActivities(acts)
    setMembers(mems)
    // Save to cache without insights first
    setCachedClub(club.id, { activities: acts, members: mems, insights: {} })
    return { acts, mems }
  }, [stravaGet])

  // ── Initial load ──
  useEffect(() => {
    async function init() {
      setLoading(true)
      setError(null)
      try {
        const clubList = await stravaGet('/athlete/clubs', tokens.accessToken)
        setClubs(clubList)
        if (clubList.length > 0) {
          setSelectedClub(clubList[0])
          const result = await loadClub(clubList[0], tokens.accessToken)
          // Generate insights only on fresh fetch (cache miss)
          if (result) {
            const lb = buildLeaderboard(result.acts)
            if (lb.length > 0) {
              setInsightsLoading(true)
              try {
                const ins = await generateInsights(lb)
                setInsights(ins)
                setCachedClub(clubList[0].id, { activities: result.acts, members: result.mems, insights: ins })
              } catch (e) {
                console.warn('Insight generation failed:', e)
              } finally {
                setInsightsLoading(false)
              }
            }
          }
        }
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  // ── Switch club ──
  const handleSelectClub = async (club) => {
    if (selectedClub?.id === club.id) return
    setSelectedClub(club)
    setLoading(true)
    setInsights({})
    try {
      const result = await loadClub(club, tokens.accessToken)
      if (result) {
        const lb = buildLeaderboard(result.acts)
        if (lb.length > 0) {
          setInsightsLoading(true)
          try {
            const ins = await generateInsights(lb)
            setInsights(ins)
            setCachedClub(club.id, { activities: result.acts, members: result.mems, insights: ins })
          } catch (e) {
            console.warn('Insight generation failed:', e)
          } finally {
            setInsightsLoading(false)
          }
        }
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Leaderboard builder ──
  function buildLeaderboard(acts) {
    return Object.values(
      (acts || activities).reduce((acc, act) => {
        const key = `${act.athlete.firstname} ${act.athlete.lastname}`
        if (!acc[key]) acc[key] = { name: key, dist: 0, time: 0, runs: 0, topSpeed: 0 }
        acc[key].dist += act.distance
        acc[key].time += act.moving_time
        acc[key].runs += 1
        if (act.average_speed > acc[key].topSpeed) acc[key].topSpeed = act.average_speed
        return acc
      }, {})
    ).sort((a, b) => b.dist - a.dist)
  }

  const leaderboard = buildLeaderboard(activities)
  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-orange-500 shadow-lg shadow-orange-200 dark:shadow-orange-900">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={onBack} className="w-9 h-9 rounded-full flex items-center justify-center bg-white/20 text-white hover:bg-white/30 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-white leading-none truncate">
              {selectedClub ? selectedClub.name : 'Strava'}
            </h1>
            <p className="text-xs text-white/70 mt-0.5">
              {cacheHit ? `📦 Cache · ${todayStr()}` : selectedClub ? `${selectedClub.member_count} anggota` : ''}
            </p>
          </div>
          <button onClick={onToggleDark} className="w-9 h-9 rounded-full flex items-center justify-center bg-white/20 text-white hover:bg-white/30 transition-colors">
            {dark ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-5 pb-10">
        {/* One-time API key setup */}
        {showKeySetup && (
          <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-2xl p-4 mb-4">
            <p className="text-sm font-semibold text-orange-700 dark:text-orange-300 mb-1">🔑 Setup AI Insights</p>
            <p className="text-xs text-orange-500 dark:text-orange-400 mb-3">Masukkan Anthropic API key untuk mengaktifkan analisis AI. Disimpan hanya di browser ini.</p>
            <div className="flex gap-2">
              <input
                type="password"
                value={keyInput}
                onChange={e => setKeyInput(e.target.value)}
                placeholder="sk-ant-api03-..."
                className="flex-1 px-3 py-2 rounded-xl text-xs border border-orange-200 dark:border-orange-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <button
                onClick={() => {
                  if (keyInput.trim()) {
                    localStorage.setItem('anthropic_key', keyInput.trim())
                    setAnthropicKey(keyInput.trim())
                    setShowKeySetup(false)
                  }
                }}
                className="px-3 py-2 rounded-xl bg-orange-500 text-white text-xs font-medium hover:bg-orange-600 transition-colors"
              >
                Simpan
              </button>
              <button
                onClick={() => setShowKeySetup(false)}
                className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 text-xs hover:bg-gray-200 transition-colors"
              >
                Skip
              </button>
            </div>
          </div>
        )}

        {/* Club selector */}
        {clubs.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
            {clubs.map(c => (
              <button key={c.id} onClick={() => handleSelectClub(c)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selectedClub?.id === c.id
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                {c.name}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="text-center py-20">
            <p className="text-5xl mb-3 animate-bounce">🏃</p>
            <p className="text-sm text-gray-400">Mengambil data Strava...</p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-100 dark:border-red-900 rounded-2xl p-5 text-center">
            <p className="text-2xl mb-2">⚠️</p>
            <p className="text-sm font-semibold text-red-500 mb-1">Gagal memuat data</p>
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: 'Anggota', value: members.length || selectedClub?.member_count || '-' },
                { label: 'Aktivitas', value: activities.length },
                { label: 'Total KM', value: Math.round(activities.reduce((s, a) => s + a.distance, 0) / 1000) },
              ].map(s => (
                <div key={s.label} className="bg-orange-50 dark:bg-orange-950 rounded-2xl p-3 text-center">
                  <p className="text-2xl font-bold text-orange-500 leading-none mb-1">{s.value}</p>
                  <p className="text-xs text-orange-400 font-medium">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-2xl p-1 mb-4">
              {[{ id: 'leaderboard', label: '🏆 Leaderboard' }, { id: 'activities', label: '🕐 Aktivitas' }].map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                    tab === t.id
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Leaderboard */}
            {tab === 'leaderboard' && (
              leaderboard.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-4xl mb-3">🏃</p>
                  <p className="text-sm">Belum ada data lari dari club ini</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((r, i) => (
                    <div key={r.name} className="flex items-start gap-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3.5">
                      <span className="text-xl w-7 text-center flex-shrink-0 mt-0.5">
                        {medals[i] !== undefined ? medals[i] : <span className="text-sm font-bold text-gray-300 dark:text-gray-600">{i + 1}</span>}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{r.name}</p>
                        {/* AI Insight */}
                        {insightsLoading ? (
                          <p className="text-xs text-gray-300 dark:text-gray-600 mt-0.5 italic">Menganalisis...</p>
                        ) : insights[r.name] ? (
                          <p className="text-xs text-orange-500/80 dark:text-orange-400/80 mt-0.5 italic leading-snug">✦ {insights[r.name]}</p>
                        ) : null}
                        <p className="text-xs text-gray-400 mt-1">
                          {r.runs}x lari · best pace {fmtPace(r.topSpeed)}/km
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-orange-500">{(r.dist / 1000).toFixed(1)} km</p>
                        <p className="text-xs text-gray-400">{fmtTime(r.time)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Activities */}
            {tab === 'activities' && (
              activities.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-4xl mb-3">🏃</p>
                  <p className="text-sm">Belum ada aktivitas lari</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activities.map((act, i) => (
                    <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                          {act.athlete.firstname} {act.athlete.lastname}
                        </p>
                        <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{fmtDate(act.start_date_local)}</span>
                      </div>
                      <p className="text-xs text-gray-400 mb-2 truncate">{act.name}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                        <span className="font-bold text-orange-500">{fmtDist(act.distance)}</span>
                        <span className="text-gray-500">⏱ {fmtTime(act.moving_time)}</span>
                        <span className="text-gray-500">⚡ {fmtPace(act.average_speed)}/km</span>
                        {act.total_elevation_gain > 0 && (
                          <span className="text-gray-500">↗ {Math.round(act.total_elevation_gain)}m</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </>
        )}
      </main>
    </div>
  )
}
