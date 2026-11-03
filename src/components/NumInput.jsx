import React, { useState, useRef, useEffect } from 'react'
import { evalExpr } from '../store'

/**
 * Input numérico inteligente:
 * - Vacío en lugar de "0" cuando no tiene foco
 * - Acepta expresiones: "70000/2", "30000+5000"
 * - Enter o blur confirma y evalúa
 * - Muestra el valor formateado sin foco, la expresión con foco
 */
export default function NumInput({ value, onChange, placeholder = '', style = {}, className = '', usd = false }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const ref = useRef()

  function handleFocus() {
    setDraft(value === 0 || value === '' ? '' : String(value).replace(/\./g, ''))
    setEditing(true)
  }

  function handleBlur() {
    commit()
  }

  function commit() {
    const result = evalExpr(draft)
    onChange(isNaN(result) ? 0 : result)
    setEditing(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      commit()
      ref.current?.blur()
    }
    if (e.key === 'Escape') {
      setEditing(false)
      ref.current?.blur()
    }
  }

  // Formato de display cuando no está editando
  const display = (!value || value === 0) ? '' : Number(value).toLocaleString('es-AR')

  return (
    <input
      ref={ref}
      className={`inline ${className}`}
      style={{ ...style, textAlign: 'right' }}
      value={editing ? draft : display}
      placeholder={editing ? '' : placeholder}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={e => setDraft(e.target.value)}
      onKeyDown={handleKeyDown}
      inputMode="decimal"
    />
  )
}
