import React, { useState } from 'react'
import { FileText, Download, CheckSquare, Square, Eye } from 'lucide-react'
import { loadMonth, calcMonth, fmtARS, monthName, loadPendingPurchases } from '../store'

export default function Historial({ months, toast }) {
  const [seleccionados, setSeleccionados] = useState(
    months.length > 0 ? [months[0].id] : []
  )
  const [generando, setGenerando] = useState(false)
  const [preview, setPreview] = useState(null)

  const pending = loadPendingPurchases()

  function toggleMes(id) {
    setSeleccionados(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function selectAll() {
    setSeleccionados(months.map(m => m.id))
  }
  function selectNone() {
    setSeleccionados([])
  }

  // Datos de los meses seleccionados (orden cronológico)
  const datosSeleccionados = months
    .filter(m => seleccionados.includes(m.id))
    .map(m => {
      const data = loadMonth(m.id)
      if (!data) return null
      const calc = calcMonth(data, pending)
      return { meta: m, data, calc }
    })
    .filter(Boolean)
    .reverse()

  async function generarPDF() {
    if (datosSeleccionados.length === 0) return
    setGenerando(true)
    try {
      await generarYDescargarPDF(datosSeleccionados)
      toast('PDF generado correctamente')
    } catch (e) {
      toast('Error al generar el PDF: ' + e.message, 'error')
      console.error(e)
    } finally {
      setGenerando(false)
    }
  }

  return (
    <>
      {/* Selector */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">
          <div className="card-title-left"><FileText size={14} /> Seleccioná los meses</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" style={{ padding: '3px 10px', fontSize: 12 }} onClick={selectAll}>Todos</button>
            <button className="btn btn-ghost" style={{ padding: '3px 10px', fontSize: 12 }} onClick={selectNone}>Ninguno</button>
          </div>
        </div>
        {months.length === 0 && (
          <div style={{ color: 'var(--text3)', fontSize: 13 }}>Sin meses cargados aún.</div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {months.map(m => {
            const sel = seleccionados.includes(m.id)
            return (
              <button
                key={m.id}
                onClick={() => toggleMes(m.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: sel ? 'rgba(108,99,255,.2)' : 'var(--bg3)',
                  color: sel ? 'var(--accent3)' : 'var(--text2)',
                  fontWeight: sel ? 700 : 400, fontSize: 13,
                  outline: sel ? '1px solid var(--accent)' : 'none',
                  transition: 'all .15s',
                }}
              >
                {sel ? <CheckSquare size={14} /> : <Square size={14} />}
                {monthName(m.month)} {m.year}
              </button>
            )
          })}
        </div>
      </div>

      {/* Botón generar */}
      {datosSeleccionados.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <button
            className="btn btn-primary"
            onClick={generarPDF}
            disabled={generando}
            style={{ opacity: generando ? .7 : 1 }}
          >
            <Download size={15} />
            {generando ? 'Generando PDF…' : `Descargar PDF (${datosSeleccionados.length} ${datosSeleccionados.length === 1 ? 'mes' : 'meses'})`}
          </button>
        </div>
      )}

      {/* Preview de los meses seleccionados */}
      {datosSeleccionados.map(({ meta, data, calc }) => (
        <ResumenMes key={meta.id} meta={meta} data={data} calc={calc} />
      ))}

      {datosSeleccionados.length === 0 && months.length > 0 && (
        <div className="empty-state">
          <FileText size={40} />
          <p>Seleccioná al menos un mes para ver el resumen o generar el PDF.</p>
        </div>
      )}
    </>
  )
}

// ── Componente resumen de un mes (también usado para el PDF) ──────────────────
function ResumenMes({ meta, data, calc }) {
  const pctGasto = calc.ingresosBrutos > 0
    ? Math.round((calc.gastosTotales / calc.ingresosBrutos) * 100)
    : 0

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{
        borderBottom: '2px solid var(--accent)',
        marginBottom: 16,
        paddingBottom: 10,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
      }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent3)' }}>
            {monthName(meta.month)} {meta.year}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
            Resumen financiero
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>Ahorro</div>
          <div style={{
            fontSize: 18, fontWeight: 700,
            color: calc.ahorro >= 0 ? 'var(--green)' : 'var(--red)',
          }}>
            {fmtARS(calc.ahorro)}
          </div>
        </div>
      </div>

      {/* Ingresos */}
      <Seccion titulo="Ingresos" color="var(--green)">
        {data.ingresos.map(i => (
          <FilaItem key={i.id} label={i.concepto} valor={i.monto} />
        ))}
        <FilaTotal label="Brutos" valor={calc.ingresosBrutos} />
        <FilaItem label={`Apartado (${Math.round((data.apartado||0)*100)}%)`} valor={-calc.montoApartado} negativo />
        <FilaItem label="Libre base" valor={-(data.libreBase||0)} negativo />
        <FilaTotal label="Netos disponibles" valor={calc.ingresosNetos} />
      </Seccion>

      {/* Gastos fijos */}
      <Seccion titulo="Gastos fijos" color="var(--red)">
        {data.gastosFijos.filter(g => g.monto > 0).map(g => (
          <FilaItem key={g.id} label={g.concepto} valor={g.monto} />
        ))}
        <FilaTotal label="Subtotal fijos" valor={calc.sumaGastosFijos} />
      </Seccion>

      {/* Tarjetas */}
      <Seccion titulo="Tarjetas" color="var(--yellow)">
        {calc.tarjetasDetalle.map(t => (
          <div key={t.id}>
            <FilaItem label={t.nombre} valor={t.total} bold />
            {t.items?.filter(i => i.monto > 0).map(i => (
              <FilaItem
                key={i.id}
                label={`  ${i.concepto}${i.cuota ? ` (${i.cuota})` : ''}`}
                valor={i.monto}
                muted
              />
            ))}
          </div>
        ))}
        <FilaTotal label="Subtotal tarjetas" valor={calc.sumaTarjetas} />
      </Seccion>

      {/* Otros gastos */}
      {data.otrosGastos?.length > 0 && (
        <Seccion titulo="Otros gastos" color="#e879f9">
          {data.otrosGastos.map(g => (
            <FilaItem key={g.id} label={g.concepto} valor={g.monto} />
          ))}
          <FilaTotal label="Subtotal otros" valor={calc.sumaOtros} />
        </Seccion>
      )}

      {/* Reintegros */}
      {calc.totalReintegros > 0 && (
        <Seccion titulo="Reintegros / me deben" color="var(--green)">
          {data.reintegros?.map(r => (
            <FilaItem key={r.id} label={r.concepto} valor={r.monto} />
          ))}
          <FilaTotal label="Total reintegros" valor={calc.totalReintegros} positivo />
        </Seccion>
      )}

      {/* Balance final */}
      <div style={{
        background: 'var(--bg3)',
        borderRadius: 8,
        padding: '14px 16px',
        marginTop: 8,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 12,
        textAlign: 'center',
      }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 3 }}>GASTOS TOTALES</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--red)' }}>{fmtARS(calc.gastosTotales)}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{pctGasto}% del ingreso</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 3 }}>LIBRE DISPONIBLE</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent3)' }}>{fmtARS(calc.libreDisponible)}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>de {fmtARS(data.libreBase||0)} base</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 3 }}>AHORRO</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: calc.ahorro >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {fmtARS(calc.ahorro)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>
            {calc.ahorro >= 0 ? 'superávit' : 'déficit'}
          </div>
        </div>
      </div>
    </div>
  )
}

