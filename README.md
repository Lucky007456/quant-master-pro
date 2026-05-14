<p align="center">
  <img src="public/favicon.svg" width="80" alt="QuantMaster Logo" />
</p>

<h1 align="center">QuantMaster</h1>
<p align="center">
  <strong>Quantitative Aptitude Quiz & AI Tutor</strong><br/>
  A mobile-first Progressive Web App for competitive exam preparation
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Ollama-LLaMA_3.2-000000?logo=meta&logoColor=white" />
  <img src="https://img.shields.io/badge/PWA-Installable-5A0FC8?logo=pwa&logoColor=white" />
  <img src="https://img.shields.io/badge/Questions-721+-FF6B6B" />
</p>

---

## 📋 Overview

**QuantMaster** is an offline-first aptitude quiz app with an integrated AI tutor powered by [Ollama](https://ollama.ai). It parses 721+ questions from a PDF question bank, organizes them into 15 topics, and provides instant AI-powered explanations with shortcut methods — all running locally on your machine.

### Key Features

| Feature | Description |
|---------|-------------|
| 📝 **Quiz Engine** | 721+ MCQ questions across 15 aptitude topics with randomized sets of 20 |
| 🤖 **AI Tutor Chat** | Conversational AI tutor powered by Ollama (LLaMA 3.2) with streaming responses |
| ⚡ **AI Explain** | One-click concise explanation for any quiz question (Answer → Solution → Shortcut) |
| 📊 **Progress Tracking** | Topic-wise accuracy, attempts, and performance stats with localStorage persistence |
| 📤 **Export Report** | Download your progress as a text report |
| 📱 **PWA Support** | Installable on Android/iOS as a native-like app |
| 🌙 **Dark Mode** | Premium dark UI with glassmorphism design |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **Ollama** — [Download here](https://ollama.ai) (required for AI features)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/quant-tutor.git
cd quant-tutor

# 2. Install dependencies
npm install

# 3. Pull the AI model (one-time, ~2GB)
ollama pull llama3.2

# 4. Start the Ollama server
ollama serve

# 5. Start the app (in a new terminal)
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 📁 Project Structure

```
quant-tutor/
├── public/
│   ├── favicon.svg          # App icon
│   ├── icons.svg            # PWA icons
│   └── manifest.json        # PWA manifest
├── src/
│   ├── data/
│   │   └── questions.json   # 721 parsed questions (auto-generated)
│   ├── pages/
│   │   ├── Dashboard.jsx    # Home — topic grid + overall stats
│   │   ├── Quiz.jsx         # Quiz engine with AI Explain
│   │   ├── Tutor.jsx        # AI Tutor chat interface
│   │   └── Stats.jsx        # Progress analytics + export
│   ├── App.jsx              # Root layout + tab navigation
│   ├── index.css            # Design system + all styles
│   └── main.jsx             # React entry point
├── parse_questions.cjs      # PDF → JSON question parser
├── index.html               # HTML shell with PWA meta tags
├── vite.config.js           # Vite configuration
└── package.json
```

---

## 📚 Topics & Question Distribution

| # | Topic | Questions |
|---|-------|-----------|
| 1 | Number Systems & Simplification | 17 |
| 2 | Percentages | 27 |
| 3 | Profit, Loss & Discount | 20 |
| 4 | Partnership | 10 |
| 5 | Ratio & Proportion | 44 |
| 6 | Time & Work | 60 |
| 7 | Speed, Distance & Time | 59 |
| 8 | Clocks & Calendar | 60 |
| 9 | Permutations & Combinations | 60 |
| 10 | Probability & Statistics | 60 |
| 11 | Problems on Ages | 60 |
| 12 | Data Interpretation & Averages | 83 |
| 13 | Simple & Compound Interest / Mixtures | 83 |
| 14 | Logical Reasoning (Syllogisms) | 25 |
| 15 | Data Interpretation Advanced | 53 |
| | **Total** | **721** |

---

## 🤖 AI Integration

QuantMaster uses **Ollama** with the **LLaMA 3.2** model running 100% locally — no API keys, no cloud, no cost.

### How It Works

1. **AI Explain** (Quiz page) — When you answer a question, click "AI Explain" for a concise breakdown:
   ```
   ✅ Answer: B
   📐 Solution: 2-3 lines of math steps
   ⚡ Shortcut: 1-line trick
   ```

2. **AI Tutor** (Chat page) — Ask any aptitude question in natural language. The AI responds with:
   - Direct answer + formula
   - Shortcut method
   - Streaming output (appears word-by-word)

### AI Configuration

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `model` | `llama3.2` | Lightweight 3B model, fast on CPU |
| `num_predict` | 150–200 | Token cap for short answers |
| `temperature` | 0.2–0.3 | Low = focused, deterministic math |
| `top_p` | 0.8–0.85 | Nucleus sampling threshold |
| `stream` | `true` | Real-time streaming output |

### Using a Different Model

To use a faster/smaller model, edit the `model` field in `src/pages/Tutor.jsx` and `src/pages/Quiz.jsx`:

```js
// For faster responses on low-end hardware:
body: JSON.stringify({ model: 'llama3.2:1b', prompt, stream: true, ... })

// For better accuracy (needs more RAM):
body: JSON.stringify({ model: 'llama3.1:8b', prompt, stream: true, ... })
```

---

## 📱 PWA Installation

QuantMaster is installable as a Progressive Web App:

1. Open the app in Chrome/Edge on your phone
2. Tap the **"Install"** or **"Add to Home Screen"** prompt
3. The app works offline for quizzes (AI features need Ollama running)

---

## 🛠️ Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (port 5173) |
| `npm run build` | Build production bundle to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint checks |

### Re-parsing Questions from PDF

If you need to re-parse questions from a new PDF:

```bash
# 1. Extract text from PDF (place PDF in parent directory)
node ../extract_pdf.js

# 2. Parse the extracted text into questions.json
node parse_questions.cjs
```

---

## ⚙️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React 19 + Vite 8 |
| **Styling** | Vanilla CSS with CSS custom properties |
| **Typography** | Inter + JetBrains Mono (Google Fonts) |
| **Icons** | react-icons (Feather icon set) |
| **AI Backend** | Ollama (local LLM inference) |
| **AI Model** | LLaMA 3.2 (3B parameters) |
| **Storage** | localStorage (progress persistence) |
| **PWA** | Web App Manifest + meta tags |

---

## 🔧 Troubleshooting

| Issue | Fix |
|-------|-----|
| AI Explain shows "Ollama offline" | Run `ollama serve` in a terminal |
| Model not found error | Run `ollama pull llama3.2` |
| AI responses too slow | Use `llama3.2:1b` (smaller model) or ensure no other models are loaded |
| Questions not loading | Run `node parse_questions.cjs` to regenerate `questions.json` |
| PWA not installable | Serve over HTTPS or localhost only |

---

## 📄 License

This project is for educational purposes. The question bank is parsed from a quantitative aptitude PDF for personal study use.

---

<p align="center">
  Built with ❤️ for competitive exam aspirants
</p>
