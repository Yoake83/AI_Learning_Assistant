'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Brain, Loader2, CheckCircle, XCircle, Home, BookOpen, MessageSquare, Trophy, RefreshCw } from 'lucide-react'
import { generateQuiz, evaluateAnswer } from '@/lib/api'
import { QuizQuestion } from '@/types'
import Link from 'next/link'

function QuizContent() {
  const params = useSearchParams()
  const router = useRouter()
  const sessionId = params.get('session')

  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [questionIds, setQuestionIds] = useState<string[]>([])
  const [selected, setSelected] = useState<(number | null)[]>([])
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [evaluating, setEvaluating] = useState<boolean[]>([])
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    if (!sessionId) { router.push('/'); return }
    loadQuiz()
  }, [sessionId])

  const loadQuiz = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await generateQuiz(sessionId!, 8)
      setQuestions(data.questions)
      setQuestionIds(data.questions.map((q: any) => q.id).filter(Boolean))
      setTitle(data.session_title)
      setSelected(new Array(data.questions.length).fill(null))
      setResults(new Array(data.questions.length).fill(null))
      setEvaluating(new Array(data.questions.length).fill(false))
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load quiz')
    } finally {
      setLoading(false)
    }
  }

  const handleAnswer = async (qi: number, optionIndex: number) => {
    if (results[qi] !== null) return // Already answered

    const newSelected = [...selected]
    newSelected[qi] = optionIndex
    setSelected(newSelected)

    // Auto-evaluate if we have question IDs from backend
    if (questionIds[qi]) {
      const newEvaluating = [...evaluating]
      newEvaluating[qi] = true
      setEvaluating(newEvaluating)

      try {
        const result = await evaluateAnswer(sessionId!, questionIds[qi], optionIndex)
        const newResults = [...results]
        newResults[qi] = result
        setResults(newResults)
      } catch {
        // Fallback: just mark as answered without server evaluation
        const newResults = [...results]
        newResults[qi] = { is_correct: null, correct_answer: null, explanation: 'Could not evaluate' }
        setResults(newResults)
      } finally {
        const newEvaluating = [...evaluating]
        newEvaluating[qi] = false
        setEvaluating(newEvaluating)
      }
    } else {
      // No IDs — just record selection, user can submit all at end
      const newResults = [...results]
      newResults[qi] = { pending: true }
      setResults(newResults)
    }
  }

  const score = results.filter(r => r?.is_correct === true).length
  const answered = results.filter(r => r !== null).length
  const allAnswered = answered === questions.length

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin text-purple-400 mx-auto mb-4" />
        <p className="text-slate-400">Generating quiz questions with AI...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button onClick={loadQuiz} className="bg-purple-600 text-white px-6 py-2 rounded-xl">Retry</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900">
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <Home className="w-4 h-4" />
          <span className="text-sm">Home</span>
        </Link>
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-400" />
          <span className="text-white font-medium text-sm truncate max-w-xs">{title}</span>
        </div>
        <div className="flex gap-3">
          <Link href={`/flashcards?session=${sessionId}`} className="flex items-center gap-1 text-slate-400 hover:text-white text-sm transition-colors">
            <BookOpen className="w-4 h-4" /> Cards
          </Link>
          <Link href={`/chat?session=${sessionId}`} className="flex items-center gap-1 text-slate-400 hover:text-white text-sm transition-colors ml-2">
            <MessageSquare className="w-4 h-4" /> Chat
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Score header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-white text-2xl font-bold">Knowledge Quiz</h1>
            <p className="text-slate-400 text-sm mt-1">{answered}/{questions.length} answered</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-purple-400">{answered > 0 ? Math.round((score / answered) * 100) : 0}%</div>
            <div className="text-slate-500 text-xs">{score} correct</div>
          </div>
        </div>

        {/* Progress */}
        <div className="h-1.5 bg-white/10 rounded-full mb-8">
          <div
            className="h-1.5 bg-purple-500 rounded-full transition-all"
            style={{ width: `${(answered / questions.length) * 100}%` }}
          />
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {questions.map((q, qi) => (
            <div key={qi} className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-start gap-3 mb-5">
                <span className="bg-purple-500/20 text-purple-300 text-xs font-bold px-2 py-1 rounded-lg shrink-0">Q{qi + 1}</span>
                <p className="text-white font-medium leading-relaxed">{q.question}</p>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {q.options.map((opt, oi) => {
                  const result = results[qi]
                  const isSelected = selected[qi] === oi
                  const isCorrect = result?.correct_answer === oi
                  const isWrong = isSelected && result?.is_correct === false

                  let cls = 'w-full text-left px-4 py-3 rounded-xl border text-sm transition-all flex items-center gap-3 '
                  if (result && isCorrect) {
                    cls += 'bg-green-500/15 border-green-500/40 text-green-300'
                  } else if (isWrong) {
                    cls += 'bg-red-500/15 border-red-500/40 text-red-300'
                  } else if (isSelected && !result) {
                    cls += 'bg-purple-500/20 border-purple-500/40 text-purple-200'
                  } else if (result) {
                    cls += 'bg-white/3 border-white/10 text-slate-500'
                  } else {
                    cls += 'bg-white/5 border-white/15 text-slate-300 hover:bg-white/10 hover:border-white/25 cursor-pointer'
                  }

                  return (
                    <button
                      key={oi}
                      className={cls}
                      onClick={() => handleAnswer(qi, oi)}
                      disabled={result !== null || evaluating[qi]}
                    >
                      <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center shrink-0 text-xs font-bold">
                        {['A', 'B', 'C', 'D'][oi]}
                      </span>
                      <span className="flex-1">{opt}</span>
                      {result && isCorrect && <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />}
                      {isWrong && <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                      {evaluating[qi] && isSelected && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
                    </button>
                  )
                })}
              </div>

              {results[qi]?.explanation && (
                <div className="mt-4 bg-white/5 border border-white/10 rounded-xl p-3 text-slate-400 text-sm">
                  <span className="text-indigo-400 font-medium">Explanation: </span>
                  {results[qi].explanation}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Final score */}
        {allAnswered && (
          <div className="mt-8 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20 rounded-2xl p-8 text-center animate-fade-in">
            <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
            <h2 className="text-white text-2xl font-bold mb-1">Quiz Complete!</h2>
            <p className="text-slate-400 mb-4">You scored {score} out of {questions.length}</p>
            <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400 mb-6">
              {Math.round((score / questions.length) * 100)}%
            </div>
            <button
              onClick={loadQuiz}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-xl mx-auto transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Try New Quiz
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function QuizPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>}>
      <QuizContent />
    </Suspense>
  )
}
