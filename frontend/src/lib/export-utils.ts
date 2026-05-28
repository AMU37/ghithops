export function exportCSV(data: any[], columns: string[], labels: Record<string, string>, filename: string) {
  const header = columns.map((c) => labels[c] || c).join(",")
  const rows = data.map((row) => columns.map((c) => `"${(row[c] ?? "").toString().replace(/"/g, '""')}"`).join(","))
  const bom = "\uFEFF"
  const blob = new Blob([bom + header + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function exportPDF(data: any[], columns: string[], labels: Record<string, string>, _filename: string, title: string) {
  const styles = `
    <style>
      body { font-family: sans-serif; direction: rtl; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      th, td { border: 1px solid #333; padding: 8px; text-align: right; font-size: 12px; }
      th { background: #f59e0b; color: #000; }
      h1 { text-align: center; color: #333; }
    </style>
  `
  const header = columns.map((c) => `<th>${labels[c] || c}</th>`).join("")
  const rows = data.map((row) =>
    `<tr>${columns.map((c) => `<td>${row[c] ?? ""}</td>`).join("")}</tr>`
  ).join("")
  const html = `<!DOCTYPE html><html dir="rtl"><head>${styles}</head><body><h1>${title}</h1><table><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table></body></html>`
  const win = window.open("", "_blank")
  if (win) {
    win.document.write(html)
    win.document.close()
    win.focus()
    win.print()
  }
}
