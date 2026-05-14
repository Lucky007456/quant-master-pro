import { useState, useRef, useEffect, useCallback } from 'react'
import { FiSend, FiTrash2, FiCopy } from 'react-icons/fi'

const SYSTEM_MSG = `You are QuantMaster AI, an expert aptitude coach for competitive exams (CAT, GATE, placements).

RULES:
• Keep answers under 200 words. No filler.
• Format: ✅ Answer → 📐 Solution (numbered steps) → ⚡ Shortcut (1 line) → 🎯 Exam Tip
• Use numbers and symbols. Be precise.
• Never repeat the question text.
• If asked a concept, explain with one example.`

const QUICK_QUESTIONS = [
  "How to solve age problems fast?",
  "Explain compound interest formula",
  "Shortcut for percentage calculations",
  "Time & Work tricks",
  "Probability basics in 5 lines",
]

export default function Tutor() {
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('qm_chat_v2')
    return saved ? JSON.parse(saved) : [
      { role: 'assistant', content: '⚡ QuantMaster AI ready.\n\nAsk any aptitude question — I\'ll give you the answer, formula & shortcut.' }
    ]
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [ollamaStatus, setOllamaStatus] = useState('checking')
  const chatEndRef = useRef(null)
  const abortRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => { checkOllama() }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    localStorage.setItem('qm_chat_v2', JSON.stringify(messages))
  }, [messages])

  const checkOllama = async () => {
    try {
      const res = await fetch('http://localhost:11434/api/tags')
      setOllamaStatus(res.ok ? 'online' : 'offline')
    } catch { setOllamaStatus('offline') }
  }

  const copyText = (text) => {
    navigator.clipboard.writeText(text)
  }

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return
    const userMsg = { role: 'user', content: input.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const recentMsgs = [...messages.slice(-6), userMsg]
    const conversationCtx = recentMsgs.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')
    const prompt = `${SYSTEM_MSG}\n\n${conversationCtx}\n\nAssistant:`

    try {
      abortRef.current = new AbortController()
      const res = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.2', prompt, stream: true,
          options: { num_predict: 250, temperature: 0.3, top_p: 0.85 }
        }),
        signal: abortRef.current.signal
      })
      if (!res.ok) throw new Error('Failed')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      setMessages(prev => [...prev, { role: 'assistant', content: '' }])
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n').filter(Boolean)) {
          try {
            const json = JSON.parse(line)
            if (json.response) {
              fullText += json.response
              setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: 'assistant', content: fullText }; return u })
            }
          } catch { /* skip */ }
        }
      }
      setOllamaStatus('online')
    } catch (err) {
      if (err.name === 'AbortError') return
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Cannot connect to Ollama.\n1. Run: ollama serve\n2. Pull model: ollama pull llama3.2' }])
      setOllamaStatus('offline')
    }
    setLoading(false)
  }, [input, loading, messages])

  const clearChat = () => {
    if (abortRef.current) abortRef.current.abort()
    setLoading(false)
    setMessages([{ role: 'assistant', content: '🔄 Chat cleared! Ask me anything.' }])
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const sessionStats = {
    questions: messages.filter(m => m.role === 'user').length,
    responses: messages.filter(m => m.role === 'assistant').length - 1,
  }

  return (
    <div className="page-enter tutor-page">
      <div className="tutor-layout">
        {/* Sidebar - Quick Questions */}
        <div className="tutor-sidebar left">
          <h3>💡 Quick Questions</h3>
          <div className="quick-list">
            {QUICK_QUESTIONS.map((q, i) => (
              <button key={i} className="quick-btn" onClick={() => { setInput(q); inputRef.current?.focus() }}>
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Main Chat */}
        <div className="tutor-main">
          <div className="tutor-header">
            <div className="tutor-header-left">
              <h2>🤖 AI Tutor</h2>
              <div className="ollama-badge">
                <span className={`dot ${ollamaStatus}`}></span>
                {ollamaStatus === 'online' ? 'Connected' : ollamaStatus === 'checking' ? 'Checking...' : 'Offline'}
              </div>
            </div>
            <button className="btn btn-surface btn-sm" onClick={clearChat}>
              <FiTrash2 /> Clear
            </button>
          </div>

          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-bubble ${msg.role}`}>
                {msg.role === 'assistant' && <span className="chat-avatar">⚡</span>}
                <div className="chat-content">
                  <pre>{msg.content}</pre>
                  {msg.role === 'assistant' && msg.content && i > 0 && (
                    <button className="copy-btn" onClick={() => copyText(msg.content)} title="Copy">
                      <FiCopy />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {loading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="chat-bubble assistant">
                <span className="chat-avatar">⚡</span>
                <div className="chat-content"><div className="loading-dots"><span></span><span></span><span></span></div></div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="chat-input-area">
            <input
              ref={inputRef}
              className="chat-input"
              placeholder="💬 Ask anything about aptitude..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button className="btn btn-amber" onClick={sendMessage} disabled={loading || !input.trim()}>
              <FiSend />
            </button>
          </div>
        </div>

        {/* Sidebar - Context */}
        <div className="tutor-sidebar right">
          <h3>📋 Session Info</h3>
          <div className="session-stats">
            <div className="session-stat">
              <span className="session-val">{sessionStats.questions}</span>
              <span>Questions Asked</span>
            </div>
            <div className="session-stat">
              <span className="session-val">{sessionStats.responses}</span>
              <span>Responses</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
