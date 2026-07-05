interface Props {
  value: number
  decimals?: number
  currency?: string
}
export function Currency({ value, decimals = 2, currency = 'MXN' }: Props) {
  return (
    <span>
      {value.toLocaleString('es-MX', { style: 'currency', currency, minimumFractionDigits: decimals })}
    </span>
  )
}
