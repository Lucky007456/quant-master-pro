import { useMemo } from 'react'
import { FiLock, FiZap } from 'react-icons/fi'
import { BADGE_DEFINITIONS } from '../constants/badges.js'
import { getLevel, getLevelTitle, getLevelProgress, LEVEL_TITLES } from '../constants/levels.js'

export default function Rewards({ store, earnedBadges, lockedBadges }) {
  const xp = store.user.xp
  const level = getLevel(xp)
  const title = getLevelTitle(xp)
  const prog = getLevelProgress(xp)
  const nextTitle = LEVEL_TITLES[level] || 'Legend'
  const streak = store.user.streak || { current: 0, longest: 0 }

  // Streak calendar (current month)
  const calendarData = useMemo(() => {
    const history = store.history || []
    const activeDays = new Set(history.map(h => h.date))
    if (streak.lastActiveDate) activeDays.add(streak.lastActiveDate)

    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const today = now.getDate()

    const cells = []
    for (let i = 0; i < firstDay; i++) cells.push({ day: null })
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      cells.push({ day: d, active: activeDays.has(dateStr), isToday: d === today })
    }
    return cells
  }, [store.history, streak])

  const monthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div className="page-enter rewards-page">
      <h2 className="section-title">🏆 Rewards</h2>

      {/* Level Card */}
      <div className="level-card">
        <div className="level-info">
          <span className="level-badge">Level {level}</span>
          <span className="level-title">"{title}"</span>
        </div>
        <div className="level-bar-wrap">
          <div className="level-bar">
            <div className="level-bar-fill" style={{ width: `${prog.pct}%` }}></div>
          </div>
          <span className="level-xp-text">{prog.current} / {prog.needed} XP</span>
        </div>
        <div className="level-next">
          Next: Level {level + 1} — "{nextTitle}" <FiZap />
        </div>
      </div>

      {/* XP Summary */}
      <div className="xp-summary">
        <div className="xp-item">
          <span className="xp-label">Total XP</span>
          <span className="xp-val">{xp.toLocaleString()}</span>
        </div>
        <div className="xp-item">
          <span className="xp-label">🔥 Current Streak</span>
          <span className="xp-val">{streak.current} days</span>
        </div>
        <div className="xp-item">
          <span className="xp-label">🏅 Longest Streak</span>
          <span className="xp-val">{streak.longest} days</span>
        </div>
        <div className="xp-item">
          <span className="xp-label">🎖️ Badges Earned</span>
          <span className="xp-val">{earnedBadges.length}/{BADGE_DEFINITIONS.length}</span>
        </div>
      </div>

      {/* Badges */}
      <h3 className="section-subtitle">🎖️ Badges</h3>
      <div className="badges-grid">
        {BADGE_DEFINITIONS.map(badge => {
          const earned = store.badges?.[badge.id]
          return (
            <div key={badge.id} className={`badge-card ${earned ? 'earned' : 'locked'}`}>
              <span className="badge-emoji">{earned ? badge.emoji : '🔒'}</span>
              <span className="badge-name">{badge.name}</span>
              <span className="badge-desc">{badge.desc}</span>
              {earned && (
                <span className="badge-date">
                  {new Date(earned.earnedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Streak Calendar */}
      <h3 className="section-subtitle">📅 Streak Calendar — {monthName}</h3>
      <div className="streak-calendar">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <span key={i} className="cal-header">{d}</span>
        ))}
        {calendarData.map((cell, i) => (
          <div key={i} className={`cal-cell ${cell.day ? '' : 'empty'} ${cell.active ? 'active' : ''} ${cell.isToday ? 'today' : ''}`}>
            {cell.day || ''}
          </div>
        ))}
      </div>

      {/* XP Earning Guide */}
      <div className="xp-guide">
        <h3 className="section-subtitle">⚡ How to Earn XP</h3>
        <div className="xp-rules">
          <div className="xp-rule"><span>✅ Correct answer</span><span>+10 XP</span></div>
          <div className="xp-rule"><span>🎯 Perfect quiz (100%)</span><span>+50 XP</span></div>
          <div className="xp-rule"><span>🔥 Daily streak bonus</span><span>+20 XP</span></div>
          <div className="xp-rule"><span>📝 New topic started</span><span>+15 XP</span></div>
          <div className="xp-rule"><span>⚡ Daily Challenge</span><span>+25 XP</span></div>
        </div>
      </div>
    </div>
  )
}
