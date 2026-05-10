import { useState, useEffect, useCallback } from 'react'

const CLIENT_ID = '228902'
const CLIENT_SECRET = '1524991602a55e9de6aed5ba03535e3b2b7d42fb'
const FORCE_GET_PIN_HASH = '156de1bcf4f3aaab347cf1006e0a6ee135720e4c64312676138f77a9ed86e492'
const INITIAL_TOKENS = {
  accessToken: '16063584907a1da0a4659f7548e092f70c66df49',
  refreshToken: '9ccdee4fb1413fde0a3fa2972308f8d0a50d4578',
}

const memoryStorage = new Map()

function getStorageValue(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return memoryStorage.get(key) ?? null
  }
}

function setStorageValue(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    memoryStorage.set(key, value)
  }
}

const getAnthropicKey = () => getStorageValue('anthropic_key') || ''

// ── Cache helpers ─────────────────────────────────────────────
const PER_PAGE_OPTIONS = [25, 50, 100, 200]
const DEFAULT_LEADER_PER_PAGE = 200

const todayStr = () => new Date().toISOString().slice(0, 10)

function loadCache() {
  try { return JSON.parse(getStorageValue('strava_cache')) || {} }
  catch { return {} }
}

function hasAllPages(byPage) {
  if (!byPage) return false
  return PER_PAGE_OPTIONS.every(n => Array.isArray(byPage[n]))
}

// Returns cached entry only if TODAY and FULLY complete (all per_page sets + insights)
function getCompleteCache(clubId) {
  const c = loadCache()[String(clubId)]
  if (!c || c.date !== todayStr()) return null
  const hasInsights = Object.keys(c.insights || {}).length > 0
  return (hasAllPages(c.activitiesByPage) && hasInsights) ? c : null
}

// Returns cached entry if today, regardless of completeness
function getPartialCache(clubId) {
  const c = loadCache()[String(clubId)]
  return (c?.date === todayStr()) ? c : null
}

function setCachedClub(clubId, payload) {
  const cache = loadCache()
  cache[String(clubId)] = { date: todayStr(), ...payload }
  setStorageValue('strava_cache', JSON.stringify(cache))
}

// ── Formatters ────────────────────────────────────────────────
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

// Strava ClubActivity has no average_speed; compute pace from distance + moving_time.
function fmtPace(distance, seconds) {
  if (!distance || distance < 1 || !seconds || seconds <= 0) return '-'
  const secPerKm = (seconds * 1000) / distance
  if (!Number.isFinite(secPerKm)) return '-'
  const m = Math.floor(secPerKm / 60)
  const s = Math.round(secPerKm % 60)
  return s === 60
    ? `${m + 1}:00 /km`
    : `${m}:${String(s).padStart(2, '0')} /km`
}

// Strava's /clubs/{id}/activities endpoint omits start_date_local entirely,
// so any date-based logic must degrade gracefully when the field is missing.
function hasDates(acts) {
  return (acts || []).some(a => {
    if (!a?.start_date_local) return false
    return !Number.isNaN(new Date(a.start_date_local).getTime())
  })
}

function dateRange(acts) {
  if (!acts || acts.length === 0) return null
  const times = acts
    .map(a => new Date(a.start_date_local).getTime())
    .filter(t => !Number.isNaN(t))
  if (times.length === 0) return null
  return { from: new Date(Math.min(...times)), to: new Date(Math.max(...times)) }
}

