'use client'

import { useState, useRef } from 'react'
import { Youtube, FileText, Upload, Loader2, CheckCircle, BookOpen, Brain, MessageSquare, ChevronRight, Sparkles } from 'lucide-react'
import { processVideo, processPDF } from '@/lib/api'
import { ProcessResult } from '@/types'
import Link from 'next/link'

type Tab = 'youtube' | 'pdf'
type Status = 'idle' | 'loading' | 'success' | 'error'

export default function HomePage() {
  const [tab, setTab] = useState<Tab>('youtube')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<ProcessResult | null>(null)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleProcess = async () => {
    setStatus('loading')
    setError('')
    setResult(null)
    try {
      if (tab === 'youtube') {
        if (!youtubeUrl.trim()) throw new Error('Please enter a YouTube URL')
        const data = await processVideo(youtubeUrl.trim())
        setResult(data)
      } else {
        if (!file) throw new Error('Please select a PDF file')
        const data = await processPDF(file)
        setResult(data)
      }
      setStatus('success')
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Processing failed')
      setStatus('error')
    }
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped?.type === 'application/pdf') setFile(dropped)
    else setError('Please drop a PDF file')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-semibold text-lg">LearnAI</span>
          </div>
          <nav className="flex items-center gap-4 text-sm text-slate-400">
            <span>AI-Powered Learning Assistant</span>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 text-indigo-300 text-sm mb-6">
            <Sparkles className="w-4 h-4" />
            Powered by GROQ + RAG
          </div>
          <h1 className="text-5xl font-bold text-white mb-4 leading-tight">
            Transform Content into
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400"> Knowledge</span>
          </h1>
          <p className="text-slate-400 text-xl max-w-2xl mx-auto">
            Upload a YouTube video or PDF and instantly generate flashcards, quizzes, and have an AI conversation about the content.
          </p>
        </div>

        {/* Features row */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { icon: BookOpen, label: 'Flashcards', desc: '10–15 smart cards' },
            { icon: Brain, label: 'Quiz', desc: '5–10 MCQ questions' },
            { icon: MessageSquare, label: 'RAG Chat', desc: 'Streaming Q&A' },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Icon className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="text-white font-medium text-sm">{label}</div>
              <div className="text-slate-500 text-xs mt-0.5">{desc}</div>
            </div>
          ))}
        </div>

        {/* Main card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-white/10">
            {(['youtube', 'pdf'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setStatus('idle'); setError('') }}
                className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors ${
                  tab === t
                    ? 'text-white border-b-2 border-indigo-500 bg-white/5'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t === 'youtube' ? <Youtube className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                {t === 'youtube' ? 'YouTube Video' : 'PDF Upload'}
              </button>
            ))}
          </div>

          <div className="p-8">
            {tab === 'youtube' ? (
              <div>
                <label className="block text-slate-300 text-sm mb-2 font-medium">YouTube URL</label>
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  onKeyDown={(e) => e.key === 'Enter' && handleProcess()}
                />
                <p className="text-slate-500 text-xs mt-2">
                  Works with any YouTube video that has captions/transcripts enabled.
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-slate-300 text-sm mb-2 font-medium">PDF File</label>
                <div
                  className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                    dragOver
                      ? 'border-indigo-400 bg-indigo-500/10'
                      : file
                      ? 'border-green-500/50 bg-green-500/5'
                      : 'border-white/20 hover:border-white/40'
                  }`}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleFileDrop}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  {file ? (
                    <div>
                      <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
                      <p className="text-green-300 font-medium">{file.name}</p>
                      <p className="text-slate-500 text-sm mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                      <p className="text-slate-300 font-medium">Drop PDF here or click to browse</p>
                      <p className="text-slate-500 text-sm mt-1">Max 20MB • Text-based PDFs only</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleProcess}
              disabled={status === 'loading'}
              className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing content...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Process & Generate Learning Materials
                </>
              )}
            </button>

            {/* Success result */}
            {status === 'success' && result && (
              <div className="mt-6 bg-green-500/10 border border-green-500/20 rounded-xl p-6 animate-fade-in">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-green-300 font-medium">Ready! "{result.title}"</span>
                </div>
                <div className="flex gap-2 text-xs text-slate-500 mb-5">
                  <span className="bg-white/5 px-2 py-1 rounded">{result.word_count.toLocaleString()} words</span>
                  <span className="bg-white/5 px-2 py-1 rounded">{result.chunk_count} chunks embedded</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { href: `/flashcards?session=${result.session_id}`, icon: BookOpen, label: 'View Flashcards', color: 'bg-blue-500/10 border-blue-500/20 text-blue-300 hover:bg-blue-500/20' },
                    { href: `/quiz?session=${result.session_id}`, icon: Brain, label: 'Take Quiz', color: 'bg-purple-500/10 border-purple-500/20 text-purple-300 hover:bg-purple-500/20' },
                    { href: `/chat?session=${result.session_id}`, icon: MessageSquare, label: 'Start Chat', color: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20' },
                  ].map(({ href, icon: Icon, label, color }) => (
                    <Link
                      key={href}
                      href={href}
                      className={`border rounded-xl p-3 text-center text-sm font-medium flex flex-col items-center gap-1.5 transition-colors ${color}`}
                    >
                      <Icon className="w-5 h-5" />
                      {label}
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
