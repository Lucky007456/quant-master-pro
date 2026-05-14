import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { FiArrowLeft, FiChevronRight, FiMessageCircle, FiRefreshCw, FiFlag, FiClock, FiZap } from 'react-icons/fi'
import questions from '../data/questions.json'
import { shuffle } from '../utils/questionUtils.js'
import { getTopicMeta } from '../constants/topics.js'
import Modal from '../components/UI/Modal.jsx'

export default function Quiz({ topic, onBack, recordAnswer, awardXP, XP_REWARDS, checkBadges, markActive, addHistory, toast }) {
  const [phase, setPhase] = useState(topic === '__daily__' ? 'quiz' : 'config') // config → quiz → results
  const [quizConfig, setQuizConfig] = useState({ count: 20, timer: 0 })
  const [pool, setPool] = useState([])
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [explanation, setExplanation] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([])
  const [timer, setTimer] = useState(0)
  const [questionTime, setQuestionTime] = useState(0)
  const timerRef = useRef(null)
  const qStartRef = useRef(Date.now())
  const [xpGained, setXpGained] = useState(0)
  const [floatXP, setFloatXP] = useState(null)

  // Initialize pool on config submit or daily
  useEffect(() => {
    if (topic === '__daily__') {
      // Daily challenge questions passed via special prop
      return
    }
  }, [topic])

  const startQuiz = useCallback((config) => {
    setQuizConfig(config)
    const filtered = topic && topic !== '__daily__'
      ? questions.filter(q => q.topic === topic)
      : questions
    const picked = shuffle(filtered).slice(0, config.count)
    setPool(picked)
    setPhase('quiz')
    setIdx(0)
    setResults([])
    setSelected(null)
    setShowAnswer(false)
    setExplanation('')
    setXpGained(0)
    qStartRef.current = Date.now()

    if (config.timer > 0) {
      setTimer(config.timer)
    }
  }, [topic])

  // Timer countdown
  useEffect(() => {
    if (phase !== 'quiz' || quizConfig.timer === 0 || showAnswer) return
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          handleAutoSubmit()
          return 0
        }
        return prev - 1
      })
      setQuestionTime(prev => prev + 1)
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [phase, idx, showAnswer, quizConfig.timer])

  const handleAutoSubmit = () => {
    if (!showAnswer && selected === null) {
      setShowAnswer(true)
      setResults(prev => [...prev, { qId: current?.id, selected: -1, correct: false, time: questionTime }])
    }
  }

  const current = pool[idx]
  const labels = ['A', 'B', 'C', 'D']

  const handleSelect = (i) => {
    if (showAnswer) return
    setSelected(i)
  }

  const handleCheck = () => {
    if (selected === null) return
    clearInterval(timerRef.current)
    setShowAnswer(true)
    const isCorrect = selected === 0
    const timeTaken = Math.round((Date.now() - qStartRef.current) / 1000)
    const result = { qId: current.id, selected, correct: isCorrect, time: timeTaken }
    setResults(prev => [...prev, result])

    // Record progress
    recordAnswer(current.id, current.topic, isCorrect, timeTaken)
    markActive()

    // Award XP
    if (isCorrect) {
      const xp = XP_REWARDS.correct_answer
      awardXP(xp, `Correct answer Q${current.id}`)
      setXpGained(prev => prev + xp)
      setFloatXP(xp)
      setTimeout(() => setFloatXP(null), 1200)
      if (toast) toast.success(`+${xp} XP 🎯`)
    }
  }

  const handleNext = () => {
    if (idx + 1 >= pool.length) {
      finishQuiz()
      return
    }
    setIdx(idx + 1)
    setSelected(null)
    setShowAnswer(false)
    setExplanation('')
    qStartRef.current = Date.now()
    setQuestionTime(0)
    if (quizConfig.timer > 0) setTimer(quizConfig.timer)
  }

  const finishQuiz = () => {
    const correctCount = results.filter(r => r.correct).length
    const isPerfect = correctCount === results.length && results.length > 0

    if (isPerfect) {
      const bonus = XP_REWARDS.perfect_quiz
      awardXP(bonus, 'Perfect quiz!')
      setXpGained(prev => prev + bonus)
      if (toast) toast.success(`🎯 Perfect Quiz! +${bonus} XP bonus!`)
    }

    // Add to history
    if (addHistory) {
      addHistory({
        date: new Date().toISOString().split('T')[0],
        topic: topic || 'Mixed',
        score: correctCount,
        totalQ: results.length,
        xpEarned: xpGained + (isPerfect ? XP_REWARDS.perfect_quiz : 0),
      })
    }

    // Check badges
    if (checkBadges) {
      const newBadges = checkBadges({ perfectQuiz: isPerfect, quizCompleted: true })
      if (newBadges?.length > 0 && toast) {
        newBadges.forEach(b => toast.info(`🏅 Badge Earned: ${b.name} ${b.emoji}`))
      }
    }

    setPhase('results')
  }

  const handleExplain = useCallback(async () => {
    setLoading(true)
    setExplanation('')
    const prompt = `Solve concisely (under 6 lines):
Q: ${current.question}
A) ${current.options[0]}  B) ${current.options[1]}  C) ${current.options[2]}  D) ${current.options[3]}

Format strictly:
✅ Answer: [letter]
📐 Solution: [2-3 line math steps]
⚡ Shortcut: [1 line trick if any]`

    try {
      const res = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.2', prompt, stream: true,
          options: { num_predict: 150, temperature: 0.2, top_p: 0.8 }
        })
      })
      if (!res.ok) throw new Error('Ollama not reachable')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n').filter(Boolean)) {
          try {
            const json = JSON.parse(line)
            if (json.response) { fullText += json.response; setExplanation(fullText) }
          } catch { /* skip */ }
        }
      }
    } catch {
      setExplanation(`⚠️ Ollama offline. Run: ollama serve\n\nAnswer: A) ${current.options[0]}`)
    }
    setLoading(false)
  }, [current])

  // Config screen
  if (phase === 'config') {
    const meta = topic ? getTopicMeta(topic) : { emoji: '🎯', color: '#F59E0B' }
    return (
      <div className="page-enter quiz-config-page">
        <button className="back-link" onClick={onBack}><FiArrowLeft /> Back to Topics</button>
        <div className="config-card">
          <div className="config-header">
            <span className="config-emoji">{meta.emoji}</span>
            <h2>{topic || 'All Topics — Random Mix'}</h2>
          </div>
          <div className="config-section">
            <label>Questions</label>
            <div className="config-options">
              {[10, 25, 50, 100].map(n => (
                <button key={n}
                  className={`config-opt ${quizConfig.count === n ? 'active' : ''}`}
                  onClick={() => setQuizConfig(c => ({ ...c, count: n }))}>{n}</button>
              ))}
            </div>
          </div>
          <div className="config-section">
            <label>Timer (per question)</label>
            <div className="config-options">
              {[{ v: 0, l: 'Off' }, { v: 30, l: '30s' }, { v: 60, l: '60s' }].map(t => (
                <button key={t.v}
                  className={`config-opt ${quizConfig.timer === t.v ? 'active' : ''}`}
                  onClick={() => setQuizConfig(c => ({ ...c, timer: t.v }))}>{t.l}</button>
              ))}
            </div>
          </div>
          <button className="btn btn-amber btn-lg" onClick={() => startQuiz(quizConfig)}>
            Start Quiz <FiChevronRight />
          </button>
        </div>
      </div>
    )
  }

  // Results screen
  if (phase === 'results') {
    const correctCount = results.filter(r => r.correct).length
    const pct = results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0
    const avgTime = results.length > 0 ? Math.round(results.reduce((s, r) => s + (r.time || 0), 0) / results.length) : 0

    return (
      <div className="page-enter results-page">
        <h2 className="results-title">🎉 Quiz Complete!</h2>
        <p className="results-topic">{topic || 'Mixed Topics'}</p>

        <div className="score-ring">
          <svg viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="var(--bg-elevated)" strokeWidth="8" />
            <circle cx="60" cy="60" r="52" fill="none"
              stroke={pct >= 70 ? 'var(--accent-emerald)' : pct >= 40 ? 'var(--accent-amber)' : 'var(--accent-rose)'}
              strokeWidth="8" strokeLinecap="round"
              strokeDasharray={`${pct * 3.27} 327`}
              transform="rotate(-90 60 60)" />
          </svg>
          <div className="score-ring-text">
            <span className="score-pct">{pct}%</span>
            <span className="score-fraction">{correctCount}/{results.length}</span>
          </div>
        </div>

        <div className="results-stats">
          <div className="result-stat">
            <span className="result-stat-val correct">{correctCount}</span>
            <span>Correct</span>
          </div>
          <div className="result-stat">
            <span className="result-stat-val wrong">{results.length - correctCount}</span>
            <span>Wrong</span>
          </div>
          <div className="result-stat">
            <span className="result-stat-val">{avgTime}s</span>
            <span>Avg Time</span>
          </div>
          <div className="result-stat">
            <span className="result-stat-val xp">+{xpGained}</span>
            <span>XP Earned</span>
          </div>
        </div>

        <div className="results-actions">
          <button className="btn btn-amber" onClick={() => { setPhase('config'); setResults([]); setIdx(0) }}>
            <FiRefreshCw /> Try Again
          </button>
          <button className="btn btn-surface" onClick={onBack}>
            <FiArrowLeft /> Topics
          </button>
        </div>
      </div>
    )
  }

  // Quiz screen
  if (!current) return <div className="empty-state"><span className="empty-emoji">📭</span><p>No questions found.</p></div>

  const progress = ((idx + 1) / pool.length) * 100

  return (
    <div className="page-enter quiz-active">
      {/* Quiz top bar */}
      <div className="quiz-top-bar">
        <button className="back-link" onClick={onBack}><FiArrowLeft /></button>
        <span className="quiz-counter">Q {idx + 1} / {pool.length}</span>
        <div className="quiz-progress-bar">
          <div className="quiz-progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
        {quizConfig.timer > 0 && (
          <span className={`quiz-timer ${timer <= 5 ? 'danger' : ''}`}>
            <FiClock /> {timer}s
          </span>
        )}
      </div>

      {/* Question */}
      <div className="question-card">
        <div className="question-meta">
          <span className="question-topic">{getTopicMeta(current.topic).emoji} {current.topic}</span>
          <span className="question-id">Q{current.id}</span>
        </div>
        <p className="question-text">{current.question}</p>
      </div>

      {/* Options */}
      <div className="options-grid">
        {current.options.map((opt, i) => {
          let cls = 'option-card'
          if (showAnswer && i === 0) cls += ' correct'
          else if (showAnswer && selected === i && i !== 0) cls += ' wrong'
          else if (selected === i) cls += ' selected'
          return (
            <button key={i} className={cls} onClick={() => handleSelect(i)}>
              <span className="option-letter">{labels[i]}</span>
              <span className="option-text">{opt}</span>
            </button>
          )
        })}
      </div>

      {/* Floating XP */}
      {floatXP && <div className="xp-float">+{floatXP} XP ⚡</div>}

      {/* Actions */}
      <div className="quiz-actions">
        {!showAnswer ? (
          <button className="btn btn-amber btn-lg" onClick={handleCheck} disabled={selected === null}>
            Check Answer
          </button>
        ) : (
          <div className="quiz-action-row">
            <button className="btn btn-amber" onClick={handleNext}>
              {idx + 1 >= pool.length ? 'Finish' : 'Next'} <FiChevronRight />
            </button>
            <button className="btn btn-surface" onClick={handleExplain} disabled={loading}>
              <FiMessageCircle /> {loading ? 'Thinking...' : 'AI Explain'}
            </button>
          </div>
        )}
      </div>

      {/* Explanation */}
      {(loading || explanation) && (
        <div className="explain-panel">
          <h4>🤖 AI Explanation</h4>
          {loading && !explanation && <div className="loading-dots"><span></span><span></span><span></span></div>}
          {explanation && <pre className="explain-text">{explanation}</pre>}
        </div>
      )}
    </div>
  )
}
