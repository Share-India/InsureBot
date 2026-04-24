'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Volume2, Square, Bot, User } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MessageBubbleProps {
  role: 'user' | 'model'
  content: string
  onSpeak?: () => void
  isSpeaking?: boolean
  onStopSpeak?: () => void
}

export default function MessageBubble({ role, content, onSpeak, isSpeaking, onStopSpeak }: MessageBubbleProps) {
  const isUser = role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}>
      {/* Avatar for Bot */}
      {!isUser && (
        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-2 shrink-0 mt-2">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      )}

      <div className={`max-w-[85%] sm:max-w-xl`}>
        <div
          className={`
                px-6 py-4 shadow-sm relative
                ${isUser
              ? 'bg-primary text-white rounded-2xl rounded-tr-sm'
              : 'bg-white text-slate-700 border border-slate-100 rounded-2xl rounded-tl-sm'
            }
            `}
        >
          {role === 'model' && (
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  className="prose prose-sm max-w-none prose-p:leading-relaxed prose-strong:text-blue-600 prose-a:text-blue-500 prose-a:font-medium text-slate-700"
                  components={{
                    strong: ({ node, ...props }) => <span className="font-bold text-slate-900" {...props} />,
                    a: ({ node, ...props }) => <a target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 underline decoration-blue-200 underline-offset-2" {...props} />,
                    table: ({ node, ...props }) => <div className="overflow-x-auto my-4 rounded-lg border border-slate-200"><table className="min-w-full divide-y divide-slate-200" {...props} /></div>,
                    thead: ({ node, ...props }) => <thead className="bg-slate-50" {...props} />,
                    th: ({ node, ...props }) => <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider bg-slate-50" {...props} />,
                    td: ({ node, ...props }) => <td className="px-4 py-3 text-sm text-slate-600 border-t border-slate-100" {...props} />
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>
              {onSpeak && (
                <Button size="sm" variant="ghost" onClick={isSpeaking ? onStopSpeak : onSpeak} className="text-slate-400 hover:text-primary hover:bg-blue-50 h-6 w-6 p-0 rounded-full">
                  {isSpeaking ? <Square className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                </Button>
              )}
            </div>
          )}
          {role === 'user' && <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>}
        </div>
      </div>

      {/* Avatar for User (Optional, visually balances the conversation) */}
      {isUser && (
        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center ml-2 shrink-0 mt-2">
          <User className="h-4 w-4 text-slate-500" />
        </div>
      )}
    </div>
  )
}