'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { MessageSquare, Loader2, Send, Home, BookOpen, Brain, Bot, User, RefreshCw } from 'lucide-react'
import { getChatHistory, streamChat } from '@/lib/api'
import { ChatMessage } from '@/types'
import Link from 'next/link'

const SUGGESTED_QUESTIONS = [
  'Summarize the main topics covered',
  'What are the key concepts I should know?',
  'Give me 3 important takeaways',
  'Explain the most complex idea in simple terms',
]

function ChatContent() {
  const params = useSearchParams()
  const router = useRouter()
  const sessionId = params.get('session')

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [title, setTitle] = useState('Learning Chat')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!sessionId) { router.push('/'); return }
    loadHistory()
  }, [sessionId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadHistory = async () => {
    try {
      const data = await getChatHistory(sessionId!)
      setMessages(data.messages || [])
    } catch {
      setMessages([])
    } finally {
      setLoadingHistory(false)
    }
  }

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim()
    if (!msg || streaming) return

    setInput('')
    const userMsg: ChatMessage = { role: 'user', content: msg }
    setMessages(prev => [...prev, userMsg])
    setStreaming(true)

    // Add placeholder assistant message
    const assistantMsg: ChatMessage = { role: 'assistant', content: '' }
    setMessages(prev => [...prev, assistantMsg])

    try {
      let full = ''
      for await (const chunk of streamChat(sessionId!, msg)) {
        full += chunk
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: full }
          return updated
        })
      }
    } catch (e: any) {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: `⚠️ Error: ${e.message || 'Failed to get response. Please try again.'}`
        }
        return updated
      })
    } finally {
      setStreaming(false)
      textareaRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (loadingHistory) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-400 mx-auto mb-4" />
        <p className="text-slate-400">Loading chat...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <Home className="w-4 h-4" />
          <span className="text-sm">Home</span>
        </Link>
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-400" />
          <span className="text-white font-medium text-sm">RAG Chat</span>
        </div>
        <div className="flex gap-3">
          <Link href={`/flashcards?session=${sessionId}`} className="flex items-center gap-1 text-slate-400 hover:text-white text-sm transition-colors">
            <BookOpen className="w-4 h-4" /> Cards
          </Link>
          <Link href={`/quiz?session=${sessionId}`} className="flex items-center gap-1 text-slate-400 hover:text-white text-sm transition-colors ml-2">
            <Brain className="w-4 h-4" /> Quiz
          </Link>
        </div>
      </nav>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto max-w-3xl mx-auto w-full px-6 py-6">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Bot className="w-8 h-8 text-indigo-400" />
            </div>
            <h2 className="text-white text-xl font-semibold mb-2">Ask anything about the content</h2>
            <p className="text-slate-500 text-sm mb-8">I use RAG to find the most relevant context and answer your questions.</p>
            <div className="grid grid-cols-2 gap-3">
              {SUGGESTED_QUESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="bg-white/5 border border-white/10 hover:border-indigo-500/30 hover:bg-indigo-500/10 text-slate-300 hover:text-white text-sm px-4 py-3 rounded-xl text-left transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 message-in ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                msg.role === 'assistant' ? 'bg-indigo-500/20' : 'bg-slate-600'
              }`}>
                {msg.role === 'assistant'
                  ? <Bot className="w-4 h-4 text-indigo-400" />
                  : <User className="w-4 h-4 text-slate-300" />
                }
              </div>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-sm'
                  : 'bg-white/8 border border-white/10 text-slate-200 rounded-tl-sm'
              }`}>
                {msg.content || (
                  <span className="flex gap-1 items-center">
                    <span className="dot-1 w-1.5 h-1.5 bg-slate-400 rounded-full inline-block" />
                    <span className="dot-2 w-1.5 h-1.5 bg-slate-400 rounded-full inline-block" />
                    <span className="dot-3 w-1.5 h-1.5 bg-slate-400 rounded-full inline-block" />
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/10 px-6 py-4 max-w-3xl mx-auto w-full">
        {messages.length > 0 && (
          <div className="flex gap-2 mb-3 flex-wrap">
            {SUGGESTED_QUESTIONS.slice(0, 2).map(q => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                disabled={streaming}
                className="text-xs text-slate-400 hover:text-white border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-full transition-colors disabled:opacity-40"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-3 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about the content... (Enter to send, Shift+Enter for newline)"
            rows={1}
            className="flex-1 bg-white/8 border border-white/20 focus:border-indigo-500 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm resize-none outline-none transition-colors max-h-32 overflow-y-auto"
            style={{ minHeight: '48px' }}
            disabled={streaming}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || streaming}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-colors shrink-0"
          >
            {streaming ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
        <p className="text-slate-600 text-xs mt-2 text-center">
          Powered by RAG — responses are grounded in your document's content
        </p>
      </div>
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>}>
      <ChatContent />
    </Suspense>
  )
}
