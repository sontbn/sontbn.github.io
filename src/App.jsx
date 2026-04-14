import { useState, useEffect } from 'react'

const FILTERS = ['All', 'Active', 'Done']

function App() {
  const [tasks, setTasks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tasks')) || []
    } catch {
      return []
    }
  })
  const [input, setInput] = useState('')
  const [filter, setFilter] = useState('All')
  const [dark, setDark] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks))
  }, [tasks])

  const addTask = () => {
    const text = input.trim()
    if (!text) return
    setTasks(prev => [
      { id: Date.now(), text, done: false },
      ...prev,
    ])
    setInput('')
  }

  const toggle = (id) =>
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))

  const remove = (id) =>
    setTasks(prev => prev.filter(t => t.id !== id))

  const clearDone = () =>
    setTasks(prev => prev.filter(t => !t.done))

  const visible = tasks.filter(t => {
    if (filter === 'Active') return !t.done
    if (filter === 'Done') return t.done
    return true
  })

  const doneCount = tasks.filter(t => t.done).length

  return (
    <div className={dark ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">✅</span>
              <h1 className="text-lg font-bold text-gray-800 dark:text-white tracking-tight">
                MyTasks
              </h1>
            </div>
            <button
              onClick={() => setDark(d => !d)}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Toggle dark mode"
            >
              {dark ? '☀️' : '🌙'}
            </button>
          </div>
        </header>

        <main className="max-w-lg mx-auto px-4 pt-5 pb-24">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Total', value: tasks.length, cls: 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400' },
              { label: 'Active', value: tasks.length - doneCount, cls: 'bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400' },
              { label: 'Done', value: doneCount, cls: 'bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400' },
            ].map(s => (
              <div key={s.label} className={`rounded-2xl p-3 text-center ${s.cls}`}>
                <p className="text-2xl font-bold leading-none mb-1">{s.value}</p>
                <p className="text-xs font-medium opacity-75">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTask()}
              placeholder="Add a new task..."
              className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 text-sm transition-colors"
            />
            <button
              onClick={addTask}
              disabled={!input.trim()}
              className="w-12 h-12 rounded-2xl bg-blue-500 disabled:bg-blue-300 dark:disabled:bg-blue-900 hover:bg-blue-600 active:bg-blue-700 text-white flex items-center justify-center transition-colors shadow-md shadow-blue-200 dark:shadow-blue-900"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-2xl p-1 mb-4">
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                  filter === f
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Task list */}
          {visible.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-600">
              <p className="text-5xl mb-3">
                {filter === 'Done' ? '🎉' : '📋'}
              </p>
              <p className="text-sm font-medium">
                {filter === 'Done' ? 'No completed tasks yet' : 'No tasks here'}
              </p>
              {filter === 'All' && (
                <p className="text-xs mt-1 opacity-75">Add your first task above</p>
              )}
            </div>
          ) : (
            <ul className="space-y-2">
              {visible.map(task => (
                <li
                  key={task.id}
                  className="flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3 shadow-sm group"
                >
                  <button
                    onClick={() => toggle(task.id)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      task.done
                        ? 'bg-green-500 border-green-500'
                        : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                    }`}
                  >
                    {task.done && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                  <span className={`flex-1 text-sm leading-snug ${
                    task.done
                      ? 'line-through text-gray-400 dark:text-gray-600'
                      : 'text-gray-700 dark:text-gray-200'
                  }`}>
                    {task.text}
                  </span>
                  <button
                    onClick={() => remove(task.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 dark:text-gray-600 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-400 transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4h6v2" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Clear done */}
          {doneCount > 0 && (
            <button
              onClick={clearDone}
              className="mt-4 w-full py-3 rounded-2xl text-sm text-red-400 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-500 transition-colors font-medium"
            >
              Clear {doneCount} completed task{doneCount > 1 ? 's' : ''}
            </button>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
