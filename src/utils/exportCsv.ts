/**
 * Exporta un array de objetos a CSV y lo descarga en el navegador.
 *
 * @param rows    Array de objetos. Cada clave se convierte en columna.
 * @param headers Map de { clave: 'Etiqueta visible' } para renombrar / ordenar columnas.
 * @param filename Nombre del archivo sin extensión (se añade .csv automáticamente).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function exportToCsv<T extends Record<string, any>>(
  rows: T[],
  headers: Partial<Record<keyof T, string>>,
  filename: string,
): void {
  if (rows.length === 0) return

  const keys = Object.keys(headers) as (keyof T)[]
  const headerRow = keys.map(k => `"${(headers[k] ?? String(k)).replace(/"/g, '""')}"`).join(',')

  const dataRows = rows.map(row =>
    keys.map(k => {
      const val = row[k] ?? ''
      const str = String(val).replace(/"/g, '""')
      return `"${str}"`
    }).join(',')
  )

  const csv = [headerRow, ...dataRows].join('\r\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
