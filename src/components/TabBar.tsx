import { NavLink } from 'react-router-dom'

const tabs = [
  {
    to: '/',
    label: 'Home',
    icon: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  },
  {
    to: '/abende',
    label: 'Abende',
    icon: 'M7 3v3m10-3v3M4 8h16M5 6h14a1 1 0 011 1v12a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1z',
  },
  {
    to: '/meisterschaft',
    label: 'Meisterschaft',
    icon: 'M8 21h8m-4-4v4M7 4h10v4a5 5 0 01-10 0V4zM7 6H4v2a3 3 0 003 3m10-5h3v2a3 3 0 01-3 3',
  },
  {
    to: '/statistik',
    label: 'Statistik',
    icon: 'M4 20V10m6 10V4m6 16v-7m4 7H2',
  },
  {
    to: '/finanzen',
    label: 'Finanzen',
    icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6',
  },
]

export default function TabBar() {
  return (
    <nav className="tabbar">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.to === '/'}
          className={({ isActive }) => 'tab' + (isActive ? ' active' : '')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d={t.icon} />
          </svg>
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}
