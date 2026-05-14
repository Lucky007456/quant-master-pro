import { useMemo } from 'react'
import { FiTrash2, FiDownload } from 'react-icons/fi'
import questions from '../data/questions.json'

export default function Stats() {
  const stats = useMemo(() => {
    const attempted = JSON.parse(localStorage.getItem('qm_attempted') || '{}')
    const correct = JSON.parse(localStorage.getItem('qm_correct') || '{}')

    const topicStats = {}
    for (const q of questions) {
      if (!topicStats[q.topic]) topicStats[q.topic] = { total: 0, attempted: 0, correct: 0 }
      topicStats[q.topic].total++
      if (attempted[q.id]) topicStats[q.topic].attempted++
      if (correct[q.id]) topicStats[q.topic].correct++
    }

    return {
      totalQ: questions.length,
      totalAttempted: Object.keys(attempted).length,
      totalCorrect: Object.keys(correct).length,
      topics: topicStats
    }
  }, [])

  const accuracy = stats.totalAttempted > 0
    ? Math.round((stats.totalCorrect / stats.totalAttempted) * 100)
    : 0

  const resetProgress = () => {
    if (confirm('Reset all progress? This cannot be undone.')) {
      localStorage.removeItem('qm_attempted')
      localStorage.removeItem('qm_correct')
      window.location.reload()
    }
  }

  const downloadPDF = () => {
    // Generate a simple text report (real PDF would need a library)
    let report = '=== QUANTMASTER - PROGRESS REPORT ===\n\n'
    report += `Total Questions: ${stats.totalQ}\n`
    report += `Attempted: ${stats.totalAttempted}\n`
    report += `Correct: ${stats.totalCorrect}\n`
    report += `Accuracy: ${accuracy}%\n\n`
    report += '--- TOPIC-WISE BREAKDOWN ---\n\n'

    for (const [topic, ts] of Object.entries(stats.topics)) {
      const topicAcc = ts.attempted > 0 ? Math.round((ts.correct / ts.attempted) * 100) : 0
      report += `${topic}\n`
      report += `  Questions: ${ts.total} | Attempted: ${ts.attempted} | Correct: ${ts.correct} | Accuracy: ${topicAcc}%\n\n`
    }

    report += '\n--- QUESTIONS ATTEMPTED ---\n\n'
    const attempted = JSON.parse(localStorage.getItem('qm_attempted') || '{}')
    const correct = JSON.parse(localStorage.getItem('qm_correct') || '{}')

    for (const q of questions) {
      if (attempted[q.id]) {
        const status = correct[q.id] ? '✅' : '❌'
        report += `${status} Q${q.id}: ${q.question}\n`
        report += `   Answer: A) ${q.options[0]}\n\n`
      }
    }

    const blob = new Blob([report], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'quantmaster_progress.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page-enter">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 className="section-header">📊 Your Progress</h2>
          <p className="section-sub">Track your performance across topics</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={downloadPDF} style={{ padding: '8px 12px', fontSize: '0.8rem' }}>
            <FiDownload /> Export
          </button>
          <button className="btn btn-secondary" onClick={resetProgress} style={{ padding: '8px 12px', fontSize: '0.8rem', color: 'var(--danger)' }}>
            <FiTrash2 /> Reset
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totalQ}</div>
          <div className="stat-label">Total</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalAttempted}</div>
          <div className="stat-label">Attempted</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalCorrect}</div>
          <div className="stat-label">Correct</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{accuracy}%</div>
          <div className="stat-label">Accuracy</div>
        </div>
      </div>

      <div className="score-circle" style={{ '--score': accuracy }}>
        <span className="score-text">{accuracy}%</span>
      </div>

      <h3 className="section-header" style={{ marginTop: 24 }}>Topic-wise Performance</h3>
      <p className="section-sub">See how you're doing in each area</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
        {Object.entries(stats.topics).map(([topic, ts]) => {
          const topicAcc = ts.attempted > 0 ? Math.round((ts.correct / ts.attempted) * 100) : 0
          const progress = (ts.attempted / ts.total) * 100
          return (
            <div key={topic} className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <strong style={{ fontSize: '0.9rem' }}>{topic}</strong>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: topicAcc >= 70 ? 'var(--success)' : topicAcc >= 40 ? 'var(--warning)' : 'var(--danger)' }}>
                  {topicAcc}%
                </span>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                <span>{ts.total} total</span>
                <span>{ts.attempted} done</span>
                <span style={{ color: 'var(--success)' }}>{ts.correct} ✓</span>
                <span style={{ color: 'var(--danger)' }}>{ts.attempted - ts.correct} ✗</span>
              </div>
              <div className="progress-bar">
                <div className="fill" style={{ width: `${progress}%`, background: topicAcc >= 70 ? 'var(--success)' : topicAcc >= 40 ? 'var(--warning)' : 'var(--danger)' }}></div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
