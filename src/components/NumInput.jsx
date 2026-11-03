import React, { useState, useRef } from 'react'
import { evalExpr } from '../store'

const FMT = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/**
 * Input numérico inteligente:
 * - Sin foco: muestra "ARS 1.234,56" o "USD 4,55" según prop `usd`
 * - Con foco: muestra el número crudo para editar (ej: "1234,56")
 * - Acepta "." y "," como decimal indistintamente
 * - Acepta expresiones: "70000/2", "30.000+5.000"
 * - Enter confirma y sale del campo
 */
export default function NumInput({
  value,
  onChange,
  placeholder = '',
  style = {},
  className = '',
  usd = false,
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const ref = useRef()

  function handleFocus() {
    // Al entrar a editar mostramos el valor numérico formateado con coma decimal
    // sin prefijo de moneda, para que sea fácil de editar/reemplazar
    const raw = value === 0 || value === '' || value === null || value === undefined
      ? ''
      : FMT.format(Number(value))
    setDraft(raw)
    setEditing(true)
    // Seleccionar todo para que el usuario pueda reemplazar de una
    setTimeout(() => ref.current?.select(), 0)
  }

  function commit() {
    const result = evalExpr(draft)
    onChange(isNaN(result) ? 0 : result)
    setEditing(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') { commit(); ref.current?.blur() }
    if (e.key === 'Escape') { setEditing(false); ref.current?.blur() }
  }

  // Display sin foco: "ARS 1.234,56" o "USD 4,55"
  const isEmpty = value === 0 || value === '' || value === null || value === undefined
  const prefix = usd ? 'USD\u00a0' : 'ARS\u00a0'
  const display = isEmpty ? '' : prefix + FMT.format(Number(value))

  return (
    <input
      ref={ref}
      className={`inline ${className}`}
      style={{ textAlign: 'right', ...style }}
      value={editing ? draft : display}
      placeholder={placeholder}
      onFocus={handleFocus}
      onBlur={commit}
      onChange={e => setDraft(e.target.value)}
      onKeyDown={handleKeyDown}
      inputMode="decimal"
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
    />
  )
}
