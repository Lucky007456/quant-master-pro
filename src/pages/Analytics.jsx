import { useMemo } from 'react'
import { FiTarget, FiBookOpen, FiClock, FiTrendingUp, FiDownload, FiArrowRight } from 'react-icons/fi'
import questions from '../data/questions.json'
import { getTopicMeta } from '../constants/topics.js'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function Analytics({ store, getTopicStats, getTotalStats, onStartQuiz }) {
  const totalStats = getTotalStats()

  const topicData = useMemo(() => {
    const map = {}
    for (const q of questions) {
      if (!map[q.topic]) map[q.topic] = { total: 0 }
      map[q.topic].total++
    }
    return Object.entries(map).map(([name, data]) => {
      const stats = getTopicStats(name)
      const meta = getTopicMeta(name)
      return { name: name.length > 20 ? name.slice(0, 18) + '…' : name, fullName: name, accuracy: stats.accuracy, attempted: stats.attempted, total: data.total, color: meta.color, emoji: meta.emoji }
    })
  }, [getTopicStats])

  // Heatmap data (last 10 weeks)
  const heatmapData = useMemo(() => {
    const history = store.history || []
    const cells = []
    const today = new Date()
    for (let w = 9; w >= 0; w--) {
      for (let d = 0; d < 7; d++) {
        const date = new Date(today)
        date.setDate(date.getDate() - (w * 7 + (6 - d)))
        const dateStr = date.toISOString().split('T')[0]
        const dayHistory = history.filter(h => h.date === dateStr)
        const count = dayHistory.reduce((s, h) => s + (h.totalQ || 0), 0)
        cells.push({ date: dateStr, count, day: d, week: 9 - w })
      }
    }
    return cells
  }, [store.history])

  // Weak areas
  const weakAreas = useMemo(() => {
    return topicData
      .filter(t => t.attempted >= 3)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 3)
  }, [topicData])

  // Time trend
  const trendData = useMemo(() => {
    const history = store.history || []
    const last7 = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const dayH = history.filter(h => h.date === dateStr)
      const totalQ = dayH.reduce((s, h) => s + (h.totalQ || 0), 0)
      const totalCorrect = dayH.reduce((s, h) => s + (h.score || 0), 0)
      last7.push({
        day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()],
        questions: totalQ,
        accuracy: totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0
      })
    }
    return last7
  }, [store.history])

  const totalTime = useMemo(() => {
    const history = store.history || []
    return history.length * 5 // rough estimate: 5 min per quiz
  }, [store.history])

  const downloadReport = () => {
    let report = '=== QUANTMASTER — PROGRESS REPORT ===\n\n'
    report += `Total Questions: ${questions.length}\n`
    report += `Attempted: ${totalStats.attempted}\nCorrect: ${totalStats.correct}\nAccuracy: ${totalStats.accuracy}%\n\n`
    report += '--- TOPIC-WISE ---\n\n'
    topicData.forEach(t => {
      report += `${t.fullName}: ${t.attempted}/${t.total} attempted, ${t.accuracy}% accuracy\n`
    })
    const blob = new Blob([report], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'quantmaster_report.txt'; a.click()
    URL.revokeObjectURL(url)
  }

  const getHeatColor = (count) => {
    if (count === 0) return 'var(--bg-elevated)'
    if (count <= 5) return 'rgba(245,158,11,0.2)'
    if (count <= 15) return 'rgba(245,158,11,0.5)'
    return 'var(--accent-amber)'
  }

  const barColor = (accuracy) => {
    if (accuracy >= 70) return 'var(--accent-emerald)'
    if (accuracy >= 40) return 'var(--accent-amber)'
    return 'var(--accent-rose)'
  }

  return (
    <div className="page-enter analytics-page">
      <div className="analytics-header">
        <h2 className="section-title">📊 Analytics</h2>
        <button className="btn btn-surface btn-sm" onClick={downloadReport}>
          <FiDownload /> Export
        </button>
      </div>

      {/* Overview stats */}
      <div className="analytics-stats">
        <div className="a-stat">
          <FiTarget className="a-stat-icon" />
          <div className="a-stat-val">{totalStats.accuracy}%</div>
          <div className="a-stat-label">Accuracy</div>
        </div>
        <div className="a-stat">
          <FiBookOpen className="a-stat-icon" />
          <div className="a-stat-val">{totalStats.attempted}</div>
          <div className="a-stat-label">Attempted</div>
        </div>
        <div className="a-stat">
          <FiClock className="a-stat-icon" />
          <div className="a-stat-val">{totalTime}m</div>
          <div className="a-stat-label">Study Time</div>
        </div>
        <div className="a-stat">
          <FiTrendingUp className="a-stat-icon" />
          <div className="a-stat-val">{store.history?.length || 0}</div>
          <div className="a-stat-label">Quizzes</div>
        </div>
      </div>

      {/* Accuracy by Topic - Bar Chart */}
      <div className="analytics-card">
        <h3>Accuracy by Topic</h3>
        {topicData.some(t => t.attempted > 0) ? (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topicData.filter(t => t.attempted > 0)} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fill: '#94A3B8', fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fill: '#94A3B8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#1E2535', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#F1F5F9' }}
                  formatter={(val) => [`${val}%`, 'Accuracy']}
                />
                <Bar dataKey="accuracy" radius={[0, 4, 4, 0]} barSize={18}>
                  {topicData.filter(t => t.attempted > 0).map((entry, i) => (
                    <Cell key={i} fill={barColor(entry.accuracy)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="empty-chart">Complete some quizzes to see accuracy data</p>
        )}
      </div>

      {/* Activity Heatmap */}
      <div className="analytics-card">
        <h3>Activity Heatmap</h3>
        <div className="heatmap">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <span key={i} className="heatmap-label">{d}</span>
          ))}
          {heatmapData.map((cell, i) => (
            <div key={i} className="heatmap-cell"
              style={{ background: getHeatColor(cell.count) }}
              title={`${cell.date}: ${cell.count} questions`}
            ></div>
          ))}
        </div>
      </div>

      {/* Weak Areas */}
      {weakAreas.length > 0 && (
        <div className="analytics-card">
          <h3>🎯 Recommended Focus Areas</h3>
          <div className="weak-areas">
            {weakAreas.map((area, i) => (
              <div key={i} className="weak-area-item">
                <span className="weak-rank">{i + 1}.</span>
                <span className="weak-emoji">{area.emoji}</span>
                <span className="weak-name">{area.fullName}</span>
                <span className="weak-acc" style={{ color: barColor(area.accuracy) }}>{area.accuracy}%</span>
                <button className="btn btn-amber btn-sm" onClick={() => onStartQuiz(area.fullName)}>
                  Practice <FiArrowRight />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly Trend */}
      <div className="analytics-card">
        <h3>📈 7-Day Activity</h3>
        <div className="trend-bars">
          {trendData.map((d, i) => (
            <div key={i} className="trend-col">
              <div className="trend-bar-wrap">
                <div className="trend-bar" style={{ height: `${Math.max(d.questions * 5, 4)}%`, background: d.questions > 0 ? 'var(--accent-amber)' : 'var(--bg-elevated)' }}></div>
              </div>
              <span className="trend-val">{d.questions}</span>
              <span className="trend-day">{d.day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
