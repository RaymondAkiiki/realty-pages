'use client'
import { useState, useRef } from 'react'

interface Props {
  onClose: () => void
  onImported: (count: number) => void
}

interface ParsedRow {
  [key: string]: string
}

const TEMPLATE_HEADERS = ['name', 'phone', 'email', 'type', 'status', 'area', 'city', 'source', 'tags', 'notes']

export default function ImportModal({ onClose, onImported }: Props) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload')
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function downloadTemplate() {
    const csv = [
      TEMPLATE_HEADERS.join(','),
      'John Mukasa,+256700000001,john@example.com,broker,active,Kololo,Kampala,Referral,,High value contact',
      'Grace Nakazzi,+256700000002,grace@example.com,agent,lead,Bugolobi,Kampala,Portal,VIP,Interested in commercial',
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'realty-pages-import-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function parseFile(file: File) {
    setError('')
    const ext = file.name.split('.').pop()?.toLowerCase()

    if (ext === 'csv' || ext === 'txt') {
      const text = await file.text()
      const { default: Papa } = await import('papaparse')
      const result = Papa.parse(text, { header: true, skipEmptyLines: true, transformHeader: h => h.trim().toLowerCase() })
      setRows(result.data as ParsedRow[])
      setStep('preview')
    } else if (ext === 'xlsx' || ext === 'xls') {
      const arrayBuffer = await file.arrayBuffer()
      const XLSX = await import('xlsx')
      const workbook = XLSX.read(arrayBuffer)
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as ParsedRow[]
      // Normalize headers to lowercase
      const normalized = data.map(row => {
        const out: ParsedRow = {}
        Object.entries(row).forEach(([k, v]) => { out[k.toLowerCase().trim()] = String(v) })
        return out
      })
      setRows(normalized)
      setStep('preview')
    } else {
      setError('Please upload a .csv or .xlsx file')
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) parseFile(file)
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) parseFile(file)
  }

  async function handleImport() {
    setStep('importing')
    const res = await fetch('/api/contacts/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows }),
    })
    const data = await res.json()
    setResult(data)
    setStep('done')
    if (data.imported > 0) onImported(data.imported)
  }

  const sectionHeader = (text: string) => (
    <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <h2>{text}</h2>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
    </div>
  )

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ maxWidth: 640 }}>

        {step === 'upload' && (
          <>
            {sectionHeader('Import contacts')}
            <div style={{ padding: 24 }}>
              <p style={{ color: 'var(--ink-2)', fontSize: 13, marginBottom: 20 }}>
                Upload a CSV or Excel file. The first row must be column headers.
              </p>

              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border-2)'}`,
                  padding: '40px 24px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                  background: dragOver ? 'rgba(212,168,67,0.04)' : 'transparent',
                  marginBottom: 20,
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 12 }}>↑</div>
                <div style={{ fontWeight: 500, marginBottom: 6 }}>Drop file here or click to upload</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Supports .csv and .xlsx</div>
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} style={{ display: 'none' }} />
              </div>

              {error && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 16 }}>{error}</div>}

              {/* Required columns */}
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ink-2)', marginBottom: 8 }}>
                  Expected columns
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {TEMPLATE_HEADERS.map(h => (
                    <span key={h} className="tag">{h}</span>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>
                  Only <strong>name</strong> is required. All others are optional.
                </div>
              </div>

              <button className="btn btn-ghost btn-sm" onClick={downloadTemplate}>
                ↓ Download template
              </button>
            </div>
          </>
        )}

        {step === 'preview' && (
          <>
            {sectionHeader(`Preview — ${rows.length} rows`)}
            <div style={{ padding: '16px 24px 0' }}>
              <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 12 }}>
                Showing first 5 rows. Rows without a name will be skipped.
              </p>
              <div style={{ overflowX: 'auto', border: '1px solid var(--border)', marginBottom: 20 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-2)' }}>
                      {Object.keys(rows[0] || {}).slice(0, 7).map(k => (
                        <th key={k} style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)', color: 'var(--ink-2)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                          {k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="table-row">
                        {Object.values(row).slice(0, 7).map((val, j) => (
                          <td key={j} style={{ padding: '8px 12px', color: 'var(--ink)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {String(val) || <span style={{ color: 'var(--muted)' }}>—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setStep('upload')}>Back</button>
              <button className="btn btn-primary" onClick={handleImport}>
                Import {rows.length} contacts
              </button>
            </div>
          </>
        )}

        {step === 'importing' && (
          <>
            {sectionHeader('Importing...')}
            <div style={{ padding: 48, textAlign: 'center' }}>
              <div className="spinner" style={{ width: 24, height: 24, margin: '0 auto 16px', borderWidth: 3 }} />
              <div style={{ color: 'var(--ink-2)', fontSize: 13 }}>Importing {rows.length} contacts...</div>
            </div>
          </>
        )}

        {step === 'done' && result && (
          <>
            {sectionHeader('Import complete')}
            <div style={{ padding: 24 }}>
              <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                <div style={{ flex: 1, padding: 16, background: 'var(--surface-2)', border: '1px solid var(--border)', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 500, color: 'var(--success)' }}>{result.imported}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 4 }}>Imported</div>
                </div>
                <div style={{ flex: 1, padding: 16, background: 'var(--surface-2)', border: '1px solid var(--border)', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 500, color: 'var(--muted)' }}>{result.skipped}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 4 }}>Skipped</div>
                </div>
              </div>
              {result.errors.length > 0 && (
                <div style={{ fontSize: 12, color: 'var(--danger)', background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.2)', padding: 12 }}>
                  <div style={{ fontWeight: 500, marginBottom: 6 }}>Rows with errors:</div>
                  {result.errors.map((e, i) => <div key={i}>{e}</div>)}
                </div>
              )}
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={onClose}>Done</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
