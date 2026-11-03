import React, { useState, useRef } from 'react'
import { Trash2, GripVertical } from 'lucide-react'
import { GRUPOS_GASTOS_FIJOS, getTarjetaColor, fmtARS, uid } from '../store'
import NumInput from './NumInput'

const ALL_GRUPOS = [...GRUPOS_GASTOS_FIJOS, 'Otros gastos']

export default function GastosFijosSection({ gastosFijos, otrosGastos, tarjetas, onChangeFijos, onChangeOtros, dolar }) {
  // Drag state held in refs — avoids stale closures
  const srcId    = useRef(null)
  const srcGrupo = useRef(null)
  const [overKey, setOverKey] = useState(null) // "grupo::itemId" | "grupo::"

  const allItems = [
    ...gastosFijos.map(g => ({ ...g, _src: 'fijos' })),
    ...(otrosGastos || []).map(g => ({ ...g, grupo: 'Otros gastos', _src: 'otros' })),
  ]

  function persist(list) {
    onChangeFijos(list.filter(x => x.grupo !== 'Otros gastos').map(({ _src, ...x }) => x))
    onChangeOtros(list.filter(x => x.grupo === 'Otros gastos').map(({ _src, ...x }) => x))
  }

  function updateField(id, grupo, field, value) {
    if (grupo === 'Otros gastos')
      onChangeOtros((otrosGastos||[]).map(x => x.id===id ? {...x,[field]:value} : x))
    else
      onChangeFijos(gastosFijos.map(x => x.id===id ? {...x,[field]:value} : x))
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

  // ── Drag handlers ───────────────────────────────────────────────
  function onDragStart(e, id, grupo) {
    srcId.current    = id
    srcGrupo.current = grupo
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/mis-cuentas', id)
  }
  function onDragOver(e, key) {
    e.preventDefault()
    e.stopPropagation()
    setOverKey(key)
    return false
  }
  function onDrop(e, dstId, dstGrupo) {
    e.preventDefault()
    e.stopPropagation()
    const sId = srcId.current
    const sGr = srcGrupo.current
    if (!sId) { setOverKey(null); return }
    if (sId === dstId) { setOverKey(null); return }

    // Work on a flat copy
    let list = allItems.map(x => x.id === sId ? { ...x, grupo: dstGrupo } : x)

    const si = list.findIndex(x => x.id === sId)
    const [moved] = list.splice(si, 1)

    if (dstId) {
      const di = list.findIndex(x => x.id === dstId)
      list.splice(di, 0, moved)
    } else {
      // Drop on group header — append to end of that group
      const lastInGrp = list.reduce((l, x, i) => x.grupo === dstGrupo ? i : l, -1)
      list.splice(lastInGrp + 1, 0, moved)
    }

    persist(list)
    srcId.current = null; srcGrupo.current = null; setOverKey(null)
  }
  function onDragEnd() {
    // Only clear visual indicator — don't clear srcId here so drop fires first
    setTimeout(() => { srcId.current = null; srcGrupo.current = null; setOverKey(null) }, 50)
  }

  // Group
  const grupos = {}
  ALL_GRUPOS.forEach(g => { grupos[g] = [] })
  gastosFijos.forEach(g => { const gr = g.grupo||'Personales'; if (grupos[gr]) grupos[gr].push(g) })
  ;(otrosGastos||[]).forEach(g => grupos['Otros gastos'].push({...g, grupo:'Otros gastos'}))

  const totalGlobal = allItems.reduce((a,g) =>
    a + (g.usd && dolar>0 ? (g.monto||0)*dolar : (g.monto||0)), 0)

  return (
    <div>
      {/* Column headers */}
      <div style={hdrRow}>
        <span style={{width:14}}/>
        <span style={{flex:1}}>Concepto</span>
        <span style={{width:116,textAlign:'right'}}>Monto</span>
        <span style={{width:46,textAlign:'center'}}>Mon.</span>
        <span style={{width:130,textAlign:'center'}}>Débito auto</span>
        <span style={{width:22}}/>
      </div>

      {ALL_GRUPOS.map(grupo => {
        const items     = grupos[grupo] || []
        const grupoTotal = items.reduce((a,g) => a+(g.usd&&dolar>0?(g.monto||0)*dolar:(g.monto||0)),0)
        const dropKey   = `${grupo}::`

        return (
          <div key={grupo}>
            {/* Group header — drop target */}
            <div
              onDragOver={e => onDragOver(e, dropKey)}
              onDrop={e => onDrop(e, null, grupo)}
              style={{
                ...groupHdr,
                outline: overKey===dropKey ? '1px dashed var(--accent)' : 'none',
              }}
            >
              <span style={{fontSize:11,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.07em'}}>
                {grupo}
              </span>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:11,fontWeight:700,color:'var(--red)'}}>{fmtARS(grupoTotal)}</span>
                <button className="s-add-btn" onClick={()=>addItem(grupo)} style={{width:18,height:18,fontSize:13,lineHeight:1}}>+</button>
              </div>
            </div>

            {items.length===0 && (
              <div
                onDragOver={e=>onDragOver(e,dropKey)}
                onDrop={e=>onDrop(e,null,grupo)}
                style={{padding:'5px 22px',fontSize:12,color:'var(--text3)',borderBottom:'1px solid var(--border)',
                  background: overKey===dropKey ? 'rgba(124,111,255,.06)' : 'transparent'}}
              >—</div>
            )}

            {items.map(item => {
              const color  = item.debitoAuto ? getTarjetaColor(item.debitoAuto) : null
              const mARS   = item.usd && dolar>0 ? (item.monto||0)*dolar : null
              const iKey   = `${grupo}::${item.id}`
              const isOver = overKey === iKey
              const isDrag = srcId.current === item.id

              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={e => onDragStart(e, item.id, grupo)}
                  onDragOver={e  => onDragOver(e, iKey)}
                  onDrop={e      => onDrop(e, item.id, grupo)}
                  onDragEnd={onDragEnd}
                  style={{
                    display:'flex', alignItems:'center', gap:4, padding:'3px 6px',
                    background: color ? `${color.bg}12` : 'transparent',
                    borderLeft: color ? `3px solid ${color.bg}` : '3px solid transparent',
                    borderBottom: isOver ? '2px solid var(--accent)' : '1px solid var(--border)',
                    opacity: isDrag ? 0.3 : 1,
                    cursor: 'grab',
                    userSelect: 'none',
                  }}
                >
                  <GripVertical size={12} style={{color:'var(--text3)',flexShrink:0,width:14}}/>

                  <input className="inline" value={item.concepto} placeholder="Concepto"
                    style={{flex:1,fontSize:14}}
                    onMouseDown={e=>e.stopPropagation()}
                    onChange={e=>updateField(item.id,grupo,'concepto',e.target.value)}/>

                  <div style={{width:116,display:'flex',flexDirection:'column',alignItems:'flex-end'}}>
                    <NumInput value={item.monto||0} onChange={v=>updateField(item.id,grupo,'monto',v)}
                      style={{width:'100%',fontSize:13}} usd={item.usd}/>
                    {item.usd && mARS!==null && item.monto>0 &&
                      <span style={{fontSize:10,color:'var(--text3)'}}>{fmtARS(mARS)}</span>}
                  </div>

                  <button style={{...monBtn, width:46,
                    background:item.usd?'rgba(232,160,32,.18)':'var(--bg4)',
                    color:item.usd?'var(--yellow)':'var(--text3)'}}
                    onMouseDown={e=>e.stopPropagation()}
                    onClick={()=>updateField(item.id,grupo,'usd',!item.usd)}>
                    {item.usd?'USD':'ARS'}
                  </button>

                  <select value={item.debitoAuto||''} onMouseDown={e=>e.stopPropagation()}
                    onChange={e=>updateField(item.id,grupo,'debitoAuto',e.target.value||null)}
                    style={{width:130,fontSize:12,padding:'2px 4px',borderRadius:3,cursor:'pointer',
                      background:color?color.bg:'var(--bg3)',
                      color:color?'#fff':'var(--text2)',
                      fontWeight:color?700:400,
                      border:`1px solid ${color?color.border:'var(--border)'}`}}>
                    <option value="">—</option>
                    {(tarjetas||[]).map(t=><option key={t.id} value={t.nombre}>{t.nombre}</option>)}
                  </select>

                  <button className="btn-icon" style={{width:22,flexShrink:0}}
                    onMouseDown={e=>e.stopPropagation()}
                    onClick={()=>removeItem(item.id,grupo)}>
                    <Trash2 size={12}/>
                  </button>
                </div>
              )
            })}
          </div>
        )
      })}

      <div style={{display:'flex',justifyContent:'flex-end',padding:'5px 8px',borderTop:'1px solid var(--border)',background:'var(--bg3)',gap:8}}>
        <span style={{fontSize:13,color:'var(--text2)'}}>Total</span>
        <span style={{fontSize:14,fontWeight:800,color:'var(--red)'}}>{fmtARS(totalGlobal)}</span>
      </div>
    </div>
  )
}

const hdrRow = { display:'flex',alignItems:'center',gap:4,padding:'4px 6px',background:'var(--bg3)',borderBottom:'1px solid var(--border)',fontSize:11,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.05em' }
const groupHdr = { display:'flex',justifyContent:'space-between',alignItems:'center',padding:'4px 6px',background:'var(--bg3)',borderTop:'1px solid var(--border)' }
const monBtn = { padding:'2px 0',borderRadius:3,border:'none',cursor:'pointer',fontSize:11,fontWeight:700,flexShrink:0,textAlign:'center' }
