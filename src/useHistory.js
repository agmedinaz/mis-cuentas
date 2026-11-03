import { useState, useCallback, useRef } from 'react'

/**
 * useHistory — undo/redo para cualquier valor serializable.
 * Guarda hasta `maxSize` estados anteriores.
 *
 * Uso:
 *   const { state, set, undo, redo, canUndo, canRedo } = useHistory(initialValue)
 *   set(nuevoEstado)   → guarda el estado actual en el historial y aplica el nuevo
 *   undo()             → vuelve al estado anterior
 *   redo()             → avanza al estado siguiente
 */
export function useHistory(initial, maxSize = 50) {
  // past[0] = más antiguo, past[last] = inmediatamente anterior
  const [past,    setPast]    = useState([])
  const [present, setPresent] = useState(initial)
  const [future,  setFuture]  = useState([])

  const set = useCallback((newState) => {
    setPast(p => {
      const trimmed = p.length >= maxSize ? p.slice(1) : p
      return [...trimmed, present]
    })
    setPresent(newState)
    setFuture([])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [present])

  const undo = useCallback(() => {
    if (past.length === 0) return
    const previous = past[past.length - 1]
    setPast(p => p.slice(0, -1))
    setFuture(f => [present, ...f])
    setPresent(previous)
  }, [past, present])

  const redo = useCallback(() => {
    if (future.length === 0) return
    const next = future[0]
    setFuture(f => f.slice(1))
    setPast(p => [...p, present])
    setPresent(next)
  }, [future, present])

  return {
    state:    present,
    set,
    undo,
    redo,
    canUndo:  past.length > 0,
    canRedo:  future.length > 0,
    pastCount:   past.length,
    futureCount: future.length,
  }
}
