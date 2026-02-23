'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { BookOpen, Loader2, ChevronLeft, ChevronRight, RotateCcw, Shuffle, Home, Brain, MessageSquare } from 'lucide-react'
import { generateFlashcards } from '@/lib/api'
import { Flashcard } from '@/types'
import Link from 'next/link'

function FlashcardsContent() {
  const params = useSearchParams()
  const router = useRouter()
  const sessionId = params.get('session')

  const [cards, setCards] = useState<Flashcard[]>([])
  const [current, setCurrent] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')

  useEffect(() => {
    if (!sessionId) { router.push('/'); return }
    generate()
  }, [sessionId])

  const generate = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await generateFlashcards(sessionId!, 12)
      setCards(data.flashcards)
      setTitle(data.session_title)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to generate flashcards')
    } finally {
      setLoading(false)
    }
  }

  const next = () => { setFlipped(false); setTimeout(() => setCurrent(c => (c + 1) % cards.length), 100) }
  const prev = () => { setFlipped(false); setTimeout(() => setCurrent(c => (c - 1 + cards.length) % cards.length), 100) }
  const shuffle = () => {
    setFlipped(false)
    setCards(c => [...c].sort(() => Math.random() - 0.5))
    setCurrent(0)
  }
  const reset = () => { setFlipped(false); setCurrent(0) }

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-400 mx-auto mb-4" />
        <p className="text-slate-400">Generating flashcards with AI...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button onClick={generate} className="bg-indigo-600 text-white px-6 py-2 rounded-xl">Retry</button>
      </div>
    </div>
  )

  const card = cards[current]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Navbar */}
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <Home className="w-4 h-4" />
          <span className="text-sm">Home</span>
        </Link>
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-400" />
          <span className="text-white font-medium text-sm truncate max-w-xs">{title}</span>
        </div>
        <div className="flex gap-2">
          <Link href={`/quiz?session=${sessionId}`} className="flex items-center gap-1 text-slate-400 hover:text-white text-sm transition-colors">
            <Brain className="w-4 h-4" /> Quiz
          </Link>
          <Link href={`/chat?session=${sessionId}`} className="flex items-center gap-1 text-slate-400 hover:text-white text-sm transition-colors ml-3">
            <MessageSquare className="w-4 h-4" /> Chat
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Progress */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-slate-400 text-sm">{current + 1} of {cards.length} cards</span>
          <div className="flex gap-2">
            <button onClick={shuffle} className="flex items-center gap-1 text-slate-400 hover:text-white text-sm transition-colors">
              <Shuffle className="w-4 h-4" /> Shuffle
            </button>
            <button onClick={reset} className="flex items-center gap-1 text-slate-400 hover:text-white text-sm transition-colors ml-3">
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
            <button onClick={generate} className="flex items-center gap-1 text-slate-400 hover:text-white text-sm transition-colors ml-3">
              Regenerate
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-white/10 rounded-full mb-8">
          <div
            className="h-1 bg-blue-500 rounded-full transition-all"
            style={{ width: `${((current + 1) / cards.length) * 100}%` }}
          />
        </div>

        {/* Card */}
        <div className="card-container h-72 mb-8 cursor-pointer" onClick={() => setFlipped(f => !f)}>
          <div className={`card-inner h-full rounded-2xl ${flipped ? 'flipped' : ''}`}>
            {/* Front */}
            <div className="card-front h-full bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center justify-center p-8 text-center">
              <div className="text-xs font-medium text-blue-400 uppercase tracking-wider mb-4">Question</div>
              <p className="text-white text-2xl font-medium leading-relaxed">{card?.front}</p>
              <p className="text-slate-500 text-sm mt-6">Click to reveal answer</p>
            </div>
            {/* Back */}
            <div className="card-back h-full bg-indigo-600/20 border border-indigo-500/30 rounded-2xl flex flex-col items-center justify-center p-8 text-center">
              <div className="text-xs font-medium text-indigo-400 uppercase tracking-wider mb-4">Answer</div>
              <p className="text-white text-xl leading-relaxed">{card?.back}</p>
              <p className="text-slate-500 text-sm mt-6">Click to flip back</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={prev}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-xl transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <button
            onClick={next}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl transition-colors"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Card dots */}
        <div className="flex justify-center gap-1.5 mt-6 flex-wrap">
          {cards.map((_, i) => (
            <button
              key={i}
              onClick={() => { setFlipped(false); setCurrent(i) }}
              className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-blue-400 w-4' : 'bg-white/20'}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function FlashcardsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>}>
      <FlashcardsContent />
    </Suspense>
  )
}
