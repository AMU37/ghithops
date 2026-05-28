import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "GhithOps",
  description: "الغيث لأتمتة العمليات الإدارية التشغيلية",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  )
}
