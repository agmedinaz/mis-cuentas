import React, { useState, useRef } from 'react'
import { Trash2, GripVertical } from 'lucide-react'
import { GRUPOS_GASTOS_FIJOS, getTarjetaColor, fmtARS, uid } from '../store'
import NumInput from './NumInput'

const ALL_GRUPOS = [...GRUPOS_GASTOS_FIJOS, 'Otros gastos']

// Una gran tabla con separadores por grupo — como la planilla
export default function GastosFijosSection({ gastosFijos, otrosGastos, tarjetas, onChangeFijos, onChangeOtros, dolar }) {
  const dragItem = useRef(null)
  const [overInfo, setOverInfo] = useState(null)

  // Unificar todos los items
  const allItems = [
    ...gastosFijos.map(g => ({ ...g, _src: 'fijos' })),
    ...(otrosGastos || []).map(g => ({ ...g, grupo: 'Otros gastos', _src: 'otros' })),
  ]

  function updateField(id, grupo, field, value) {
    const isOtros = grupo === 'Otros gastos'
    if (isOtros) onChangeOtros((otrosGastos || []).map(x => x.id === id ? { ...x, [field]: value } : x))
    else onChangeFijos(gastosFijos.map(x => x.id === id ? { ...x, [field]: value } : x))
  }

  function addItem(grupo) {
    const item = { id: uid(), concepto: '', monto: 0, usd: grupo === 'Streaming', debitoAuto: null }
    if (grupo === 'Otros gastos') onChangeOtros([...(otrosGastos || []), { ...item, grupo }])
    else onChangeFijos([...gastosFijos, { ...item, grupo }])
  }

  function removeItem(id, grupo) {
    if (grupo === 'Otros gastos') onChangeOtros((otrosGastos || []).filter(x => x.id !== id))
    else onChangeFijos(gastosFijos.filter(x => x.id !== id))
  }

  function onDragStart(e, item) { dragItem.current = item; e.dataTransfer.effectAllowed = 'move' }
  function onDragOver(e, id, grupo) { e.preventDefault(); setOverInfo({ id, grupo }) }
  function onDrop(e, targetId, targetGrupo) {
    e.preventDefault()
    const src = dragItem.current
    if (!src) { reset(); return }
    let list = [...allItems]
    list = list.map(x => x.id === src.id ? { ...x, grupo: targetGrupo } : x)
    const si = list.findIndex(x => x.id === src.id)
    const [moved] = list.splice(si, 1)
    if (targetId) { const di = list.findIndex(x => x.id === targetId); list.splice(di, 0, moved) }
    else { const last = list.reduce((l, x, i) => x.grupo === targetGrupo ? i : l, -1); list.splice(last + 1, 0, moved) }
    onChangeFijos(list.filter(x => x.grupo !== 'Otros gastos').map(({ _src, ...x }) => x))
    onChangeOtros(list.filter(x => x.grupo === 'Otros gastos').map(({ _src, ...x }) => x))
    reset()
  }
  function reset() { dragItem.current = null; setOverInfo(null) }

  // Agrupar
  const grupos = {}
  ALL_GRUPOS.forEach(g => { grupos[g] = [] })
  gastosFijos.forEach(g => { const gr = g.grupo || 'Personales'; if (grupos[gr]) grupos[gr].push(g) })
  ;(otrosGastos || []).forEach(g => grupos['Otros gastos'].push({ ...g, grupo: 'Otros gastos' }))

  const totalGlobal = allItems.reduce((a, g) => a + (g.usd && dolar > 0 ? (g.monto || 0) * dolar : (g.monto || 0)), 0)

  return (
    <div>
      {/* Una sola tabla con separadores de grupo */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: 'var(--bg3)' }}>
            <th style={{ ...th, width: 14 }}></th>
            <th style={th}>Concepto</th>
            <th style={{ ...th, textAlign: 'right' }}>Monto</th>
            <th style={{ ...th, textAlign: 'center', width: 44 }}>Mon.</th>
            <th style={{ ...th, width: 130 }}>Débito auto</th>
            <th style={{ ...th, width: 20 }}></th>
          </tr>
        </thead>
        <tbody>
          {ALL_GRUPOS.map(grupo => {
            const items = grupos[grupo] || []
            const grupoTotal = items.reduce((a, g) => a + (g.usd && dolar > 0 ? (g.monto || 0) * dolar : (g.monto || 0)), 0)
            return (
              <React.Fragment key={grupo}>
                {/* Separador de grupo */}
                <tr>
                  <td colSpan={6} style={{
                    padding: '6px 8px 3px',
                    borderTop: '1px solid var(--border)',
                    background: 'var(--bg3)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.07em' }}>
                        {grupo}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--red)' }}>{fmtARS(grupoTotal)}</span>
                        <button className="s-add-btn" onClick={() => addItem(grupo)} style={{ width: 18, height: 18, fontSize: 13 }}>+</button>
                      </div>
                    </div>
                  </td>
                </tr>

                {items.length === 0 && (
                  <tr onDragOver={e => onDragOver(e, null, grupo)} onDrop={e => onDrop(e, null, grupo)}>
                    <td colSpan={6} style={{ padding: '4px 8px', fontSize: 11, color: 'var(--text3)',
                      borderBottom: overInfo?.grupo === grupo ? '2px solid var(--accent)' : '1px solid var(--border)' }}>
                      —
                    </td>
                  </tr>
                )}

                {items.map(item => {
                  const color = item.debitoAuto ? getTarjetaColor(item.debitoAuto) : null
                  const montoARS = item.usd && dolar > 0 ? (item.monto || 0) * dolar : null
                  const isOver = overInfo?.id === item.id

                  return (
                    <tr key={item.id}
                      draggable
                      onDragStart={e => onDragStart(e, { ...item })}
                      onDragOver={e => onDragOver(e, item.id, grupo)}
                      onDrop={e => onDrop(e, item.id, grupo)}
                      onDragEnd={reset}
                      style={{
                        background: color ? `${color.bg}10` : 'transparent',
                        borderLeft: color ? `3px solid ${color.bg}` : '3px solid transparent',
                        borderBottom: isOver ? '2px solid var(--accent)' : '1px solid var(--border)',
                        opacity: dragItem.current?.id === item.id ? 0.35 : 1,
                        cursor: 'grab',
                      }}
                    >
                      <td style={{ padding: '2px 4px', width: 14 }}>
                        <GripVertical size={11} style={{ color: 'var(--text3)' }} />
                      </td>
                      <td style={td}>
                        <input className="inline" value={item.concepto} placeholder="Concepto"
                          style={{ fontSize: 12, width: '100%' }}
                          onMouseDown={e => e.stopPropagation()}
                          onChange={e => updateField(item.id, grupo, 'concepto', e.target.value)} />
                      </td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <NumInput value={item.monto || 0} onChange={v => updateField(item.id, grupo, 'monto', v)}
                            style={{ width: 100, fontSize: 12 }} usd={item.usd} />
                          {item.usd && montoARS !== null && item.monto > 0 && (
                            <span style={{ fontSize: 10, color: 'var(--text3)' }}>{fmtARS(montoARS)}</span>
                          )}
                        </div>
                      </td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        <button onMouseDown={e => e.stopPropagation()}
                          onClick={() => updateField(item.id, grupo, 'usd', !item.usd)}
                          style={{ padding: '1px 5px', borderRadius: 3, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700,
                            background: item.usd ? 'rgba(232,160,32,.2)' : 'var(--bg4)',
                            color: item.usd ? 'var(--yellow)' : 'var(--text3)' }}>
                          {item.usd ? 'USD' : 'ARS'}
                        </button>
                      </td>
                      <td style={td}>
                        <select value={item.debitoAuto || ''} onMouseDown={e => e.stopPropagation()}
                          onChange={e => updateField(item.id, grupo, 'debitoAuto', e.target.value || null)}
                          style={{
                            fontSize: 11, padding: '2px 4px', borderRadius: 3, width: '100%', cursor: 'pointer',
                            background: color ? color.bg : 'var(--bg3)',
                            color: color ? '#fff' : 'var(--text2)',
                            fontWeight: color ? 700 : 400,
                            border: `1px solid ${color ? color.border : 'var(--border)'}`,
                          }}>
                          <option value="">—</option>
                          {(tarjetas || []).map(t => <option key={t.id} value={t.nombre}>{t.nombre}</option>)}
                        </select>
                      </td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        <button className="btn-icon" onMouseDown={e => e.stopPropagation()} onClick={() => removeItem(item.id, grupo)}>
                          <Trash2 size={11} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </React.Fragment>
            )
          })}
        </tbody>
        <tfoot>
          <tr style={{ background: 'var(--bg3)', borderTop: '1px solid var(--border)' }}>
            <td colSpan={2} style={{ padding: '5px 8px', fontSize: 12, fontWeight: 700, color: 'var(--text2)' }}>Total gastos</td>
            <td style={{ padding: '5px 8px', textAlign: 'right', fontSize: 13, fontWeight: 800, color: 'var(--red)' }} colSpan={4}>{fmtARS(totalGlobal)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

const th = { padding: '4px 8px', fontWeight: 600, fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.05em', textAlign: 'left' }
const td = { padding: '3px 8px' }
