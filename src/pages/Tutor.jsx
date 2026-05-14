import { useState, useRef, useEffect, useCallback } from 'react'
import { FiSend, FiTrash2, FiCopy, FiCloud, FiMonitor } from 'react-icons/fi'
import { GoogleGenerativeAI } from '@google/generative-ai'

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

// Initialize Gemini (only if API key exists)
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''
let geminiModel = null
if (GEMINI_API_KEY) {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
  } catch { /* will fallback */ }
}

export default function Tutor() {
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('qm_chat_v2')
    return saved ? JSON.parse(saved) : [
      { role: 'assistant', content: '⚡ QuantMaster AI ready.\n\nAsk any aptitude question — I\'ll give you the answer, formula & shortcut.' }
    ]
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [aiMode, setAiMode] = useState('auto') // 'auto' | 'gemini' | 'ollama'
  const [activeBackend, setActiveBackend] = useState(null) // which is actually being used
  const [ollamaAvailable, setOllamaAvailable] = useState(false)
  const chatEndRef = useRef(null)
  const abortRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => { detectBackend() }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    localStorage.setItem('qm_chat_v2', JSON.stringify(messages))
  }, [messages])

  const detectBackend = async () => {
    // Check Ollama
    try {
      const res = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(2000) })
      if (res.ok) {
        setOllamaAvailable(true)
        setActiveBackend('ollama')
        return
      }
    } catch { /* not available */ }

    // Fallback to Gemini
    if (geminiModel) {
      setActiveBackend('gemini')
    } else {
      setActiveBackend('none')
    }
  }

  const getEffectiveBackend = () => {
    if (aiMode === 'ollama') return ollamaAvailable ? 'ollama' : 'none'
    if (aiMode === 'gemini') return geminiModel ? 'gemini' : 'none'
    // auto mode
    if (ollamaAvailable) return 'ollama'
    if (geminiModel) return 'gemini'
    return 'none'
  }

  const copyText = (text) => {
    navigator.clipboard.writeText(text)
  }

  // Send message via Ollama
  const sendViaOllama = async (prompt) => {
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
    if (!res.ok) throw new Error('Ollama request failed')
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
    return fullText
  }

  // Send message via Gemini
  const sendViaGemini = async (conversationMsgs) => {
    if (!geminiModel) throw new Error('Gemini not configured')

    // Build Gemini chat history
    const history = []
    // Add system instruction as first user/model exchange
    history.push({ role: 'user', parts: [{ text: SYSTEM_MSG + '\n\nAcknowledge you understand these rules briefly.' }] })
    history.push({ role: 'model', parts: [{ text: '⚡ Understood. I\'ll follow the format: Answer → Solution → Shortcut → Exam Tip. Let\'s go.' }] })

    // Add recent conversation (skip first welcome message)
    for (const msg of conversationMsgs.slice(0, -1)) {
      history.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      })
    }

    const chat = geminiModel.startChat({ history })
    const lastMsg = conversationMsgs[conversationMsgs.length - 1]

    // Stream response
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])
    const result = await chat.sendMessageStream(lastMsg.content)
    let fullText = ''
    for await (const chunk of result.stream) {
      const chunkText = chunk.text()
      fullText += chunkText
      setMessages(prev => {
        const u = [...prev]
        u[u.length - 1] = { role: 'assistant', content: fullText }
        return u
      })
    }
    return fullText
  }

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return
    const userMsg = { role: 'user', content: input.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const backend = getEffectiveBackend()
    setActiveBackend(backend)

    try {
      if (backend === 'ollama') {
        const recentMsgs = [...messages.slice(-6), userMsg]
        const conversationCtx = recentMsgs.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')
        const prompt = `${SYSTEM_MSG}\n\n${conversationCtx}\n\nAssistant:`
        await sendViaOllama(prompt)
      } else if (backend === 'gemini') {
        const recentMsgs = [...messages.slice(-6), userMsg]
        await sendViaGemini(recentMsgs)
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '⚠️ No AI backend available.\n\n' +
            '**Option 1 — Local (Ollama):**\n' +
            '1. Run: `ollama serve`\n' +
            '2. Pull model: `ollama pull llama3.2`\n\n' +
            '**Option 2 — Cloud (Gemini):**\n' +
            '1. Get a free API key at ai.google.dev\n' +
            '2. Set VITE_GEMINI_API_KEY in your .env file'
        }])
      }
    } catch (err) {
      if (err.name === 'AbortError') return
      // If Ollama failed, try Gemini as fallback
      if (backend === 'ollama' && geminiModel) {
        try {
          setActiveBackend('gemini')
          const recentMsgs = [...messages.slice(-6), userMsg]
          await sendViaGemini(recentMsgs)
        } catch {
          setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Both Ollama and Gemini failed. Check your connections.' }])
        }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ AI error: ${err.message || 'Connection failed'}` }])
      }
    }
    setLoading(false)
  }, [input, loading, messages, aiMode, ollamaAvailable])

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

  const backendLabel = () => {
    const b = activeBackend || getEffectiveBackend()
    if (b === 'ollama') return { text: 'Ollama (Local)', color: 'online', icon: <FiMonitor /> }
    if (b === 'gemini') return { text: 'Gemini (Cloud)', color: 'online', icon: <FiCloud /> }
    return { text: 'No AI Connected', color: 'offline', icon: null }
  }

  const bLabel = backendLabel()

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

          {/* AI Mode Selector */}
          <div className="ai-mode-selector" style={{ marginTop: '20px' }}>
            <h3>🔌 AI Backend</h3>
            <div className="mode-buttons">
              {['auto', 'gemini', 'ollama'].map(mode => (
                <button
                  key={mode}
                  className={`mode-btn ${aiMode === mode ? 'active' : ''}`}
                  onClick={() => { setAiMode(mode); detectBackend() }}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    borderRadius: '8px',
                    border: aiMode === mode ? '1px solid var(--amber)' : '1px solid var(--surface-3)',
                    background: aiMode === mode ? 'rgba(255,180,0,0.15)' : 'var(--surface-1)',
                    color: aiMode === mode ? 'var(--amber)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {mode === 'auto' ? '⚡ Auto' : mode === 'gemini' ? '☁️ Gemini' : '🖥️ Ollama'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Chat */}
        <div className="tutor-main">
          <div className="tutor-header">
            <div className="tutor-header-left">
              <h2>🤖 AI Tutor</h2>
              <div className="ollama-badge">
                {bLabel.icon}
                <span className={`dot ${bLabel.color}`}></span>
                {bLabel.text}
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
