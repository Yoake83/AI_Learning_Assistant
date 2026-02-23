import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

const api = axios.create({
  baseURL: API_URL,
  timeout: 120000, // 2 min for large files
})

export async function processVideo(url: string) {
  const { data } = await api.post('/process-video', { url })
  return data
}

export async function processPDF(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await api.post('/process-pdf', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function generateFlashcards(session_id: string, count = 12) {
  const { data } = await api.post('/generate-flashcards', { session_id, count })
  return data
}

export async function generateQuiz(session_id: string, count = 8) {
  const { data } = await api.post('/generate-quiz', { session_id, count })
  return data
}

export async function evaluateAnswer(session_id: string, question_id: string, selected_answer: number) {
  const { data } = await api.post('/quiz/evaluate', { session_id, question_id, selected_answer })
  return data
}

export async function getChatHistory(session_id: string) {
  const { data } = await api.get(`/chat/history/${session_id}`)
  return data
}

export async function getSessions() {
  const { data } = await api.get('/sessions')
  return data
}

export function createChatStream(session_id: string, message: string): EventSource {
  // We use fetch + ReadableStream for POST streaming
  return { session_id, message } as unknown as EventSource
}

export async function* streamChat(session_id: string, message: string): AsyncGenerator<string> {
  const response = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id, message }),
  })

  if (!response.ok) {
    throw new Error(`Chat failed: ${response.statusText}`)
  }

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const parsed = JSON.parse(line.slice(6))
          if (parsed.type === 'chunk') {
            yield parsed.content
          } else if (parsed.type === 'error') {
            throw new Error(parsed.message)
          }
        } catch (e) {
          // ignore parse errors on non-JSON lines
        }
      }
    }
  }
}

export default api
