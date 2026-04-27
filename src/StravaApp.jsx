import { useState, useEffect, useCallback } from 'react'

const CLIENT_ID = '228902'
const CLIENT_SECRET = '1524991602a55e9de6aed5ba03535e3b2b7d42fb'
const INITIAL_TOKENS = {
  accessToken: '16063584907a1da0a4659f7548e092f70c66df49',
  refreshToken: '9ccdee4fb1413fde0a3fa2972308f8d0a50d4578',
}

function fmtPace(mps) {
  if (!mps || mps === 0) return '--:--'
  const spk = 1000 / mps
  const m = Math.floor(spk / 60)
  const s = Math.floor(spk % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function fmtDist(m) {
  return (m / 1000).toFixed(2) + ' km'
}

function fmtTime(s) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`
  return `${m}:${sec.toString().padStart(2,'0')}`
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

export default function StravaApp({ onBack, dark, onToggleDark }) {
  const [tokens, setTokens] = useState(() => {
    try { return JSON.parse(localStorage.getItem('strava_tokens')) || INITIAL_TOKENS }
    catch { return INITIAL_TOKENS }
  })
  const [clubs, setClubs] = useState([])
  const [selectedClub, setSelectedClub] = useState(null)
  const [activities, setActivities] = useState([])
  const [members, setMembers] = useState([])
  const [tab, setTab] = useState('leaderboard')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refreshToken = useCallback(async (rt) => {
    const res = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: rt,
      }),
    })
    if (!res.ok) throw new Error('Gagal refresh token')
    const data = await res.json()
    const next = { accessToken: data.access_token, refreshToken: data.refresh_token }
    localStorage.setItem('strava_tokens', JSON.stringify(next))
    setTokens(next)
    return next.accessToken
  }, [])

  const get = useCallback(async (path, at) => {
    const res = await fetch(`https://www.strava.com/api/v3${path}`, {
      headers: { Authorization: `Bearer ${at}` },
    })
    if (res.status === 401) {
      const newAt = await refreshToken(tokens.refreshToken)
      const retry = await fetch(`https://www.strava.com/api/v3${path}`, {
        headers: { Authorization: `Bearer ${newAt}` },
      })
      if (!retry.ok) throw new Error(`API error ${retry.status}`)
      return retry.json()
    }
    if (!res.ok) throw new Error(`API error ${res.status}`)
    return res.json()
  }, [tokens.refreshToken, refreshToken])

  const loadClub = useCallback(async (club, at) => {
    const [acts, mems] = await Promise.allSettled([
      get(`/clubs/${club.id}/activities?per_page=50`, at),
      get(`/clubs/${club.id}/members?per_page=100`, at),
    ])
    const actData = acts.status === 'fulfilled' ? acts.value : []
    const memData = mems.status === 'fulfilled' ? mems.value : []
    setActivities(actData.filter(a => a.type === 'Run' || a.sport_type === 'Run'))
    setMembers(memData)
  }, [get])

  useEffect(() => {
    async function init() {
      setLoading(true)
      setError(null)
      try {
        const clubList = await get('/athlete/clubs', tokens.accessToken)
        setClubs(clubList)
        if (clubList.length > 0) {
          setSelectedClub(clubList[0])
          await loadClub(clubList[0], tokens.accessToken)
        }
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const handleSelectClub = async (club) => {
    if (selectedClub?.id === club.id) return
    setSelectedClub(club)
    setLoading(true)
    try {
      await loadClub(club, tokens.accessToken)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Build leaderboard from activities
  const leaderboard = Object.values(
    activities.reduce((acc, act) => {
      const key = `${act.athlete.firstname} ${act.athlete.lastname}`
      if (!acc[key]) acc[key] = { name: key, dist: 0, time: 0, runs: 0, topSpeed: 0 }
      acc[key].dist += act.distance
      acc[key].time += act.moving_time
      acc[key].runs += 1
      if (act.average_speed > acc[key].topSpeed) acc[key].topSpeed = act.average_speed
      return acc
    }, {})
  ).sort((a, b) => b.dist - a.dist)

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-orange-500 shadow-lg shadow-orange-200 dark:shadow-orange-900">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-white/20 text-white hover:bg-white/30 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-white leading-none truncate">
              {selectedClub ? selectedClub.name : 'Strava'}
            </h1>
            {selectedClub && (
              <p className="text-xs text-white/70 mt-0.5">{selectedClub.member_count} anggota</p>
            )}
          </div>
          <button
            onClick={onToggleDark}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-white/20 text-white hover:bg-white/30 transition-colors"
          >
            {dark ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-5 pb-10">

        {/* Club selector */}
        {clubs.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-hide">
            {clubs.map(c => (
              <button
                key={c.id}
                onClick={() => handleSelectClub(c)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selectedClub?.id === c.id
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-20">
            <p className="text-5xl mb-3 animate-bounce">🏃</p>
            <p className="text-sm text-gray-400">Mengambil data Strava...</p>
          </div>
        )}

        {/* Error */}
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
              {[
                { id: 'leaderboard', label: '🏆 Leaderboard' },
                { id: 'activities', label: '🕐 Aktivitas' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                    tab === t.id
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Leaderboard tab */}
            {tab === 'leaderboard' && (
              leaderboard.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-4xl mb-3">🏃</p>
                  <p className="text-sm">Belum ada data lari dari club ini</p>
                  <p className="text-xs mt-1 opacity-75">Scope akun mungkin perlu ditingkatkan ke activity:read</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((r, i) => (
                    <div key={r.name} className="flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3.5">
                      <span className="text-xl w-7 text-center flex-shrink-0">
                        {medals[i] ?? <span className="text-sm font-bold text-gray-300 dark:text-gray-600">{i + 1}</span>}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{r.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
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

            {/* Activities tab */}
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
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{fmtDate(act.start_date_local)}</span>
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
