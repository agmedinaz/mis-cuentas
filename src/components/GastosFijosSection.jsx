import React, { useState, useRef } from 'react'
import { Plus, Trash2, ChevronDown, GripVertical } from 'lucide-react'
import { GRUPOS_GASTOS_FIJOS, getTarjetaColor, fmtARS, uid } from '../store'
import NumInput from './NumInput'

const ALL_GRUPOS = [...GRUPOS_GASTOS_FIJOS, 'Otros gastos']

export default function GastosFijosSection({ gastosFijos, otrosGastos, tarjetas, onChangeFijos, onChangeOtros, dolar }) {
  const [open, setOpen] = useState(
    Object.fromEntries(ALL_GRUPOS.map(g => [g, true]))
  )
  const dragItem   = useRef(null)
  const dragTarget = useRef(null)
  const [overInfo, setOverInfo] = useState(null) // { id, grupo }

  function toggle(g) { setOpen(o => ({ ...o, [g]: !o[g] })) }

  // Unify all items into one list for drag purposes
  // Fijos by grupo, otrosGastos as grupo='Otros gastos'
  const allItems = [
    ...gastosFijos.map(g => ({ ...g, _src: 'fijos' })),
    ...(otrosGastos||[]).map(g => ({ ...g, grupo: 'Otros gastos', _src: 'otros' })),
  ]

  function saveItem(updatedItem) {
    const isOtros = updatedItem.grupo === 'Otros gastos'
    if (isOtros) {
      const list = (otrosGastos||[]).map(x => x.id === updatedItem.id ? updatedItem : x)
      onChangeOtros(list)
    } else {
      const list = gastosFijos.map(x => x.id === updatedItem.id ? updatedItem : x)
      onChangeFijos(list)
    }
  }

  function updateField(id, grupo, field, value) {
    const isOtros = grupo === 'Otros gastos'
    if (isOtros) {
      onChangeOtros((otrosGastos||[]).map(x => x.id === id ? { ...x, [field]: value } : x))
    } else {
      onChangeFijos(gastosFijos.map(x => x.id === id ? { ...x, [field]: value } : x))
    }
  }

  function addItem(grupo) {
    const item = { id: uid(), concepto: '', monto: 0, usd: grupo==='Streaming', debitoAuto: null }
    if (grupo === 'Otros gastos') {
      onChangeOtros([...(otrosGastos||[]), { ...item, grupo }])
    } else {
      onChangeFijos([...gastosFijos, { ...item, grupo }])
    }
  }

  function removeItem(id, grupo) {
    if (grupo === 'Otros gastos') {
      onChangeOtros((otrosGastos||[]).filter(x => x.id !== id))
    } else {
      onChangeFijos(gastosFijos.filter(x => x.id !== id))
    }
  }

  // Drag & drop
  function onDragStart(e, item) {
    dragItem.current = item
    e.dataTransfer.effectAllowed = 'move'
  }
  function onDragOver(e, targetItem, targetGrupo) {
    e.preventDefault()
    dragTarget.current = { id: targetItem?.id, grupo: targetGrupo }
    setOverInfo({ id: targetItem?.id || null, grupo: targetGrupo })
  }
  function onDrop(e, targetItem, targetGrupo) {
    e.preventDefault()
    const src = dragItem.current
    if (!src) { reset(); return }
    const dstGrupo = targetGrupo
    const dstId    = targetItem?.id

    // Build new unified list
    let list = [...allItems]
    // Change grupo
    list = list.map(x => x.id === src.id ? { ...x, grupo: dstGrupo } : x)
    // Reorder
    const srcIdx = list.findIndex(x => x.id === src.id)
    const [moved] = list.splice(srcIdx, 1)
    if (dstId) {
      const dstIdx = list.findIndex(x => x.id === dstId)
      list.splice(dstIdx, 0, moved)
    } else {
      const lastInGroup = list.reduce((last, x, i) => x.grupo === dstGrupo ? i : last, -1)
      list.splice(lastInGroup + 1, 0, moved)
    }

    // Split back
    onChangeFijos(list.filter(x => x.grupo !== 'Otros gastos').map(({ _src, ...x }) => x))
    onChangeOtros(list.filter(x => x.grupo === 'Otros gastos').map(({ _src, ...x }) => x))
    reset()
  }
  function onDragEnd() { reset() }
  function reset() { dragItem.current = null; dragTarget.current = null; setOverInfo(null) }

  // Group items
  const grupos = {}
  ALL_GRUPOS.forEach(g => { grupos[g] = [] })
  gastosFijos.forEach(g => {
    const gr = g.grupo || 'Personales'
    if (!grupos[gr]) grupos[gr] = []
    grupos[gr].push(g)
  });
  (otrosGastos||[]).forEach(g => grupos['Otros gastos'].push({ ...g, grupo: 'Otros gastos' }))

  const totalGlobal = [
    ...gastosFijos,
    ...(otrosGastos||[]),
  ].reduce((a, g) => {
    const m = g.usd && dolar > 0 ? (g.monto||0)*dolar : (g.monto||0)
    return a + m
  }, 0)

  return (
    <div>
      {ALL_GRUPOS.map(grupo => {
        const items = grupos[grupo] || []
        const totalGrupo = items.reduce((a, g) => {
          const m = g.usd && dolar > 0 ? (g.monto||0)*dolar : (g.monto||0)
          return a + m
        }, 0)
        const isOpen  = open[grupo]
        const isOver  = overInfo?.grupo === grupo && overInfo?.id === null

        return (
          <div key={grupo} className="s-card" style={{
            marginBottom: 8,
            outline: isOver ? '1px dashed var(--accent)' : 'none',
          }}
            onDragOver={e => { if (!items.length) onDragOver(e, null, grupo) }}
            onDrop={e => { if (!items.length) onDrop(e, null, grupo) }}
          >
            {/* Header */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer', userSelect:'none' }}
              onClick={() => toggle(grupo)}>
              <span style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', color:'var(--text2)' }}>
                {grupo} <span style={{ fontWeight:400, color:'var(--text3)' }}>({items.length})</span>
              </span>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:13, fontWeight:700, color:'#ef4444' }}>{fmtARS(totalGrupo)}</span>
                <ChevronDown size={13} style={{ color:'var(--text3)', transform: isOpen?'rotate(180deg)':'none', transition:'transform .15s' }} />
              </div>
            </div>

            {isOpen && (
              <div style={{ marginTop: 8 }}>
                {/* Col headers */}
                <div style={{ display:'grid', gridTemplateColumns:'14px 1fr 110px 44px 130px 20px', gap:5, fontSize:10, color:'var(--text3)', fontWeight:600, textTransform:'uppercase', marginBottom:3, paddingLeft:2 }}>
                  <span/><span>Concepto</span>
                  <span style={{ textAlign:'right' }}>Monto</span>
                  <span style={{ textAlign:'center' }}>Mon.</span>
                  <span style={{ textAlign:'center' }}>Débito auto</span>
                  <span/>
                </div>

                {items.map(item => {
                  const color    = item.debitoAuto ? getTarjetaColor(item.debitoAuto) : null
                  const montoARS = item.usd && dolar > 0 ? (item.monto||0)*dolar : null
                  const isOver2  = overInfo?.id === item.id

                  return (
                    <div key={item.id}
                      draggable
                      onDragStart={e => onDragStart(e, { ...item, grupo })}
                      onDragOver={e => onDragOver(e, item, grupo)}
                      onDrop={e => onDrop(e, item, grupo)}
                      onDragEnd={onDragEnd}
                      style={{
                        display:'grid', gridTemplateColumns:'14px 1fr 110px 44px 130px 20px',
                        gap:5, alignItems:'center',
                        padding:'4px 2px', borderRadius:4, marginBottom:2,
                        background: color ? `${color.bg}18` : 'transparent',
                        borderLeft: color ? `2px solid ${color.bg}` : '2px solid transparent',
                        borderBottom: isOver2 ? '2px solid var(--accent)' : '1px solid var(--border)',
                        opacity: dragItem.current?.id === item.id ? 0.35 : 1,
                        cursor: 'grab',
                        transition: 'opacity .1s',
                      }}
                    >
                      <GripVertical size={12} style={{ color:'var(--text3)' }} />

                      {/* Concepto */}
                      <input className="inline" value={item.concepto} placeholder="Concepto"
                        style={{ fontSize:13, background:'transparent', border:'none', borderBottom:'1px solid var(--border)', borderRadius:0 }}
                        onMouseDown={e=>e.stopPropagation()}
                        onChange={e => updateField(item.id, grupo, 'concepto', e.target.value)} />

                      {/* Monto */}
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end' }}>
                        <NumInput value={item.monto||0} onChange={v => updateField(item.id, grupo, 'monto', v)}
                          style={{ fontSize:13, width:'100%' }} usd={item.usd} />
                        {item.usd && dolar>0 && item.monto>0 && (
                          <span style={{ fontSize:10, color:'var(--text3)' }}>= {fmtARS(montoARS)}</span>
                        )}
                      </div>

                      {/* Moneda toggle */}
                      <button onMouseDown={e=>e.stopPropagation()}
                        onClick={() => updateField(item.id, grupo, 'usd', !item.usd)}
                        style={{ padding:'3px 4px', borderRadius:3, border:'none', cursor:'pointer', fontSize:10, fontWeight:700, width:'100%',
                          background: item.usd ? 'rgba(245,158,11,.2)' : 'var(--bg3)',
                          color: item.usd ? 'var(--yellow)' : 'var(--text3)' }}>
                        {item.usd?'USD':'ARS'}
                      </button>

                      {/* Débito auto */}
                      <select value={item.debitoAuto||''} onMouseDown={e=>e.stopPropagation()}
                        onChange={e => updateField(item.id, grupo, 'debitoAuto', e.target.value||null)}
                        style={{
                          fontSize:11, padding:'4px 6px', borderRadius:5, width:'100%', cursor:'pointer',
                          background: color ? color.bg : 'var(--bg3)',
                          color: color ? '#fff' : 'var(--text2)',
                          fontWeight: color ? 700 : 400,
                          border: `1px solid ${color ? color.border : 'var(--border)'}`,
                        }}>
                        <option value="">— sin débito —</option>
                        {(tarjetas||[]).map(t => <option key={t.id} value={t.nombre}>{t.nombre}</option>)}
                      </select>

                      <button className="btn-icon" onMouseDown={e=>e.stopPropagation()} onClick={() => removeItem(item.id, grupo)}>
                        <Trash2 size={12}/>
                      </button>
                    </div>
                  )
                })}

                {/* Drop zone vacía */}
                {items.length > 0 && (
                  <div style={{ height:20, borderRadius:4, border: overInfo?.grupo===grupo && overInfo?.id===null ? '1px dashed var(--accent)' : '1px dashed transparent', marginTop:2, transition:'border .1s' }}
                    onDragOver={e => { e.preventDefault(); setOverInfo({ id:null, grupo }) }}
                    onDrop={e => onDrop(e, null, grupo)} />
                )}

                {/* Streaming total */}
                {grupo==='Streaming' && items.some(i=>i.usd) && dolar>0 && (
                  <div style={{ fontSize:11, color:'var(--text3)', marginTop:4, textAlign:'right' }}>
                    {fmtARS(items.filter(i=>i.usd).reduce((a,i)=>a+(i.monto||0)*dolar,0))} (× venta {fmtARS(dolar)})
                  </div>
                )}

                <button className="s-add-btn" style={{ marginTop:6 }} onClick={() => addItem(grupo)}>+</button>
              </div>
            )}
          </div>
        )
      })}

      <div style={{ display:'flex', justifyContent:'flex-end', padding:'6px 0', fontSize:13, fontWeight:700 }}>
        Total gastos: <span style={{ color:'#ef4444', marginLeft:8 }}>{fmtARS(totalGlobal)}</span>
      </div>
    </div>
  )
}
