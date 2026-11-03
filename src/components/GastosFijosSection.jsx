import React, { useState, useRef } from 'react'
import { Trash2, GripVertical } from 'lucide-react'
import { GRUPOS_GASTOS_FIJOS, getTarjetaColor, fmtARS, uid } from '../store'
import NumInput from './NumInput'

const ALL_GRUPOS = [...GRUPOS_GASTOS_FIJOS, 'Otros gastos']

export default function GastosFijosSection({ gastosFijos, otrosGastos, tarjetas, onChangeFijos, onChangeOtros, dolar }) {
  const dragItem = useRef(null)   // { id, grupo, index }
  const [overKey, setOverKey] = useState(null)  // "grupo:id" or "grupo:"

  const allItems = [
    ...gastosFijos.map(g => ({ ...g, _src: 'fijos' })),
    ...(otrosGastos || []).map(g => ({ ...g, grupo: 'Otros gastos', _src: 'otros' })),
  ]

  function updateField(id, grupo, field, value) {
    if (grupo === 'Otros gastos') onChangeOtros((otrosGastos||[]).map(x => x.id===id ? {...x,[field]:value} : x))
    else onChangeFijos(gastosFijos.map(x => x.id===id ? {...x,[field]:value} : x))
  }
  function addItem(grupo) {
    const item = { id: uid(), concepto: '', monto: 0, usd: grupo==='Streaming', debitoAuto: null, grupo }
    if (grupo==='Otros gastos') onChangeOtros([...(otrosGastos||[]), item])
    else onChangeFijos([...gastosFijos, item])
  }
  function removeItem(id, grupo) {
    if (grupo==='Otros gastos') onChangeOtros((otrosGastos||[]).filter(x=>x.id!==id))
    else onChangeFijos(gastosFijos.filter(x=>x.id!==id))
  }

  // ── Drag ────────────────────────────────────────────────────────
  function handleDragStart(e, item, grupo) {
    dragItem.current = { ...item, grupo }
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', item.id) // required for Firefox
  }
  function handleDragOver(e, key) {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setOverKey(key)
  }
  function handleDrop(e, targetId, targetGrupo) {
    e.preventDefault()
    e.stopPropagation()
    const src = dragItem.current
    if (!src || src.id === targetId) { reset(); return }

    // Build unified list, change grupo of src
    let list = allItems.map(x => x.id===src.id ? {...x, grupo: targetGrupo} : x)

    // Reorder: remove src, insert before target (or at end of group)
    const srcIdx = list.findIndex(x => x.id===src.id)
    const [moved] = list.splice(srcIdx, 1)

    if (targetId) {
      const dstIdx = list.findIndex(x => x.id===targetId)
      list.splice(dstIdx, 0, moved)
    } else {
      // Drop on group header or empty zone → append to end of that group
      const lastInGroup = list.reduce((l,x,i) => x.grupo===targetGrupo ? i : l, -1)
      list.splice(lastInGroup+1, 0, moved)
    }

    onChangeFijos(list.filter(x=>x.grupo!=='Otros gastos').map(({_src,...x})=>x))
    onChangeOtros(list.filter(x=>x.grupo==='Otros gastos').map(({_src,...x})=>x))
    reset()
  }
  function reset() { dragItem.current=null; setOverKey(null) }

  // Group items
  const grupos = {}
  ALL_GRUPOS.forEach(g => { grupos[g] = [] })
  gastosFijos.forEach(g => { const gr=g.grupo||'Personales'; if(grupos[gr]) grupos[gr].push(g) })
  ;(otrosGastos||[]).forEach(g => grupos['Otros gastos'].push({...g,grupo:'Otros gastos'}))

  const totalGlobal = allItems.reduce((a,g) => a + (g.usd&&dolar>0 ? (g.monto||0)*dolar : (g.monto||0)), 0)

  return (
    <div onDragEnd={reset}>
      {/* Col headers — once, sticky */}
      <div style={{ display:'grid', gridTemplateColumns:'14px 1fr 116px 46px 130px 22px', gap:4, padding:'4px 6px', background:'var(--bg3)', borderBottom:'1px solid var(--border)', fontSize:11, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.05em' }}>
        <span/>
        <span>Concepto</span>
        <span style={{textAlign:'right'}}>Monto</span>
        <span style={{textAlign:'center'}}>Mon.</span>
        <span style={{textAlign:'center'}}>Débito auto</span>
        <span/>
      </div>

      {ALL_GRUPOS.map(grupo => {
        const items = grupos[grupo]||[]
        const grupoTotal = items.reduce((a,g)=>a+(g.usd&&dolar>0?(g.monto||0)*dolar:(g.monto||0)),0)
        const dropKey = `${grupo}:`

        return (
          <div key={grupo}>
            {/* Group header — droppable */}
            <div
              onDragOver={e => handleDragOver(e, dropKey)}
              onDrop={e => handleDrop(e, null, grupo)}
              style={{
                display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'4px 6px', background:'var(--bg3)',
                borderTop:'1px solid var(--border)',
                outline: overKey===dropKey ? '1px dashed var(--accent)' : 'none',
              }}
            >
              <span style={{fontSize:11,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.07em'}}>{grupo}</span>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:11,fontWeight:700,color:'var(--red)'}}>{fmtARS(grupoTotal)}</span>
                <button className="s-add-btn" onClick={()=>addItem(grupo)} style={{width:18,height:18,fontSize:13}}>+</button>
              </div>
            </div>

            {/* Items */}
            {items.map(item => {
              const color = item.debitoAuto ? getTarjetaColor(item.debitoAuto) : null
              const montoARS = item.usd&&dolar>0 ? (item.monto||0)*dolar : null
              const itemKey = `${grupo}:${item.id}`
              const isOver = overKey===itemKey
              const isDragging = dragItem.current?.id===item.id

              return (
                <div key={item.id}
                  draggable
                  onDragStart={e => handleDragStart(e, item, grupo)}
                  onDragOver={e => handleDragOver(e, itemKey)}
                  onDrop={e => handleDrop(e, item.id, grupo)}
                  style={{
                    display:'grid', gridTemplateColumns:'14px 1fr 116px 46px 130px 22px',
                    gap:4, alignItems:'center', padding:'3px 6px',
                    background: color ? `${color.bg}12` : 'transparent',
                    borderLeft: color ? `3px solid ${color.bg}` : '3px solid transparent',
                    borderBottom: isOver ? '2px solid var(--accent)' : '1px solid var(--border)',
                    opacity: isDragging ? 0.3 : 1,
                    cursor:'grab',
                  }}
                >
                  <GripVertical size={12} style={{color:'var(--text3)'}}/>

                  <input className="inline" value={item.concepto} placeholder="Concepto"
                    style={{fontSize:14,width:'100%'}}
                    onMouseDown={e=>e.stopPropagation()}
                    onChange={e=>updateField(item.id,grupo,'concepto',e.target.value)}/>

                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end'}}>
                    <NumInput value={item.monto||0} onChange={v=>updateField(item.id,grupo,'monto',v)}
                      style={{width:'100%',fontSize:13}} usd={item.usd}/>
                    {item.usd&&montoARS!==null&&item.monto>0 && (
                      <span style={{fontSize:10,color:'var(--text3)'}}>{fmtARS(montoARS)}</span>
                    )}
                  </div>

                  <button onMouseDown={e=>e.stopPropagation()}
                    onClick={()=>updateField(item.id,grupo,'usd',!item.usd)}
                    style={{padding:'2px 5px',borderRadius:3,border:'none',cursor:'pointer',fontSize:11,fontWeight:700,
                      background:item.usd?'rgba(232,160,32,.2)':'var(--bg4)',
                      color:item.usd?'var(--yellow)':'var(--text3)'}}>
                    {item.usd?'USD':'ARS'}
                  </button>

                  <select value={item.debitoAuto||''} onMouseDown={e=>e.stopPropagation()}
                    onChange={e=>updateField(item.id,grupo,'debitoAuto',e.target.value||null)}
                    style={{fontSize:12,padding:'2px 4px',borderRadius:3,width:'100%',cursor:'pointer',
                      background:color?color.bg:'var(--bg3)',
                      color:color?'#fff':'var(--text2)',
                      fontWeight:color?700:400,
                      border:`1px solid ${color?color.border:'var(--border)'}`}}>
                    <option value="">—</option>
                    {(tarjetas||[]).map(t=><option key={t.id} value={t.nombre}>{t.nombre}</option>)}
                  </select>

                  <button className="btn-icon" onMouseDown={e=>e.stopPropagation()} onClick={()=>removeItem(item.id,grupo)}>
                    <Trash2 size={12}/>
                  </button>
                </div>
              )
            })}

            {items.length===0 && (
              <div onDragOver={e=>handleDragOver(e,dropKey)} onDrop={e=>handleDrop(e,null,grupo)}
                style={{padding:'4px 24px',fontSize:12,color:'var(--text3)',borderBottom:'1px solid var(--border)',
                  outline:overKey===dropKey?'1px dashed var(--accent)':'none'}}>
                —
              </div>
            )}
          </div>
        )
      })}

      {/* Total */}
      <div style={{display:'flex',justifyContent:'flex-end',padding:'6px 8px',borderTop:'1px solid var(--border)',background:'var(--bg3)',gap:8}}>
        <span style={{fontSize:13,color:'var(--text2)'}}>Total</span>
        <span style={{fontSize:14,fontWeight:800,color:'var(--red)'}}>{fmtARS(totalGlobal)}</span>
      </div>
    </div>
  )
}
