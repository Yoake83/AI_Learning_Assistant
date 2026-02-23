export interface Session {
  id: string
  title: string
  source_type: 'youtube' | 'pdf'
  source_url?: string
  created_at: string
}

export interface ProcessResult {
  session_id: string
  title: string
  word_count: number
  chunk_count: number
  message: string
}

export interface Flashcard {
  id?: string
  front: string
  back: string
}

export interface QuizQuestion {
  id?: string
  question: string
  options: string[]
  correct_answer?: number
  explanation?: string
}

export interface ChatMessage {
  id?: string
  role: 'user' | 'assistant'
  content: string
  created_at?: string
}

export interface QuizState {
  questions: QuizQuestion[]
  answers: (number | null)[]
  results: ({ is_correct: boolean; correct_answer: number; explanation: string } | null)[]
  submitted: boolean[]
  score?: number
}
