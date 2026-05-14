import { FiHome, FiBookOpen, FiBarChart2, FiMessageCircle, FiAward } from 'react-icons/fi'

const navItems = [
  { id: 'dashboard', label: 'Home', icon: FiHome },
  { id: 'quiz', label: 'Quiz', icon: FiBookOpen },
  { id: 'analytics', label: 'Analytics', icon: FiBarChart2 },
  { id: 'tutor', label: 'Tutor', icon: FiMessageCircle },
  { id: 'rewards', label: 'Rewards', icon: FiAward },
]

export default function BottomNav({ active, onNav }) {
  return (
    <nav className="bottom-nav">
      {navItems.map(item => (
        <button
          key={item.id}
          className={`nav-item ${active === item.id ? 'active' : ''}`}
          onClick={() => onNav(item.id)}
        >
          <item.icon />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
