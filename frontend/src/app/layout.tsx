import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI Learning Assistant',
  description: 'Transform YouTube videos and PDFs into flashcards, quizzes, and interactive chat',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50">
        {children}
      </body>
    </html>
  )
}
