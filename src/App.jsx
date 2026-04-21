import { useState } from 'react'
import Home from './Home'
import TodoApp from './TodoApp'

export default function App() {
  const [view, setView] = useState('home')
  const [dark, setDark] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  const toggleDark = () => setDark(d => !d)

  return (
    <div className={dark ? 'dark' : ''}>
      {view === 'home' && (
        <Home
          dark={dark}
          onToggleDark={toggleDark}
          onOpen={setView}
        />
      )}
      {view === 'todo' && (
        <TodoApp
          dark={dark}
          onToggleDark={toggleDark}
          onBack={() => setView('home')}
        />
      )}
    </div>
  )
}
