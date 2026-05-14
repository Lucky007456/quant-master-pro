import { FiHome, FiBookOpen, FiBarChart2, FiMessageCircle, FiAward, FiZap, FiLogOut } from 'react-icons/fi'
import { getLevel, getLevelTitle, getLevelProgress } from '../../constants/levels.js'

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: FiHome },
  { id: 'quiz', label: 'Quiz', icon: FiBookOpen },
  { id: 'analytics', label: 'Analytics', icon: FiBarChart2 },
  { id: 'tutor', label: 'AI Tutor', icon: FiMessageCircle },
  { id: 'rewards', label: 'Rewards', icon: FiAward },
]

export default function SideNav({ active, onNav, xp, onLogout, username }) {
  const level = getLevel(xp)
  const title = getLevelTitle(xp)
  const prog = getLevelProgress(xp)

  return (
    <aside className="side-nav">
      <div className="side-nav-logo">
        <FiZap className="logo-icon" />
        <span>QuantMaster</span>
      </div>

      <div className="side-nav-links">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`side-nav-item ${active === item.id ? 'active' : ''}`}
            onClick={() => onNav(item.id)}
          >
            <item.icon />
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <div className="side-nav-footer">
        <div className="side-nav-avatar">🎓</div>
        <div className="side-nav-user">
          <span className="side-nav-title">{username}</span>
          <span className="side-nav-level">Lv. {level} · {xp.toLocaleString()} XP</span>
          <span className="side-nav-title" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{title}</span>
        </div>
        <div className="side-nav-xp-bar" style={{ marginBottom: '16px' }}>
          <div className="side-nav-xp-fill" style={{ width: `${prog.pct}%` }}></div>
        </div>

        <button className="side-nav-item" onClick={onLogout} style={{ color: 'var(--accent-rose)', width: '100%', justifyContent: 'flex-start' }}>
          <FiLogOut />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