function buildLeaderboard(acts) {
  return Object.values(
    (acts || []).reduce((acc, act) => {
      const key = `${act.athlete.firstname} ${act.athlete.lastname}`
      if (!acc[key]) acc[key] = { name: key, dist: 0, time: 0, runs: 0 }
      acc[key].dist += act.distance
      acc[key].time += act.moving_time
      acc[key].runs += 1
      return acc
    }, {})
  ).sort((a, b) => b.dist - a.dist)
}

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// ── Claude insight generator ──────────────────────────────────
async function generateInsights(leaderboard) {
  const key = getAnthropicKey()
  if (!key) throw new Error('Anthropic API key belum disimpan')

  const lines = leaderboard.map((r, i) =>
    `${i + 1}. ${r.name}: total ${(r.dist/1000).toFixed(1)}km, ${r.runs}x lari, avg ${(r.dist/r.runs/1000).toFixed(1)}km/sesi, pace ${fmtPace(r.dist, r.time)}, total waktu ${fmtTime(r.time)}`
  ).join('\n')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Kamu adalah analis performa lari yang ramah. Berikan 1 kalimat insight unik (maks 12 kata, bahasa Indonesia, nada sportif & supportif) untuk setiap pelari. Fokus hal paling menonjol dari masing-masing orang dibanding grup.

Data pelari:
${lines}

PENTING: Gunakan nama persis sama (sama persis huruf kapital/kecilnya) seperti di data sebagai key JSON.
Balas HANYA dengan JSON object: {"Nama Pelari": "kalimat insight", ...}`,
      }],
    }),
  })

  if (!res.ok) throw new Error(`Claude API ${res.status}`)
  const data = await res.json()
  const text = data?.content?.map(part => part?.text ?? '').join('\n').trim() || ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Respons Claude tidak berisi JSON')
  return JSON.parse(match[0])
}

// ── Main component ────────────────────────────────────────────
export default function StravaApp({ onBack, dark, onToggleDark }) {
  const [tokens, setTokens] = useState(() => {
    try { return JSON.parse(localStorage.getItem('strava_tokens')) || INITIAL_TOKENS }
    catch { return INITIAL_TOKENS }
  })
  const [clubs, setClubs] = useState([])
  const [selectedClub, setSelectedClub] = useState(null)
  const [activitiesByPage, setActivitiesByPage] = useState({})
  const [leaderPerPage, setLeaderPerPage] = useState(DEFAULT_LEADER_PER_PAGE)
  const [members, setMembers] = useState([])
  const [insights, setInsights] = useState({})
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [tab, setTab] = useState('leaderboard')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [cacheHit, setCacheHit] = useState(false)
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [keyDraft, setKeyDraft] = useState('')
  const [insightError, setInsightError] = useState('')
  const [showForceGet, setShowForceGet] = useState(false)
  const [pinDraft, setPinDraft] = useState('')
  const [pinError, setPinError] = useState('')
  const [forceGetLoading, setForceGetLoading] = useState(false)
  const [showMembers, setShowMembers] = useState(false)

  // Case-insensitive insight lookup — guards against Claude changing capitalisation
  const getInsight = (name) => {
    if (!name) return null
    const lower = name.toLowerCase().trim()
    const entry = Object.entries(insights).find(([k]) => k.toLowerCase().trim() === lower)
    return entry?.[1] || null
  }

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
    let res = await fetch(`https://www.strava.com/api/v3${path}`, {
      headers: { Authorization: `Bearer ${at}` },
    })
    if (res.status === 401) {
      const newAt = await refreshAccessToken(tokens.refreshToken)
      res = await fetch(`https://www.strava.com/api/v3${path}`, {
        headers: { Authorization: `Bearer ${newAt}` },
      })
    }
    if (!res.ok) throw new Error(`Strava API error ${res.status}`)
    return res.json()
  }, [tokens.refreshToken, refreshAccessToken])

  // ── Fetch insights from Claude and save to cache ──
  const fetchInsights = useCallback(async (byPage, mems, club) => {
    const lb = buildLeaderboard(byPage[DEFAULT_LEADER_PER_PAGE] || [])
    if (lb.length === 0) return
    setInsightsLoading(true)
    setInsightError('')
    try {
      const ins = await generateInsights(lb)
      setInsights(ins)
      setCachedClub(club.id, { activitiesByPage: byPage, members: mems, insights: ins })
    } catch (e) {
      console.warn('Insight error:', e)
      setInsightError(e?.message || 'Gagal mengambil insight AI')
      setInsights({})
      setCachedClub(club.id, { activitiesByPage: byPage, members: mems, insights: {} })
    } finally {
      setInsightsLoading(false)
    }
  }, [])

  // Fan-out: hit /activities once per per_page option in parallel + members in parallel
  const fetchAllPages = useCallback(async (clubId, at) => {
    const [memsRes, ...actsResults] = await Promise.allSettled([
      stravaGet(`/clubs/${clubId}/members?per_page=100`, at),
      ...PER_PAGE_OPTIONS.map(n => stravaGet(`/clubs/${clubId}/activities?per_page=${n}`, at)),
    ])
    const byPage = {}
    PER_PAGE_OPTIONS.forEach((n, i) => {
      const r = actsResults[i]
      byPage[n] = (r.status === 'fulfilled' ? r.value : [])
        .filter(a => a.type === 'Run' || a.sport_type === 'Run')
    })
    const mems = memsRes.status === 'fulfilled' ? memsRes.value : []
    return { byPage, mems }
  }, [stravaGet])

  // ── Load club data ──
  // Strategy:
  //   complete cache (all per_page sets + insights) → show instantly, no API call
  //   partial cache  (all per_page sets, no insights) → show activities, re-call Claude
  //   no cache or stale shape → fan-out fetch all per_page sets + call Claude
  const loadClub = useCallback(async (club, at) => {
    // 1. Complete cache hit → fully from cache
    const complete = getCompleteCache(club.id)
    if (complete) {
      setActivitiesByPage(complete.activitiesByPage)
      setMembers(complete.members)
      setInsights(complete.insights)
      setInsightError('')
      setCacheHit(true)
      return
    }

    setCacheHit(false)

    // 2. Partial cache → use cached Strava data, only re-call Claude
    const partial = getPartialCache(club.id)
    if (hasAllPages(partial?.activitiesByPage)) {
      setActivitiesByPage(partial.activitiesByPage)
      setMembers(partial.members || [])
      setInsights({})
      setInsightError('')
      await fetchInsights(partial.activitiesByPage, partial.members || [], club)
      return
    }

    // 3. Full cache miss → fan-out fetch all per_page sets
    const { byPage, mems } = await fetchAllPages(club.id, at)
    setActivitiesByPage(byPage)
    setMembers(mems)
    setInsightError('')
    // Save Strava data first so partial cache exists even if Claude fails
    setCachedClub(club.id, { activitiesByPage: byPage, members: mems, insights: {} })
    await fetchInsights(byPage, mems, club)
  }, [fetchAllPages, fetchInsights])

  const forceRefreshClub = async () => {
    if (!selectedClub) return
    setForceGetLoading(true)
    setPinError('')
    setError(null)
    setLoading(true)
    setCacheHit(false)
    try {
      const { byPage, mems } = await fetchAllPages(selectedClub.id, tokens.accessToken)
      setActivitiesByPage(byPage)
      setMembers(mems)
      setCachedClub(selectedClub.id, { activitiesByPage: byPage, members: mems, insights: {} })
      await fetchInsights(byPage, mems, selectedClub)
    } catch (e) {
      setError(e?.message || 'Gagal memuat data terbaru')
    } finally {
      setLoading(false)
      setForceGetLoading(false)
      setShowForceGet(false)
      setPinDraft('')
    }
  }

  const handleForceGetConfirm = async () => {
    const pin = pinDraft.trim()
    if (!/^\d{6}$/.test(pin)) {
      setPinError('PIN harus 6 angka')
      return
    }
    const hashed = await sha256Hex(pin)
    if (hashed !== FORCE_GET_PIN_HASH) {
      setPinError('PIN salah')
      return
    }
    await forceRefreshClub()
  }

  // ── Init ──
  // Intentionally run once on mount; subsequent token refreshes are handled
  // inside the Strava request helpers.
  useEffect(() => {
    async function init() {
      setLoading(true)
      setError(null)
      try {
        const clubList = await stravaGet('/athlete/clubs', tokens.accessToken)
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
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Switch club ──
  const handleSelectClub = async (club) => {
    if (selectedClub?.id === club.id) return
    setSelectedClub(club)
    setInsights({})
    setLoading(true)
    try {
      await loadClub(club, tokens.accessToken)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Save API key → clear insight cache → re-generate ──
  const saveKey = async () => {
    const k = keyDraft.trim()
    if (!k) return
    setStorageValue('anthropic_key', k)
    setKeyDraft('')
    setShowKeyInput(false)
    if (selectedClub) {
      const partial = getPartialCache(selectedClub.id)
      const byPage = hasAllPages(partial?.activitiesByPage) ? partial.activitiesByPage : activitiesByPage
      const mems = partial?.members || members
      setCachedClub(selectedClub.id, { activitiesByPage: byPage, members: mems, insights: {} })
      await fetchInsights(byPage, mems, selectedClub)
    }
  }

  // Top stats, Rekap, and Activities tab use the full (200) set; only the
  // Leaderboard tab varies with the leaderPerPage sub-filter.
  const activities = activitiesByPage[DEFAULT_LEADER_PER_PAGE] || []
  const leaderActivities = activitiesByPage[leaderPerPage] || activities
  const leaderboard = buildLeaderboard(leaderActivities)
  const leaderboardAll = buildLeaderboard(activities)
  const medals = ['🥇', '🥈', '🥉']
  const hasKey = !!getAnthropicKey()
  const totalDist = activities.reduce((s, a) => s + a.distance, 0)
  const totalTime = activities.reduce((s, a) => s + a.moving_time, 0)
  const totalElev = activities.reduce((s, a) => s + (a.total_elevation_gain || 0), 0)
  const longestRun = activities.reduce((m, a) => Math.max(m, a.distance), 0)

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
          <button
            onClick={() => { setShowKeyInput(v => !v); setKeyDraft('') }}
            title={hasKey ? 'Ganti API key' : 'Setup API key'}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors text-lg leading-none ${
              hasKey ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-white text-orange-500 animate-pulse'
            }`}
          >
            🔑
          </button>
          <button
            onClick={() => { setShowForceGet(v => !v); setPinError(''); setPinDraft('') }}
            title="Paksa refresh Strava"
            className="w-9 h-9 rounded-full flex items-center justify-center bg-white/20 text-white hover:bg-white/30 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-3-6.7" />
              <polyline points="21 3 21 9 15 9" />
            </svg>
          </button>
          <button onClick={onToggleDark} className="w-9 h-9 rounded-full flex items-center justify-center bg-white/20 text-white hover:bg-white/30 transition-colors text-lg leading-none">
            {dark ? '☀️' : '🌙'}
          </button>
        </div>
        {showForceGet && (
          <div className="max-w-lg mx-auto px-4 pb-3">
            <div className="flex gap-2">
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pinDraft}
                onChange={e => setPinDraft(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={e => e.key === 'Enter' && handleForceGetConfirm()}
                placeholder="Masukkan PIN"
                className="flex-1 px-3 py-2 rounded-xl text-sm bg-white/20 text-white placeholder-white/60 border border-white/30 focus:outline-none focus:border-white/70"
              />
              <button
                onClick={handleForceGetConfirm}
                disabled={forceGetLoading}
                className="px-3 py-2 rounded-xl bg-white text-orange-500 text-sm font-bold hover:bg-orange-50 disabled:opacity-60 transition-colors"
              >
                OK
              </button>
            </div>
            {pinError && (
              <p className="mt-1 text-xs text-white/90">{pinError}</p>
            )}
          </div>
        )}

        {/* Inline key input */}
        {showKeyInput && (
          <div className="px-4 pb-3 flex gap-2">
            <input
              type="password"
              value={keyDraft}
              onChange={e => setKeyDraft(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveKey()}
              placeholder={hasKey ? 'Masukkan key baru...' : 'sk-ant-api03-...'}
              autoFocus
              className="flex-1 px-3 py-2 rounded-xl text-xs bg-white/20 text-white placeholder-white/50 border border-white/30 focus:outline-none focus:border-white/70"
            />
            <button onClick={saveKey} className="px-3 py-2 rounded-xl bg-white text-orange-500 text-xs font-bold hover:bg-orange-50 transition-colors">
              Simpan
            </button>
          </div>
        )}
      </header>

      <main className="max-w-lg mx-auto px-4 pt-5 pb-10">

        {/* No key banner */}
        {!hasKey && !showKeyInput && !loading && (
          <button onClick={() => setShowKeyInput(true)}
            className="w-full mb-4 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-2xl p-3 text-left flex items-center gap-3">
            <span className="text-xl">🔑</span>
            <div className="flex-1">
              <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">AI Insights belum aktif</p>
              <p className="text-xs text-orange-400">Tap untuk masukkan Anthropic API key</p>
            </div>
            <span className="text-orange-400 text-xs">→</span>
          </button>
        )}

        {insightError && !loading && (
          <div className="w-full mb-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-2xl p-3">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">AI Insights gagal dimuat</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{insightError}</p>
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
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: 'Pelari Aktif', value: leaderboardAll.length },
                { label: 'Aktivitas', value: activities.length },
                { label: 'Total KM', value: Math.round(totalDist / 1000) },
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
                { id: 'recap', label: '📊 Rekap' },
                { id: 'activities', label: '🕐 Aktivitas' },
              ].map(t => (
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
              <>
                {/* Per-page sub-filter — switches which Strava /activities payload feeds the leaderboard */}
                <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-2xl p-1 mb-3">
                  {PER_PAGE_OPTIONS.map(n => (
                    <button key={n} type="button" onClick={() => setLeaderPerPage(n)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        leaderPerPage === n
                          ? 'bg-white dark:bg-gray-700 text-orange-500 shadow-sm'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                      {n}
                    </button>
                  ))}
                </div>
                {leaderboard.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <p className="text-4xl mb-3">🏃</p>
                    <p className="text-sm">Belum ada data lari dari club ini</p>
                  </div>
                ) : (
                  <>
                    {(() => {
                      if (!hasDates(leaderActivities)) {
                        return (
                          <div className="mb-3 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                            <span>⚠</span>
                            <span>
                              Strava club API tidak menyertakan tanggal aktivitas, jadi filter periode tidak bisa diterapkan. Menampilkan {leaderActivities.length} aktivitas terbaru.
                            </span>
                          </div>
                        )
                      }
                      const range = dateRange(leaderActivities)
                      if (!range) return null
                      return (
                        <div className="mb-3 px-3 py-2 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-100 dark:border-orange-900 text-xs text-orange-600 dark:text-orange-300 flex items-center gap-2">
                          <span>📅</span>
                          <span>
                            {leaderActivities.length} aktivitas · <strong>{fmtDate(range.from)} – {fmtDate(range.to)}</strong>
                          </span>
                        </div>
                      )
                    })()}
                    <div className="space-y-2">
                      {leaderboard.map((r, i) => (
                        <div key={r.name} className="flex items-start gap-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3.5">
                          <span className="text-xl w-7 text-center flex-shrink-0 mt-0.5">
                            {medals[i] ?? <span className="text-sm font-bold text-gray-300 dark:text-gray-600">{i + 1}</span>}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{r.name}</p>
                            {insightsLoading ? (
                              <p className="text-xs text-orange-300 dark:text-orange-700 mt-0.5 italic">✦ Menganalisis...</p>
                            ) : getInsight(r.name) ? (
                              <p className="text-xs text-orange-500 dark:text-orange-400 mt-0.5 italic leading-snug">✦ {getInsight(r.name)}</p>
                            ) : null}
                            <p className="text-xs text-gray-400 mt-1">
                              {r.runs}x lari · avg {(r.dist / r.runs / 1000).toFixed(1)} km/sesi · {fmtPace(r.dist, r.time)}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold text-orange-500">{(r.dist / 1000).toFixed(1)} km</p>
                            <p className="text-xs text-gray-400">{fmtTime(r.time)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {/* Recap */}
            {tab === 'recap' && (
              <div className="space-y-3">
                {activities.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    <p className="text-4xl mb-3">🏃</p>
                    <p className="text-sm">Belum ada aktivitas</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Total Jarak', value: `${(totalDist/1000).toFixed(1)} km` },
                        { label: 'Total Durasi', value: fmtTime(totalTime) },
                        { label: 'Total Member', value: members.length || selectedClub?.member_count || '-', onClick: members.length ? () => setShowMembers(true) : null },
                        { label: 'Total Aktivitas', value: activities.length },
                        { label: 'Avg / Pelari', value: leaderboardAll.length ? `${(totalDist/leaderboardAll.length/1000).toFixed(1)} km` : '-' },
                        { label: 'Lari Terjauh', value: `${(longestRun/1000).toFixed(1)} km` },
                        { label: 'Avg / Sesi', value: activities.length ? `${(totalDist/activities.length/1000).toFixed(1)} km` : '-' },
                        { label: 'Avg Pace', value: fmtPace(totalDist, totalTime) },
                        { label: 'Total Elev.', value: `${Math.round(totalElev)} m` },
                      ].map(s => {
                        const baseClass = 'bg-orange-50 dark:bg-orange-950 rounded-2xl p-3 text-center'
                        const inner = (
                          <>
                            <p className="text-lg font-bold text-orange-500 leading-tight mb-1">{s.value}</p>
                            <p className="text-xs text-orange-400 font-medium">{s.label}</p>
                          </>
                        )
                        return s.onClick ? (
                          <button
                            key={s.label}
                            type="button"
                            onClick={s.onClick}
                            className={`${baseClass} relative ring-1 ring-orange-200 dark:ring-orange-800/60 hover:bg-orange-100 dark:hover:bg-orange-900 active:scale-[0.98] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400`}
                            aria-label={`${s.label} — lihat daftar`}
                          >
                            <span
                              aria-hidden="true"
                              className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-orange-500 text-white text-[10px] leading-none flex items-center justify-center shadow-sm"
                            >
                              ›
                            </span>
                            {inner}
                          </button>
                        ) : (
                          <div key={s.label} className={baseClass}>
                            {inner}
                          </div>
                        )
                      })}
                    </div>

                    {leaderboardAll.length > 0 && (
                      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3">
                        <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 mb-2">Top 3 Pelari</p>
                        <div className="space-y-2">
                          {leaderboardAll.slice(0, 3).map((r, i) => (
                            <div key={r.name} className="flex items-center gap-3">
                              <span className="text-lg w-6 text-center flex-shrink-0">{medals[i]}</span>
                              <p className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{r.name}</p>
                              <p className="text-sm font-bold text-orange-500 flex-shrink-0">{(r.dist/1000).toFixed(1)} km</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Activities */}
            {tab === 'activities' && (
              activities.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-4xl mb-3">🏃</p>
                  <p className="text-sm">Belum ada aktivitas</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activities.map((act, i) => (
                    <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                          {act.athlete.firstname} {act.athlete.lastname}
                        </p>
                        {act.start_date_local && (
                          <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{fmtDate(act.start_date_local)}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mb-2 truncate">{act.name}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                        <span className="font-bold text-orange-500">{fmtDist(act.distance)}</span>
                        <span className="text-gray-500">⏱ {fmtTime(act.moving_time)}</span>
                        <span className="text-gray-500">⚡ {fmtPace(act.distance, act.moving_time)}</span>
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

      {showMembers && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 py-6"
          onClick={() => setShowMembers(false)}
        >
          <div
            className="w-full max-w-lg max-h-[80vh] bg-white dark:bg-gray-900 rounded-2xl shadow-xl flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Member</p>
                <p className="text-xs text-gray-400">{members.length} anggota</p>
              </div>
              <button
                type="button"
                onClick={() => setShowMembers(false)}
                className="w-8 h-8 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center"
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>
            <ul className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
              {members.map((m, i) => (
                <li key={`${m.firstname}-${m.lastname}-${i}`} className="flex items-center gap-2 px-4 py-3">
                  <span className="flex-1 text-sm text-gray-800 dark:text-gray-100 truncate">
                    {`${m.firstname || ''} ${m.lastname || ''}`.trim() || '—'}
                  </span>
                  {m.owner && (
                    <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                      Owner
                    </span>
                  )}
                  {m.admin && (
                    <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                      Admin
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
