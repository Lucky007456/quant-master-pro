import { useState, useCallback } from 'react'
import SideNav from './components/Layout/SideNav.jsx'
import BottomNav from './components/Layout/BottomNav.jsx'
import ToastContainer, { useToast } from './components/UI/Toast.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Quiz from './pages/Quiz.jsx'
import Analytics from './pages/Analytics.jsx'
import Tutor from './pages/Tutor.jsx'
import Rewards from './pages/Rewards.jsx'
import Login from './pages/Login.jsx'
import { useProgress } from './hooks/useProgress.js'
import { useXP } from './hooks/useXP.js'
import { useStreak } from './hooks/useStreak.js'
import { useBadges } from './hooks/useBadges.js'
import { useAuth } from './hooks/useAuth.js'
import Confetti from 'react-confetti'

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [quizTopic, setQuizTopic] = useState(null)
  const [showLevelUp, setShowLevelUp] = useState(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)

  const { user, loading: authInit, loginWithUsername, loginWithGoogle, logout } = useAuth()
  const { store, setStore, recordAnswer, getTopicStats, getTotalStats } = useProgress(user)
  const { awardXP, XP_REWARDS, xp } = useXP(store, setStore)
  const { markActive } = useStreak(store, setStore)
  const { checkBadges, earnedBadges, lockedBadges } = useBadges(store, setStore)
  const { toast } = useToast()

  const handleLogin = async (username) => {
    setAuthLoading(true)
    try {
      await loginWithUsername(username)
      toast.success(`Welcome, ${username}!`)
    } catch (err) {
      toast.error(err.message || 'Could not enter arena.')
      throw err
    } finally {
      setAuthLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setAuthLoading(true)
    try {
      const user = await loginWithGoogle()
      toast.success(`Welcome, ${user.user.displayName}!`)
    } catch (err) {
      toast.error('Google Sign-In failed.')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    toast.info('Signed out successfully.')
    setActiveTab('dashboard')
  }

  const startQuiz = useCallback((topic) => {
    setQuizTopic(topic)
    setActiveTab('quiz')
  }, [])

  const handleDailyChallenge = useCallback(() => {
    setQuizTopic('__daily__')
    setActiveTab('quiz')
  }, [])

  const handleNav = useCallback((id) => {
    setActiveTab(id)
    if (id !== 'quiz') setQuizTopic(null)
  }, [])

  const addHistory = useCallback((entry) => {
    const s = { ...store }
    s.history = [entry, ...(s.history || []).slice(0, 199)]
    s.activity = [
      { type: 'quiz', text: `✅ Completed ${entry.topic} — ${entry.score}/${entry.totalQ}`, time: Date.now() },
      ...(s.activity || []).slice(0, 49)
    ]
    if (quizTopic === '__daily__') {
      s.dailyChallenge = { date: new Date().toISOString().split('T')[0], completed: true, questionIds: [] }
    }
    setStore(s)
  }, [store, setStore, quizTopic])

  const wrappedAwardXP = useCallback((amount, reason) => {
    const result = awardXP(amount, reason)
    if (result.leveledUp) {
      setShowLevelUp(result.newLevel)
      setShowConfetti(true)
      setTimeout(() => { setShowConfetti(false); setShowLevelUp(null) }, 4000)
    }
    return result
  }, [awardXP])

  if (authInit) {
    return (
      <div className="app-loading" style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
        <div className="loading-dots"><span></span><span></span><span></span></div>
        <p style={{ marginTop: '20px', fontFamily: 'var(--font-mono)' }}>Entering Arena...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <>
        <Login onLogin={handleLogin} onGoogleLogin={handleGoogleLogin} loading={authLoading} />
        <ToastContainer />
      </>
    )
  }

  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard store={store} getTopicStats={getTopicStats} getTotalStats={getTotalStats} onStartQuiz={startQuiz} onDailyChallenge={handleDailyChallenge} onNav={handleNav} />
      case 'quiz':
        return <Quiz topic={quizTopic} onBack={() => handleNav('dashboard')} recordAnswer={recordAnswer} awardXP={wrappedAwardXP} XP_REWARDS={XP_REWARDS} checkBadges={checkBadges} markActive={markActive} addHistory={addHistory} toast={toast} />
      case 'analytics':
        return <Analytics store={store} getTopicStats={getTopicStats} getTotalStats={getTotalStats} onStartQuiz={startQuiz} />
      case 'tutor':
        return <Tutor />
      case 'rewards':
        return <Rewards store={store} earnedBadges={earnedBadges} lockedBadges={lockedBadges} />
      default:
        return <Dashboard store={store} getTopicStats={getTopicStats} getTotalStats={getTotalStats} onStartQuiz={startQuiz} onDailyChallenge={handleDailyChallenge} onNav={handleNav} />
    }
  }

  return (
    <div className="app-shell">
      {showConfetti && <Confetti recycle={false} numberOfPieces={200} />}

      <SideNav active={activeTab} onNav={handleNav} xp={xp} onLogout={handleLogout} username={user.displayName || 'Scholar'} />

      <main className="main-area">
        {renderPage()}
      </main>

      <BottomNav active={activeTab} onNav={handleNav} />
      <ToastContainer />

      {showLevelUp && (
        <div className="levelup-overlay" onClick={() => setShowLevelUp(null)}>
          <div className="levelup-card">
            <span className="levelup-emoji">🎉</span>
            <h2>LEVEL UP!</h2>
            <p>You are now <strong>Level {showLevelUp}</strong></p>
            <button className="btn btn-amber" onClick={() => setShowLevelUp(null)}>Continue</button>
          </div>
        </div>
      )}
    </div>
  )
}
