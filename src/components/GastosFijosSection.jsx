import React, { useState, useRef } from 'react'
import { Plus, Trash2, ChevronDown, GripVertical } from 'lucide-react'
import { GRUPOS_GASTOS_FIJOS, getTarjetaColor, fmtARS, uid } from '../store'
import NumInput from './NumInput'

export default function GastosFijosSection({ gastosFijos, tarjetas, onChange, dolar }) {
  const [openGroups, setOpenGroups] = useState({
    Departamento: true, Servicios: true, Personales: true, Streaming: true,
  })
  // drag state
  const dragItem   = useRef(null)  // { id, grupo }
  const dragTarget = useRef(null)  // { id, grupo } — item sobre el que está hovering
  const [dragOverId, setDragOverId] = useState(null)
  const [dragOverGroup, setDragOverGroup] = useState(null)

  function toggleGroup(g) {
    setOpenGroups(prev => ({ ...prev, [g]: !prev[g] }))
  }
  function updateItem(id, field, value) {
    onChange(gastosFijos.map(g => g.id === id ? { ...g, [field]: value } : g))
  }
  function addItem(grupo) {
    onChange([...gastosFijos, { id: uid(), concepto: '', monto: 0, grupo, debitoAuto: null, usd: grupo === 'Streaming' }])
  }
  function removeItem(id) {
    onChange(gastosFijos.filter(g => g.id !== id))
  }

  // ── Drag handlers ──────────────────────────────────────────────────────────
  function handleDragStart(e, item) {
    dragItem.current = item
    e.dataTransfer.effectAllowed = 'move'
    // Fantasma transparente para que no tape
    const ghost = document.createElement('div')
    ghost.style.cssText = 'position:fixed;top:-1000px;opacity:0'
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, 0, 0)
    setTimeout(() => document.body.removeChild(ghost), 0)
  }

  function handleDragOver(e, targetItem, targetGrupo) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (!dragItem.current) return
    dragTarget.current = { id: targetItem?.id, grupo: targetGrupo }
    setDragOverId(targetItem?.id || null)
    setDragOverGroup(targetItem?.id ? null : targetGrupo)
  }

  function handleDrop(e, targetItem, targetGrupo) {
    e.preventDefault()
    if (!dragItem.current) return

    const srcId    = dragItem.current.id
    const srcGrupo = dragItem.current.grupo
    const dstId    = targetItem?.id
    const dstGrupo = targetGrupo

    if (srcId === dstId) { reset(); return }

    let list = [...gastosFijos]

    // Cambiar grupo del item arrastrado
    list = list.map(g => g.id === srcId ? { ...g, grupo: dstGrupo } : g)

    // Reordenar: sacar el origen y meterlo antes del destino
    const srcIdx = list.findIndex(g => g.id === srcId)
    const [moved] = list.splice(srcIdx, 1)

    if (dstId) {
      const dstIdx = list.findIndex(g => g.id === dstId)
      list.splice(dstIdx, 0, moved)
    } else {
      // Dropped en zona vacía de un grupo: agregar al final del grupo
      const lastInGroup = list.reduce((last, g, i) => g.grupo === dstGrupo ? i : last, -1)
      list.splice(lastInGroup + 1, 0, moved)
    }

    onChange(list)
    reset()
  }

  function handleDragEnd() { reset() }

  function reset() {
    dragItem.current   = null
    dragTarget.current = null
    setDragOverId(null)
    setDragOverGroup(null)
  }

  // ── Agrupar ────────────────────────────────────────────────────────────────
  const grupos = {}
  GRUPOS_GASTOS_FIJOS.forEach(g => { grupos[g] = [] })
  gastosFijos.forEach(g => {
    const grupo = g.grupo || 'Personales'
    if (!grupos[grupo]) grupos[grupo] = []
    grupos[grupo].push(g)
  })

  const totalGlobal = gastosFijos.reduce((a, g) => {
    const m = g.usd && dolar > 0 ? (g.monto || 0) * dolar : (g.monto || 0)
    return a + m
  }, 0)

  return (
    <div>
      {GRUPOS_GASTOS_FIJOS.map(grupo => {
        const items = grupos[grupo] || []
        const totalGrupo = items.reduce((a, g) => {
          const m = g.usd && dolar > 0 ? (g.monto || 0) * dolar : (g.monto || 0)
          return a + m
        }, 0)
        const isOpen = openGroups[grupo]
        const isDropZone = dragOverGroup === grupo

        return (
          <div
            key={grupo}
            className="card"
            style={{
              marginBottom: 12,
              outline: isDropZone ? '2px dashed var(--accent)' : '2px solid transparent',
              transition: 'outline .1s',
            }}
            onDragOver={e => { if (!items.length) handleDragOver(e, null, grupo) }}
            onDrop={e => { if (!items.length) handleDrop(e, null, grupo) }}
          >
            {/* Header del grupo */}
            <div
              className="collapse-header"
              onClick={() => toggleGroup(grupo)}
              style={{ marginBottom: isOpen ? 10 : 0 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text2)' }}>
                  {grupo}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>({items.length})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--red)' }}>{fmtARS(totalGrupo)}</span>
                <ChevronDown size={15} className={`collapse-arrow ${isOpen ? 'open' : ''}`} />
              </div>
            </div>

            {isOpen && (
              <>
                {/* Cabecera columnas */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '20px 1fr 130px 140px 24px',
                  gap: 6, marginBottom: 4, padding: '0 4px',
                  fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase',
                }}>
                  <span />
                  <span>Concepto</span>
                  <span style={{ textAlign: 'right' }}>{grupo === 'Streaming' ? 'USD' : 'ARS'}</span>
                  <span style={{ textAlign: 'center' }}>Débito auto</span>
                  <span />
                </div>

                {/* Drop zone visual cuando hay items */}
                {items.map(item => {
                  const color = item.debitoAuto ? getTarjetaColor(item.debitoAuto) : null
                  const montoARS = item.usd && dolar > 0 ? (item.monto || 0) * dolar : null
                  const isDraggedOver = dragOverId === item.id
                  const isDragging = dragItem.current?.id === item.id

                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={e => handleDragStart(e, { id: item.id, grupo })}
                      onDragOver={e => handleDragOver(e, item, grupo)}
                      onDrop={e => handleDrop(e, item, grupo)}
                      onDragEnd={handleDragEnd}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '20px 1fr 130px 140px 24px',
                        gap: 6, alignItems: 'center',
                        padding: '5px 4px', borderRadius: 6, marginBottom: 3,
                        background: color ? `${color.bg}22` : 'transparent',
                        border: isDraggedOver
                          ? '2px solid var(--accent)'
                          : color
                          ? `1px solid ${color.bg}66`
                          : '1px solid transparent',
                        opacity: isDragging ? 0.4 : 1,
                        transition: 'border .1s, opacity .15s',
                        cursor: 'grab',
                      }}
                    >
                      {/* Handle de arrastre */}
                      <div style={{ color: 'var(--text3)', display: 'flex', alignItems: 'center', cursor: 'grab' }}>
                        <GripVertical size={14} />
                      </div>

                      {/* Concepto */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        {color && (
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: color.bg, border: `1px solid ${color.border}`, flexShrink: 0 }} title={`Débito auto: ${item.debitoAuto}`} />
                        )}
                        <input
                          className="inline"
                          value={item.concepto}
                          placeholder="Concepto"
                          style={{ fontSize: 13, background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', borderRadius: 0 }}
                          onMouseDown={e => e.stopPropagation()}
                          onChange={e => updateItem(item.id, 'concepto', e.target.value)}
                        />
                      </div>

                      {/* Monto */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                        <NumInput
                          value={item.monto || 0}
                          onChange={v => updateItem(item.id, 'monto', v)}
                          style={{ fontSize: 13, width: '100%' }}
                          usd={item.usd}
                        />
                        {item.usd && dolar > 0 && item.monto > 0 && (
                          <span style={{ fontSize: 10, color: 'var(--yellow)', whiteSpace: 'nowrap' }}>
                            = {fmtARS(montoARS)} <span style={{ opacity: .7 }}>(venta)</span>
                          </span>
                        )}
                      </div>

                      {/* Débito auto */}
                      <select
                        value={item.debitoAuto || ''}
                        onChange={e => updateItem(item.id, 'debitoAuto', e.target.value || null)}
                        onMouseDown={e => e.stopPropagation()}
                        style={{
                          fontSize: 11, padding: '4px 6px',
                          background: color ? `${color.bg}33` : 'var(--bg3)',
                          color: color ? color.text : 'var(--text2)',
                          border: `1px solid ${color ? color.border : 'var(--border)'}`,
                          borderRadius: 6, width: '100%', cursor: 'pointer',
                        }}
                      >
                        <option value="">— sin débito —</option>
                        {(tarjetas || []).map(t => (
                          <option key={t.id} value={t.nombre}>{t.nombre}</option>
                        ))}
                      </select>

                      {/* Eliminar */}
                      <button className="btn-icon" onMouseDown={e => e.stopPropagation()} onClick={() => removeItem(item.id)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )
                })}

                {/* Drop zone vacía al final del grupo (cuando hay items) */}
                {items.length > 0 && (
                  <div
                    style={{
                      height: 28, borderRadius: 6, marginTop: 4,
                      border: dragOverGroup === grupo && dragOverId === null ? '2px dashed var(--accent)' : '2px dashed transparent',
                      transition: 'border .1s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, color: 'var(--text3)',
                    }}
                    onDragOver={e => { e.preventDefault(); setDragOverGroup(grupo); setDragOverId(null) }}
                    onDrop={e => handleDrop(e, null, grupo)}
                  >
                    {dragOverGroup === grupo && dragOverId === null && dragItem.current && '← soltar acá al final'}
                  </div>
                )}

                {/* Nota streaming USD */}
                {grupo === 'Streaming' && items.some(i => i.usd) && dolar > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4, display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span>Total streaming:</span>
                    <span style={{ fontWeight: 600, color: 'var(--green)' }}>
                      USD {items.filter(i => i.usd).reduce((a, i) => a + (i.monto || 0), 0).toFixed(2)}
                    </span>
                    <span style={{ color: 'var(--border)' }}>→</span>
                    <span style={{ fontWeight: 600 }}>
                      {fmtARS(items.filter(i => i.usd).reduce((a, i) => a + (i.monto || 0) * dolar, 0))}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--yellow)', background: 'rgba(245,158,11,.1)', padding: '2px 6px', borderRadius: 4 }}>
                      × venta {fmtARS(dolar)}
                    </span>
                  </div>
                )}

                <button className="btn-add" style={{ marginTop: 8 }} onClick={() => addItem(grupo)}>
                  <Plus size={13} /> Agregar a {grupo}
                </button>
              </>
            )}
          </div>
        )
      })}

      {/* Total global */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, padding: '8px 4px' }}>
        <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600 }}>Total gastos fijos:</span>
        <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--red)' }}>{fmtARS(totalGlobal)}</span>
      </div>
    </div>
  )
}