function Seccion({ titulo, color, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color,
        textTransform: 'uppercase', letterSpacing: '.07em',
        marginBottom: 6, paddingBottom: 4,
        borderBottom: `1px solid ${color}33`,
      }}>
        {titulo}
      </div>
      {children}
    </div>
  )
}

function FilaItem({ label, valor, negativo, positivo, bold, muted }) {
  const color = negativo ? 'var(--red)' : positivo ? 'var(--green)' : muted ? 'var(--text3)' : 'var(--text2)'
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      fontSize: muted ? 12 : 13, padding: '2px 0',
      color: muted ? 'var(--text3)' : undefined,
    }}>
      <span style={{ fontWeight: bold ? 600 : 400 }}>{label}</span>
      <span style={{ fontWeight: bold ? 600 : 400, color }}>
        {negativo ? '–' : positivo ? '+' : ''}{fmtARS(Math.abs(valor))}
      </span>
    </div>
  )
}

function FilaTotal({ label, valor, positivo }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      fontSize: 13, padding: '5px 0 3px',
      borderTop: '1px solid var(--border)',
      fontWeight: 700,
    }}>
      <span>{label}</span>
      <span style={{ color: positivo ? 'var(--green)' : 'var(--accent3)' }}>{fmtARS(valor)}</span>
    </div>
  )
}

