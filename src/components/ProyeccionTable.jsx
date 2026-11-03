import React from 'react'
import { fmtARS, monthName } from '../store'

export default function ProyeccionTable({ proyeccion, currentYear, currentMonth }) {
  if (!proyeccion?.length) return null
  const meses = proyeccion.map((_, i) => {
    const tot = currentMonth + i
    const m = ((tot - 1) % 12) + 1
    const y = currentYear + Math.floor((tot - 1) / 12)
    return monthName(m).slice(0, 3) + ' ' + String(y).slice(2)
  })
  return (
    <div className="s-section" style={{marginTop:4}}>
      <div className="s-section-header">
        <span className="s-section-title">Proyección</span>
        <span style={{fontSize:10,color:'var(--text3)'}}>a medida que vencen cuotas</span>
      </div>
      <div style={{overflowX:'auto'}}>
        <table className="proj-table">
          <thead>
            <tr>
              <th></th>
              {meses.map((m,i) => <th key={i} style={{color:i===0?'var(--accent3)':'var(--text3)'}}>{m}</th>)}
            </tr>
          </thead>
          <tbody>
            {[
              {label:'Gastos fijos',field:'gastosFijos',color:'var(--red)'},
              {label:'Presupuesto', field:'presupuesto', color:'var(--green)'},
              {label:'Ahorro',      field:'ahorro',      color:'var(--green)'},
              {label:'Libre',       field:'libre',       color:'var(--accent3)'},
            ].map(r => (
              <tr key={r.label}>
                <td style={{color:'var(--text2)',fontWeight:600}}>{r.label}</td>
                {proyeccion.map((d,i) => (
                  <td key={i} style={{color:i===0?r.color:'var(--text3)',fontWeight:i===0?700:400}}>
                    {fmtARS(d[r.field])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
