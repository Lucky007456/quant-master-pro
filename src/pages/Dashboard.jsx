import { useMemo } from 'react'
import { FiZap, FiTarget, FiTrendingUp, FiBookOpen, FiArrowRight } from 'react-icons/fi'
import questions from '../data/questions.json'
import { getTopicMeta } from '../constants/topics.js'
import { getDailyQuestions } from '../utils/questionUtils.js'

export default function Dashboard({ store, getTopicStats, getTotalStats, onStartQuiz, onDailyChallenge, onNav }) {
  const totalStats = getTotalStats()
  const streak = store.user.streak || { current: 0, longest: 0 }

  const topics = useMemo(() => {
    const map = {}
    for (const q of questions) {
      if (!map[q.topic]) map[q.topic] = { name: q.topic, count: 0 }
      map[q.topic].count++
    }
    return Object.values(map)
  }, [])

  const dailyQuestions = useMemo(() => getDailyQuestions(questions, 5), [])
  const todayStr = new Date().toISOString().split('T')[0]
  const dailyDone = store.dailyChallenge?.date === todayStr && store.dailyChallenge?.completed

  // Countdown to midnight
  const now = new Date()
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  const diff = midnight - now
  const hrs = Math.floor(diff / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)

  const recentActivity = (store.activity || []).slice(0, 5)

  return (
    <div className="page-enter dashboard-page">
      {/* Hero Stats */}
      <div className="hero-stats">
        <div className="hero-stat">
          <div className="hero-stat-icon fire">🔥</div>
          <div className="hero-stat-value">{streak.current}</div>
          <div className="hero-stat-label">Day Streak</div>
        </div>
        <div className="hero-stat">
          <div className="hero-stat-icon xp"><FiZap /></div>
          <div className="hero-stat-value">{store.user.xp.toLocaleString()}</div>
          <div className="hero-stat-label">Total XP</div>
        </div>
        <div className="hero-stat">
          <div className="hero-stat-icon acc"><FiTarget /></div>
          <div className="hero-stat-value">{totalStats.accuracy}%</div>
          <div className="hero-stat-label">Accuracy</div>
        </div>
        <div className="hero-stat">
          <div className="hero-stat-icon done"><FiBookOpen /></div>
          <div className="hero-stat-value">{totalStats.attempted}<span className="hero-stat-total">/{questions.length}</span></div>
          <div className="hero-stat-label">Completed</div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Topics Grid */}
        <div className="dashboard-main">
          <h2 className="section-title">📚 Choose a Topic</h2>
          <div className="topics-grid">
            {topics.map(topic => {
              const meta = getTopicMeta(topic.name)
              const stats = getTopicStats(topic.name)
              const progress = topic.count > 0 ? (stats.attempted / topic.count) * 100 : 0
              return (
                <div key={topic.name} className="topic-card" onClick={() => onStartQuiz(topic.name)}>
                  <div className="topic-card-header">
                    <span className="topic-emoji">{meta.emoji}</span>
                    {stats.attempted > 0 && (
                      <span className={`accuracy-badge ${stats.accuracy >= 70 ? 'good' : stats.accuracy >= 40 ? 'ok' : 'low'}`}>
                        {stats.accuracy}%
                      </span>
                    )}
                  </div>
                  <h3 className="topic-name">{topic.name}</h3>
                  <div className="topic-meta">{topic.count} questions · {stats.attempted} done</div>
                  <div className="topic-progress">
                    <div className="topic-progress-fill" style={{ width: `${progress}%`, background: meta.color }}></div>
                  </div>
                  <div className="topic-action">
                    {stats.attempted > 0 ? 'Continue' : 'Start'} <FiArrowRight />
                  </div>
                </div>
              )
            })}

            <div className="topic-card topic-card-special" onClick={() => onStartQuiz(null)}>
              <div className="topic-card-header">
                <span className="topic-emoji">🎯</span>
              </div>
              <h3 className="topic-name">Quick Mix</h3>
              <div className="topic-meta">Random 20 from all topics</div>
              <div className="topic-progress">
                <div className="topic-progress-fill" style={{ width: `${(totalStats.attempted / questions.length) * 100}%` }}></div>
              </div>
              <div className="topic-action">Start <FiArrowRight /></div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="dashboard-sidebar">
          {/* Daily Challenge */}
          <div className={`daily-challenge-card ${dailyDone ? 'completed' : ''}`}>
            <div className="daily-header">
              <FiZap className="daily-icon" />
              <span>DAILY CHALLENGE</span>
            </div>
            {dailyDone ? (
              <p className="daily-status">✅ Completed today!</p>
            ) : (
              <>
                <p className="daily-desc">5 Questions · 2× XP</p>
                <p className="daily-timer">Resets in {hrs}h {mins}m</p>
                <button className="btn btn-amber" onClick={() => onDailyChallenge(dailyQuestions)}>
                  Start Challenge <FiArrowRight />
                </button>
              </>
            )}
          </div>

          {/* Recent Activity */}
          <div className="activity-card">
            <h3 className="activity-title">Recent Activity</h3>
            {recentActivity.length === 0 ? (
              <p className="activity-empty">No activity yet. Start a quiz!</p>
            ) : (
              <div className="activity-list">
                {recentActivity.map((a, i) => (
                  <div key={i} className="activity-item">
                    <span className="activity-text">{a.text}</span>
                    <span className="activity-time">{getTimeAgo(a.time)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Streak Warning */}
          {!store.user.streak?.lastActiveDate || store.user.streak.lastActiveDate !== todayStr ? (
            <div className="streak-warning">
              <span>🔥 Streak at risk!</span>
              <span>Complete a quiz to keep your streak</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function getTimeAgo(timestamp) {
  const diff = Date.now() - timestamp
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}
