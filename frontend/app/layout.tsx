import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from 'sonner'
import './globals.css'
import { AuthListener } from '@/components/auth-listener'
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'InsureBot - AI Insurance Advisor | Share India Insurance',
  description: 'AI-powered term life insurance recommendations.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={cn("font-sans")}>
      <body className={inter.className}>
        <AuthListener />
        <TooltipProvider>
          {children}
          <Toaster position="bottom-right" />
        </TooltipProvider>
      </body>
    </html>
  )
}