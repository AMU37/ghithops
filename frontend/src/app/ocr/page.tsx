"use client"

import { useState, useRef } from "react"
import { Upload, FileText, Scan, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { aiAPI } from "@/lib/api"

export default function OCRPage() {
  const [image, setImage] = useState<string | null>(null)
  const [fileName, setFileName] = useState("")
  const [extracted, setExtracted] = useState("")
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => setImage(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const processOCR = async () => {
    if (!image) return
    setLoading(true)
    setExtracted("")
    try {
      const res = await aiAPI.ocr.process({ image, title: fileName } as any)
      setExtracted(res.data.extracted_text)
    } catch {
      setExtracted("حدث خطأ أثناء معالجة الصورة")
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">التعرف على المستندات</h1>
        <p className="text-sm text-zinc-500 mt-1">رفع الصور واستخراج النصوص منها باستخدام الذكاء الاصطناعي</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-zinc-100">رفع صورة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-700 p-8 cursor-pointer hover:border-amber-500 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {image ? (
                <img src={image} alt="Preview" className="max-h-64 rounded-lg object-contain" />
              ) : (
                <>
                  <Upload className="h-12 w-12 text-zinc-500 mb-2" />
                  <p className="text-sm text-zinc-400">اضغط لرفع صورة</p>
                  <p className="text-xs text-zinc-600">يدعم JPG, PNG, BMP</p>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
            {fileName && <p className="text-xs text-zinc-500">{fileName}</p>}

            <Button
              onClick={processOCR}
              disabled={!image || loading}
              className="w-full gap-2 bg-amber-500 text-black hover:bg-amber-400"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scan className="h-4 w-4" />}
              {loading ? "جاري المعالجة..." : "استخراج النص"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-zinc-100">النص المستخرج</CardTitle>
          </CardHeader>
          <CardContent>
            {extracted ? (
              <div className="rounded-lg bg-zinc-900 p-4">
                <pre className="text-sm text-zinc-200 whitespace-pre-wrap font-sans" dir="auto">{extracted}</pre>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
                <FileText className="h-12 w-12 mb-2 opacity-30" />
                <p className="text-sm">انتظر استخراج النص...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