// ── Generación PDF con la API nativa del navegador ────────────────────────────
async function generarYDescargarPDF(datosSeleccionados) {
  // Construimos HTML completo del PDF
  const html = buildPDFHTML(datosSeleccionados)

  // Abrimos una ventana oculta, metemos el HTML, y mandamos a imprimir
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) throw new Error('El navegador bloqueó la ventana emergente. Permitila para poder descargar el PDF.')

  win.document.write(html)
  win.document.close()

  // Esperamos que cargue y luego print
  await new Promise(resolve => {
    win.onload = resolve
    setTimeout(resolve, 800)
  })

  win.print()
  // Cerramos después de print
  setTimeout(() => win.close(), 1000)
}

function buildPDFHTML(datos) {
  const titulo = datos.length === 1
    ? `Resumen · ${monthName(datos[0].meta.month)} ${datos[0].meta.year}`
    : `Resumen financiero · ${monthName(datos[0].meta.month)} ${datos[0].meta.year} — ${monthName(datos[datos.length-1].meta.month)} ${datos[datos.length-1].meta.year}`

  const estilos = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, 'Segoe UI', sans-serif; font-size: 13px; color: #1a1a2e; background: #fff; padding: 32px; }
    h1 { font-size: 22px; font-weight: 800; color: #4f46e5; margin-bottom: 4px; }
    .subtitle { font-size: 12px; color: #666; margin-bottom: 28px; }
    .mes { page-break-inside: avoid; margin-bottom: 36px; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; }
    .mes-header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #fff; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; }
    .mes-nombre { font-size: 19px; font-weight: 800; }
    .mes-ahorro-label { font-size: 11px; opacity: .8; }
    .mes-ahorro-val { font-size: 18px; font-weight: 700; }
    .mes-body { padding: 18px 20px; }
    .seccion { margin-bottom: 14px; }
    .seccion-titulo { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; padding-bottom: 4px; margin-bottom: 6px; border-bottom: 1px solid #e5e7eb; }
    .seccion-titulo.ingresos { color: #16a34a; border-color: #bbf7d0; }
    .seccion-titulo.fijos { color: #dc2626; border-color: #fecaca; }
    .seccion-titulo.tarjetas { color: #d97706; border-color: #fde68a; }
    .seccion-titulo.otros { color: #9333ea; border-color: #e9d5ff; }
    .seccion-titulo.reintegros { color: #16a34a; border-color: #bbf7d0; }
    .fila { display: flex; justify-content: space-between; padding: 2px 0; }
    .fila.total { border-top: 1px solid #e5e7eb; padding-top: 5px; margin-top: 3px; font-weight: 700; }
    .fila.muted { color: #9ca3af; font-size: 12px; }
    .val-neg { color: #dc2626; }
    .val-pos { color: #16a34a; }
    .val-acc { color: #4f46e5; }
    .balance { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; background: #f8f7ff; border-radius: 8px; padding: 14px 16px; margin-top: 10px; }
    .balance-item { text-align: center; }
    .balance-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #9ca3af; margin-bottom: 3px; }
    .balance-val { font-size: 15px; font-weight: 800; }
    .barra { height: 14px; border-radius: 4px; overflow: hidden; display: flex; gap: 1px; margin: 10px 0 6px; }
    .barra-seg { height: 100%; }
    .leyenda { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 11px; color: #666; margin-bottom: 4px; }
    .leyenda-dot { width: 9px; height: 9px; border-radius: 2px; display: inline-block; margin-right: 4px; vertical-align: middle; }
    .footer { margin-top: 36px; border-top: 1px solid #e5e7eb; padding-top: 12px; font-size: 11px; color: #9ca3af; display: flex; justify-content: space-between; }
    @media print { body { padding: 16px; } .mes { page-break-inside: avoid; } }
  `

  const mesHTML = (d) => {
    const { meta, data, calc } = d
    const pct = calc.ingresosBrutos > 0 ? Math.round((calc.gastosTotales / calc.ingresosBrutos) * 100) : 0
    const total = calc.sumaGastosFijos + calc.sumaTarjetas + calc.sumaOtros + (data.libreBase||0) + Math.max(0, calc.ahorro) || 1

    const barra = [
      { color: '#ef4444', val: calc.sumaGastosFijos },
      { color: '#f59e0b', val: calc.sumaTarjetas },
      { color: '#e879f9', val: calc.sumaOtros },
      { color: '#6c63ff', val: data.libreBase || 0 },
      { color: '#22c55e', val: Math.max(0, calc.ahorro) },
    ].filter(s => s.val > 0)

    const filaS = (label, valor, cls = '') =>
      `<div class="fila ${cls}"><span>${label}</span><span>${fmtARS(valor)}</span></div>`
    const filaT = (label, valor, cls = '') =>
      `<div class="fila total"><span>${label}</span><span class="${cls}">${fmtARS(valor)}</span></div>`

    return `
      <div class="mes">
        <div class="mes-header">
          <div>
            <div class="mes-nombre">${monthName(meta.month)} ${meta.year}</div>
            <div style="font-size:12px;opacity:.8;margin-top:2px">Resumen financiero</div>
          </div>
          <div style="text-align:right">
            <div class="mes-ahorro-label">AHORRO DEL MES</div>
            <div class="mes-ahorro-val" style="color:${calc.ahorro >= 0 ? '#86efac' : '#fca5a5'}">${fmtARS(calc.ahorro)}</div>
          </div>
        </div>
        <div class="mes-body">
          <!-- Barra distribución -->
          <div class="barra">
            ${barra.map(s => `<div class="barra-seg" style="width:${(s.val/total)*100}%;background:${s.color}"></div>`).join('')}
          </div>
          <div class="leyenda">
            <span><span class="leyenda-dot" style="background:#ef4444"></span>Fijos: ${fmtARS(calc.sumaGastosFijos)}</span>
            <span><span class="leyenda-dot" style="background:#f59e0b"></span>Tarjetas: ${fmtARS(calc.sumaTarjetas)}</span>
            <span><span class="leyenda-dot" style="background:#e879f9"></span>Otros: ${fmtARS(calc.sumaOtros)}</span>
            <span><span class="leyenda-dot" style="background:#6c63ff"></span>Libre: ${fmtARS(data.libreBase||0)}</span>
            <span><span class="leyenda-dot" style="background:#22c55e"></span>Ahorro: ${fmtARS(Math.max(0,calc.ahorro))}</span>
          </div>

          <!-- Ingresos -->
          <div class="seccion">
            <div class="seccion-titulo ingresos">Ingresos</div>
            ${data.ingresos.map(i => filaS(i.concepto, i.monto)).join('')}
            ${filaT('Ingresos brutos', calc.ingresosBrutos, 'val-acc')}
            ${filaS(`Apartado ${Math.round((data.apartado||0)*100)}%`, -calc.montoApartado, 'val-neg')}
            ${filaS('Libre base', -(data.libreBase||0), 'val-neg')}
            ${filaT('Ingresos netos', calc.ingresosNetos, 'val-acc')}
          </div>

          <!-- Fijos -->
          <div class="seccion">
            <div class="seccion-titulo fijos">Gastos fijos</div>
            ${data.gastosFijos.filter(g => g.monto > 0).map(g => filaS(g.concepto, g.monto)).join('')}
            ${filaT('Subtotal fijos', calc.sumaGastosFijos, 'val-neg')}
          </div>

          <!-- Tarjetas -->
          <div class="seccion">
            <div class="seccion-titulo tarjetas">Tarjetas</div>
            ${calc.tarjetasDetalle.map(t => `
              <div class="fila" style="font-weight:600">${t.nombre}<span>${fmtARS(t.total)}</span></div>
              ${(t.items||[]).filter(i => i.monto > 0).map(i =>
                `<div class="fila muted" style="padding-left:12px"><span>${i.concepto}${i.cuota ? ` (${i.cuota})` : ''}</span><span>${fmtARS(i.monto)}</span></div>`
              ).join('')}
            `).join('')}
            ${filaT('Subtotal tarjetas', calc.sumaTarjetas, 'val-neg')}
          </div>

          ${data.otrosGastos?.length > 0 ? `
          <div class="seccion">
            <div class="seccion-titulo otros">Otros gastos</div>
            ${data.otrosGastos.map(g => filaS(g.concepto, g.monto)).join('')}
            ${filaT('Subtotal otros', calc.sumaOtros, 'val-neg')}
          </div>` : ''}

          ${calc.totalReintegros > 0 ? `
          <div class="seccion">
            <div class="seccion-titulo reintegros">Reintegros</div>
            ${(data.reintegros||[]).map(r => filaS(r.concepto, r.monto, 'val-pos')).join('')}
            ${filaT('Total reintegros', calc.totalReintegros, 'val-pos')}
          </div>` : ''}

          <!-- Balance -->
          <div class="balance">
            <div class="balance-item">
              <div class="balance-label">Gastos totales</div>
              <div class="balance-val" style="color:#dc2626">${fmtARS(calc.gastosTotales)}</div>
              <div style="font-size:10px;color:#9ca3af">${pct}% del ingreso</div>
            </div>
            <div class="balance-item">
              <div class="balance-label">Libre disponible</div>
              <div class="balance-val" style="color:#4f46e5">${fmtARS(calc.libreDisponible)}</div>
              <div style="font-size:10px;color:#9ca3af">de ${fmtARS(data.libreBase||0)} base</div>
            </div>
            <div class="balance-item">
              <div class="balance-label">Ahorro</div>
              <div class="balance-val" style="color:${calc.ahorro >= 0 ? '#16a34a' : '#dc2626'}">${fmtARS(calc.ahorro)}</div>
              <div style="font-size:10px;color:#9ca3af">${calc.ahorro >= 0 ? 'superávit' : 'déficit'}</div>
            </div>
          </div>
        </div>
      </div>
    `
  }

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${titulo}</title>
  <style>${estilos}</style>
</head>
<body>
  <h1>Mis Cuentas</h1>
  <div class="subtitle">${titulo} · Generado el ${new Date().toLocaleDateString('es-AR', { day:'numeric', month:'long', year:'numeric' })}</div>
  ${datos.map(mesHTML).join('')}
  <div class="footer">
    <span>Mis Cuentas — finanzas personales</span>
    <span>Generado el ${new Date().toLocaleDateString('es-AR')}</span>
  </div>
</body>
</html>`
}
