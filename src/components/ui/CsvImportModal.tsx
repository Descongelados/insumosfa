import { useState, useRef } from 'react'
import { Modal } from './Modal'
import { toast } from '../../store/toastStore'
import { Upload, Download, AlertCircle } from 'lucide-react'

export interface CsvColumn {
  key: string
  label: string
  required?: boolean
  // Optional transform function for the raw string value
  transform?: (v: string) => unknown
}

interface ImportResult {
  ok: unknown[]
  errors: { row: number; msg: string }[]
}

interface Props {
  title: string
  columns: CsvColumn[]
  onImport: (rows: Record<string, unknown>[]) => Promise<void>
  exampleRow?: Record<string, string>
  onClose: () => void
}

/**
 * Generic CSV import modal.
 * Parses the first row as headers, maps to column keys, runs basic validation,
 * and calls onImport with the cleaned rows.
 */
export function CsvImportModal({ title, columns, onImport, exampleRow, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [errors, setErrors] = useState<{ row: number; msg: string }[]>([])
  const [parsed, setParsed] = useState(false)
  const [importing, setImporting] = useState(false)

  function parseCsv(text: string): ImportResult {
    const lines = text.split(/\r?\n/).filter(l => l.trim())
    if (lines.length < 2) return { ok: [], errors: [{ row: 0, msg: 'El archivo no tiene datos.' }] }

    // Parse CSV respecting quoted fields
    function parseRow(line: string): string[] {
      const result: string[] = []
      let cur = '', inQuote = false
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (ch === '"') { inQuote = !inQuote }
        else if (ch === ',' && !inQuote) { result.push(cur.trim()); cur = '' }
        else { cur += ch }
      }
      result.push(cur.trim())
      return result
    }

    const headers = parseRow(lines[0]).map(h => h.replace(/"/g, '').trim().toLowerCase())
    const ok: unknown[] = []
    const errors: { row: number; msg: string }[] = []

    for (let i = 1; i < lines.length; i++) {
      const vals = parseRow(lines[i])
      const row: Record<string, unknown> = {}
      let rowError = ''

      for (const col of columns) {
        const idx = headers.indexOf(col.label.toLowerCase())
        const raw = idx >= 0 ? (vals[idx] ?? '').replace(/"/g, '').trim() : ''

        if (col.required && !raw) {
          rowError = `Columna requerida "${col.label}" vacía`
          break
        }
        row[col.key] = col.transform ? col.transform(raw) : raw
      }

      if (rowError) {
        errors.push({ row: i + 1, msg: rowError })
      } else {
        ok.push(row)
      }
    }

    return { ok, errors }
  }

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const result = parseCsv(text)
      setRows(result.ok as Record<string, unknown>[])
      setErrors(result.errors)
      setParsed(true)
    }
    reader.readAsText(file, 'UTF-8')
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function downloadTemplate() {
    const headers = columns.map(c => `"${c.label}"`).join(',')
    const example = exampleRow
      ? columns.map(c => `"${exampleRow[c.key] ?? ''}"`).join(',')
      : columns.map(() => '""').join(',')
    const csv = '\uFEFF' + [headers, example].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `plantilla_${title.toLowerCase().replace(/\s/g, '_')}.csv`
    a.click()
  }

  async function handleImport() {
    if (rows.length === 0) { toast.error('No hay filas válidas para importar.'); return }
    setImporting(true)
    try {
      await onImport(rows)
      toast.success(`${rows.length} registros importados correctamente.`)
      onClose()
    } catch {
      toast.error('Error durante la importación. Revisa los datos e intenta de nuevo.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <Modal
      title={`Importar ${title} desde CSV`}
      onClose={onClose}
      size="md"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={importing}>Cancelar</button>
          <button className="btn-primary" onClick={() => void handleImport()} disabled={!parsed || rows.length === 0 || importing}>
            {importing
              ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
              : <Upload size={14} />}
            {importing ? 'Importando...' : `Importar ${rows.length > 0 ? rows.length + ' filas' : ''}`}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            El archivo debe tener una fila de encabezados con los nombres de columna exactos.
          </p>
          <button className="btn btn-secondary btn-sm flex items-center gap-1" onClick={downloadTemplate}>
            <Download size={13} /> Plantilla
          </button>
        </div>

        {/* Drop zone */}
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${parsed ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'}`}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
          />
          {parsed ? (
            <div className="text-green-700">
              <div className="text-2xl font-bold">{rows.length}</div>
              <div className="text-sm">filas listas para importar</div>
              {errors.length > 0 && <div className="text-xs text-amber-600 mt-1">{errors.length} filas con error omitidas</div>}
            </div>
          ) : (
            <div className="text-gray-400">
              <Upload size={28} className="mx-auto mb-2" />
              <div className="text-sm">Arrastra un archivo CSV o haz clic para seleccionar</div>
            </div>
          )}
        </div>

        {/* Errores */}
        {errors.length > 0 && (
          <div className="max-h-32 overflow-y-auto space-y-1">
            {errors.map((e, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
                <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
                <span>Fila {e.row}: {e.msg}</span>
              </div>
            ))}
          </div>
        )}

        {/* Preview */}
        {parsed && rows.length > 0 && (
          <div className="text-xs text-gray-500">
            <strong>Columnas esperadas:</strong> {columns.map(c => c.label).join(', ')}
          </div>
        )}
      </div>
    </Modal>
  )
}
