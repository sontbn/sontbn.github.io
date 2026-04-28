const CARDS = [
  {
    id: 'todo',
    icon: '✅',
    title: 'My Tasks',
    desc: 'Kelola to-do list harian',
    color: 'from-blue-500 to-blue-600',
    shadow: 'shadow-blue-200 dark:shadow-blue-900',
    available: true,
  },
  {
    id: 'strava',
    icon: '🏃',
    title: 'Strava',
    desc: 'Pantau aktivitas & lari',
    color: 'from-orange-500 to-orange-600',
    shadow: 'shadow-orange-200 dark:shadow-orange-900',
    available: true,
  },
  {
    id: 'survei',
    icon: '📋',
    title: 'Survei Monitoring',
    desc: 'Pantau & isi survei monitoring',
    color: 'from-emerald-500 to-emerald-600',
    shadow: 'shadow-emerald-200 dark:shadow-emerald-900',
    available: false,
  },
]

export default function Home({ onOpen, dark, onToggleDark }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-gray-900 dark:text-white tracking-tight leading-none">
              Dashboard
            </h1>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Pilih fitur yang ingin digunakan</p>
          </div>
          <button
            onClick={onToggleDark}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Toggle dark mode"
          >
            {dark ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-6 pb-10">
        {/* Greeting */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Halo! 👋</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Mau ngapain hari ini?
          </p>
        </div>

        {/* Card grid */}
        <div className="grid grid-cols-2 gap-3">
          {CARDS.map(card => (
            <button
              key={card.id}
              onClick={() => card.available && onOpen(card.id)}
              disabled={!card.available}
              className={`relative text-left rounded-3xl p-4 transition-all active:scale-95 ${
                card.available
                  ? `bg-gradient-to-br ${card.color} shadow-lg ${card.shadow} hover:opacity-90 cursor-pointer`
                  : 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm cursor-default'
              }`}
            >
              {/* Coming soon badge */}
              {!card.available && (
                <span className="absolute top-3 right-3 text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 px-2 py-0.5 rounded-full">
                  Soon
                </span>
              )}

              <span className="text-3xl block mb-3">{card.icon}</span>
              <p className={`text-sm font-bold leading-tight mb-1 ${
                card.available ? 'text-white' : 'text-gray-700 dark:text-gray-200'
              }`}>
                {card.title}
              </p>
              <p className={`text-xs leading-snug ${
                card.available ? 'text-white/75' : 'text-gray-400 dark:text-gray-500'
              }`}>
                {card.desc}
              </p>
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}
