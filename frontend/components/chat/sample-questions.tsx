'use client'

import { Button } from '@/components/ui/button'
import { Sparkles, ArrowRight } from 'lucide-react'

const QUESTIONS = [
  'I am 30 years old, earning 15 lakhs, non-smoker.',
  'I have 25 lakh in loans and earn 80 lakh per year.',
  'Show me return of premium plans.'
]

export default function SampleQuestionsCard({ onSelect }: { onSelect: (q: string) => void }) {
  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-2 text-slate-400 text-sm font-medium px-2">
        <Sparkles className="h-4 w-4" />
        <span>Get started with a scenario</span>
      </div>
      <div className="grid gap-3">
        {QUESTIONS.map((q, i) => (
          <button
            key={i}
            onClick={() => onSelect(q)}
            className="group flex items-center justify-between w-full p-4 text-left bg-white hover:bg-blue-50/50 border border-slate-100 hover:border-blue-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200"
          >
            <span className="text-slate-600 group-hover:text-primary text-sm font-medium">{q}</span>
            <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
          </button>
        ))}
      </div>
    </div>
  )
}