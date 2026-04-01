'use client'
import { useState, useRef, useEffect } from 'react'

interface Props {
  onClose: () => void
  onImported: (count: number) => void
}

interface ParsedRow { [key: string]: string }

const TEMPLATE_HEADERS = ['name', 'phone', 'email', 'type', 'status', 'area', 'city', 'source', 'tags', 'notes']

const PHASES = [
  { label: 'Reading file',        detail: 'Parsing rows and headers...' },
  { label: 'Validating data',     detail: 'Checking required fields...' },
  { label: 'Writing to database', detail: 'Saving contacts...' },
  { label: 'Finalising',          detail: 'Wrapping up...' },
]

export default function ImportModal({ onClose, onImported }: Props) {
  const [step, setStep] = useState<'upload' | 'parsing' | 'preview' | 'importing' | 'done'>('upload')
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Import progress state
  const [progress, setProgress] = useState(0)       // 0–100
  const [phaseIdx, setPhaseIdx] = useState(0)
  const [liveCount, setLiveCount] = useState(0)
  const [showCheck, setShowCheck] = useState(false)
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Animate progress bar during import
  function startProgressAnimation(total: number) {
    setProgress(0)
    setPhaseIdx(0)
    setLiveCount(0)
    setShowCheck(false)

    let current = 0
    const phases = [
      { target: 20, duration: 600 },   // Reading file
      { target: 45, duration: 800 },   // Validating
      { target: 85, duration: 1200 },  // Writing — longest
      { target: 95, duration: 400 },   // Finalising
    ]

    let phaseI = 0
    let phaseStart = Date.now()

    const tick = () => {
      const now = Date.now()
      const elapsed = now - phaseStart
      const phase = phases[phaseI]
      if (!phase) return

      const phaseProgress = Math.min(elapsed / phase.duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - phaseProgress, 3)
      const prevTarget = phaseI === 0 ? 0 : phases[phaseI - 1].target
      current = prevTarget + (phase.target - prevTarget) * eased

      setProgress(Math.round(current))
      setPhaseIdx(phaseI)

      // Simulate live count climbing proportionally
      const countTarget = Math.round((current / 85) * total)
      setLiveCount(Math.min(countTarget, total))

      if (phaseProgress >= 1) {
        phaseI++
        phaseStart = Date.now()
        if (phaseI >= phases.length) {
          if (progressRef.current) clearInterval(progressRef.current)
        }
      }
    }

    progressRef.current = setInterval(tick, 30)
  }

  function finishProgress(imported: number) {
    if (progressRef.current) clearInterval(progressRef.current)
    setProgress(100)
    setLiveCount(imported)
    setPhaseIdx(3)
    setTimeout(() => setShowCheck(true), 200)
  }

  useEffect(() => {
    return () => { if (progressRef.current) clearInterval(progressRef.current) }
  }, [])

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
    setFileName(file.name)
    setStep('parsing')
    const ext = file.name.split('.').pop()?.toLowerCase()

    try {
      if (ext === 'csv' || ext === 'txt') {
        const text = await file.text()
        const { default: Papa } = await import('papaparse')
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true, transformHeader: h => h.trim().toLowerCase() })
        setRows(parsed.data as ParsedRow[])
      } else if (ext === 'xlsx' || ext === 'xls') {
        const arrayBuffer = await file.arrayBuffer()
        const XLSX = await import('xlsx')
        const workbook = XLSX.read(arrayBuffer)
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const data = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as ParsedRow[]
        const normalized = data.map(row => {
          const out: ParsedRow = {}
          Object.entries(row).forEach(([k, v]) => { out[k.toLowerCase().trim()] = String(v) })
          return out
        })
        setRows(normalized)
      } else {
        setError('Please upload a .csv or .xlsx file')
        setStep('upload')
        return
      }
      setStep('preview')
    } catch (err) {
      setError('Failed to read file. Please check the format.')
      setStep('upload')
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
    startProgressAnimation(rows.length)

    const res = await fetch('/api/contacts/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows }),
    })
    const data = await res.json()

    finishProgress(data.imported || 0)

    // Small delay so user sees 100% before transitioning
    setTimeout(() => {
      setResult(data)
      setStep('done')
      if (data.imported > 0) onImported(data.imported)
    }, 900)
  }

  const header = (text: string) => (
    <div style={{
      padding: '16px 20px',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1,
    }}>
      <h2>{text}</h2>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 22, lineHeight: 1, padding: 4 }}>×</button>
    </div>
  )

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget && step !== 'importing') onClose() }}>
      <div className="modal" style={{ maxWidth: 580 }}>

        {/* ── Upload ── */}
        {step === 'upload' && (
          <>
            {header('Import contacts')}
            <div style={{ padding: '20px 20px 24px' }}>
              <p style={{ color: 'var(--ink-2)', fontSize: 13, marginBottom: 20 }}>
                Upload a CSV or Excel file. First row must be column headers.
              </p>

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
                  transition: 'all 0.15s',
                  background: dragOver ? 'rgba(212,168,67,0.06)' : 'transparent',
                  marginBottom: 20,
                  transform: dragOver ? 'scale(1.01)' : 'scale(1)',
                }}
              >
                <div style={{
                  width: 48, height: 48, margin: '0 auto 14px',
                  border: `1.5px solid ${dragOver ? 'var(--accent)' : 'var(--border-2)'}`,
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: dragOver ? 'var(--accent)' : 'var(--muted)',
                  transition: 'all 0.15s',
                }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M10 14V4M6 8l4-4 4 4"/>
                    <path d="M3 14v2a1 1 0 001 1h12a1 1 0 001-1v-2"/>
                  </svg>
                </div>
                <div style={{ fontWeight: 500, marginBottom: 5, color: 'var(--ink)' }}>
                  {dragOver ? 'Release to upload' : 'Drop file here or click to browse'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>CSV or Excel (.xlsx)</div>
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} style={{ display: 'none' }} />
              </div>

              {error && (
                <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 16, padding: '8px 12px', background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.2)' }}>
                  {error}
                </div>
              )}

              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: 14, marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ink-2)', marginBottom: 8 }}>
                  Expected columns
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {TEMPLATE_HEADERS.map(h => <span key={h} className="tag">{h}</span>)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  Only <strong style={{ color: 'var(--ink-2)' }}>name</strong> is required.
                </div>
              </div>

              <button className="btn btn-ghost btn-sm" onClick={downloadTemplate}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M2 10v3h12v-3M8 2v8M5 7l3 3 3-3"/>
                </svg>
                Download template
              </button>
            </div>
          </>
        )}

        {/* ── Parsing (reading file) ── */}
        {step === 'parsing' && (
          <>
            {header('Reading file')}
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ marginBottom: 20 }}>
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" style={{ animation: 'spin 1.2s linear infinite' }}>
                  <path d="M20 4a16 16 0 0116 16" opacity="0.3"/>
                  <path d="M20 4a16 16 0 0116 16"/>
                </svg>
              </div>
              <div style={{ fontWeight: 500, marginBottom: 6 }}>Reading {fileName}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>Parsing rows and columns...</div>
            </div>
          </>
        )}

        {/* ── Preview ── */}
        {step === 'preview' && (
          <>
            {header(`Preview — ${rows.length.toLocaleString()} rows found`)}
            <div style={{ padding: '16px 20px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '10px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--success)" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M13 3L6 13l-3-3"/>
                </svg>
                <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                  <strong style={{ color: 'var(--ink)' }}>{rows.length.toLocaleString()} rows</strong> detected in <strong style={{ color: 'var(--ink)' }}>{fileName}</strong>. Rows without a name will be skipped.
                </span>
              </div>

              <div style={{ overflowX: 'auto', border: '1px solid var(--border)', marginBottom: 16 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-2)' }}>
                      {Object.keys(rows[0] || {}).slice(0, 6).map(k => (
                        <th key={k} style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)', color: 'var(--ink-2)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                          {k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="table-row">
                        {Object.values(row).slice(0, 6).map((val, j) => (
                          <td key={j} style={{ padding: '8px 12px', color: 'var(--ink)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {String(val) || <span style={{ color: 'var(--muted)' }}>—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 5 && (
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16, paddingLeft: 2 }}>
                  Showing first 5 of {rows.length.toLocaleString()} rows
                </div>
              )}
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setStep('upload')}>← Back</button>
              <button className="btn btn-primary" onClick={handleImport}>
                Import {rows.length.toLocaleString()} contacts
              </button>
            </div>
          </>
        )}

        {/* ── Importing ── */}
        {step === 'importing' && (
          <>
            {header('Importing...')}
            <div style={{ padding: '32px 24px 36px' }}>

              {/* Animated icon */}
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <div style={{
                  width: 64, height: 64,
                  margin: '0 auto 16px',
                  position: 'relative',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {/* Rotating ring */}
                  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" style={{ position: 'absolute', inset: 0, animation: 'spin 1.4s linear infinite' }}>
                    <circle cx="32" cy="32" r="28" stroke="var(--border-2)" strokeWidth="2"/>
                    <path d="M32 4a28 28 0 0128 28" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  {/* Pulsing dot */}
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: 'var(--accent)',
                    animation: 'pulse 1s ease-in-out infinite',
                  }} />
                </div>

                {/* Phase label */}
                <div style={{ fontWeight: 500, fontSize: 15, marginBottom: 4, color: 'var(--ink)' }}>
                  {PHASES[phaseIdx]?.label}
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                  {PHASES[phaseIdx]?.detail}
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ marginBottom: 16 }}>
                <div style={{
                  height: 4,
                  background: 'var(--border)',
                  borderRadius: 2,
                  overflow: 'hidden',
                  marginBottom: 10,
                }}>
                  <div style={{
                    height: '100%',
                    width: `${progress}%`,
                    background: 'var(--accent)',
                    borderRadius: 2,
                    transition: 'width 0.1s linear',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)' }}>
                  <span>{progress}%</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>
                    {liveCount.toLocaleString()} / {rows.length.toLocaleString()} contacts
                  </span>
                </div>
              </div>

              {/* Phase steps */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {PHASES.map((phase, i) => {
                  const done = i < phaseIdx || progress === 100
                  const active = i === phaseIdx && progress < 100
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      opacity: done || active ? 1 : 0.35,
                      transition: 'opacity 0.3s',
                    }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                        background: done ? 'var(--success)' : active ? 'rgba(212,168,67,0.15)' : 'var(--surface-2)',
                        border: `1.5px solid ${done ? 'var(--success)' : active ? 'var(--accent)' : 'var(--border)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.3s',
                      }}>
                        {done ? (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round">
                            <path d="M2 5l2.5 2.5L8 2.5"/>
                          </svg>
                        ) : active ? (
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 1s infinite' }} />
                        ) : (
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--border-2)' }} />
                        )}
                      </div>
                      <span style={{
                        fontSize: 13,
                        color: done ? 'var(--ink)' : active ? 'var(--accent)' : 'var(--muted)',
                        fontWeight: active ? 500 : 400,
                        transition: 'color 0.3s',
                      }}>
                        {phase.label}
                      </span>
                      {active && (
                        <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
                          in progress
                        </span>
                      )}
                      {done && (
                        <span style={{ fontSize: 11, color: 'var(--success)', marginLeft: 'auto' }}>
                          done
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              <div style={{ marginTop: 20, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
                Please wait — do not close this window
              </div>
            </div>
          </>
        )}

        {/* ── Done ── */}
        {step === 'done' && result && (
          <>
            {header('Import complete')}
            <div style={{ padding: '28px 24px 24px' }}>

              {/* Success animation */}
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'rgba(76,175,125,0.12)',
                  border: '1.5px solid var(--success)',
                  margin: '0 auto 14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: 'popIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round">
                    <path d="M5 12l5 5L19 7" style={{ animation: 'drawCheck 0.4s ease 0.1s both', strokeDasharray: 30, strokeDashoffset: 0 }}/>
                  </svg>
                </div>
                <div style={{ fontWeight: 500, fontSize: 15, color: 'var(--ink)' }}>
                  {result.imported > 0 ? 'Contacts imported successfully' : 'Import finished'}
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div style={{ padding: '16px', background: 'var(--surface-2)', border: '1px solid var(--border)', textAlign: 'center', borderRadius: 2 }}>
                  <div style={{ fontSize: 32, fontWeight: 500, color: 'var(--success)', fontFamily: 'var(--font-mono)', lineHeight: 1, marginBottom: 6 }}>
                    {result.imported.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Imported</div>
                </div>
                <div style={{ padding: '16px', background: 'var(--surface-2)', border: '1px solid var(--border)', textAlign: 'center', borderRadius: 2 }}>
                  <div style={{ fontSize: 32, fontWeight: 500, color: 'var(--muted)', fontFamily: 'var(--font-mono)', lineHeight: 1, marginBottom: 6 }}>
                    {result.skipped.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Skipped</div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div style={{ fontSize: 12, color: 'var(--danger)', background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.2)', padding: 12, marginBottom: 16 }}>
                  <div style={{ fontWeight: 500, marginBottom: 6 }}>Rows with errors:</div>
                  {result.errors.map((e, i) => <div key={i} style={{ marginTop: 3 }}>{e}</div>)}
                </div>
              )}
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={onClose}>Done</button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
        @keyframes popIn {
          from { transform: scale(0.6); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  )
}
