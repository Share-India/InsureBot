'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, TrendingUp, Shield, IndianRupee, CheckCircle } from 'lucide-react'
import { useChatBot } from '@/hooks/use-chatbot'

export default function RecommendationsPage() {
  const router = useRouter()
  
  // MOCK DATA for display
  const MOCK_RECOMMENDATIONS = [
    {
      company: 'HDFC Life',
      product_name: 'Click 2 Protect Life',
      premium_estimate: 12500,
      csr: 99.4,
      score: 198,
      usp: 'Smart Exit Benefit',
    },
    {
      company: 'ICICI Prudential',
      product_name: 'iProtect Smart Plus',
      premium_estimate: 13200,
      csr: 95.4,
      score: 195,
      usp: 'Terminal Illness Cover',
    },
    {
      company: 'Bajaj Allianz Life',
      product_name: 'eTouch',
      premium_estimate: 11800,
      csr: 99.0,
      score: 194,
      usp: 'Premium Holiday',
    },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="border-b border-border bg-card sticky top-0 z-40">
        <div className="flex h-16 items-center gap-3 px-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="hover:bg-primary/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-bold text-primary">Personalized Recommendations</h1>
            <p className="text-xs text-muted-foreground">Based on your financial profile</p>
          </div>
        </div>
      </div>

      <main className="flex-1 px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <Card className="border-border bg-gradient-to-br from-card to-muted p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-primary">Recommended Coverage</h2>
                <p className="text-sm text-muted-foreground mt-1">Based on 20x annual income + liabilities</p>
              </div>
              <Shield className="h-8 w-8 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sum Assured</p>
              <p className="text-3xl font-bold text-primary">₹1,00,00,000+</p>
            </div>
          </Card>

          <div className="grid md:grid-cols-1 gap-6">
            {MOCK_RECOMMENDATIONS.map((rec, idx) => (
              <Card key={idx} className={`border-2 p-6 transition-all hover:shadow-lg ${idx === 0 ? 'border-accent bg-accent/5' : 'border-border bg-card'}`}>
                <div className="space-y-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-primary">{rec.company}</h3>
                      <p className="text-sm text-muted-foreground">{rec.product_name}</p>
                    </div>
                    {idx === 0 && (
                      <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-accent text-white text-xs font-semibold">
                        <TrendingUp className="h-3 w-3" /> Top Pick
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 rounded-lg bg-muted">
                      <p className="text-xs text-muted-foreground mb-1">Premium/Yr</p>
                      <p className="text-lg font-bold text-primary">₹{rec.premium_estimate.toLocaleString()}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted">
                      <p className="text-xs text-muted-foreground mb-1">CSR</p>
                      <p className="text-lg font-bold text-emerald-600">{rec.csr}%</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted">
                      <p className="text-xs text-muted-foreground mb-1">Score</p>
                      <p className="text-lg font-bold text-primary">{rec.score}</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-border bg-background">
                    <p className="text-xs text-muted-foreground mb-1">Key Feature</p>
                    <p className="text-sm font-semibold text-primary">{rec.usp}</p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button className="flex-1 bg-accent hover:bg-emerald-600 text-white">Select Plan</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}