import React, { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import { parseSheet, generarSiguiente, calcular, guardar, cargar, $, nombreMes } from './data'

// ── Constantes ───────────────────────────────────────────────────────────────
const TARJETAS_DEFAULT = ['Tarjeta NX', 'BNA VISA', 'BNA Master']

export default function App() {
  const [meses, setMeses]         = useState([])
  const [mesActivo, setMesActivo] = useState(null)
  const [vista, setVista]         = useState('mes')       // 'mes' | 'estadisticas'
  const [modal, setModal]         = useState(null)         // null | 'compra'
  const [dolar, setDolar]         = useState(1550)
  const fileRef = useRef()

  useEffect(() => {
    const guardados = cargar()
    if (guardados.length) {
      setMeses(guardados)
      setMesActivo(guardados[guardados.length - 1].id)
    }
  }, [])

  function save(nuevosMeses) {
    setMeses(nuevosMeses)
    guardar(nuevosMeses)
  }

  // ── Importar .xlsx ───────────────────────────────────────────────────────
  function importarArchivo(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const wb   = XLSX.read(ev.target.result, { type: 'array' })
      const ws   = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
      const mes  = parseSheet(rows)
      mes.id     = `mes_${Date.now()}`
      mes.comprasNuevas = []
      const nuevos = [...meses, mes].sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
      save(nuevos)
      setMesActivo(mes.id)
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  // ── Generar siguiente mes ────────────────────────────────────────────────
  function generarSig() {
    const mes = meses.find(m => m.id === mesActivo)
    if (!mes) return
    const nuevo = generarSiguiente(mes)
    nuevo.id = `mes_${Date.now()}`
    nuevo.comprasNuevas = []
    const nuevos = [...meses, nuevo].sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
    save(nuevos)
    setMesActivo(nuevo.id)
  }

  // ── Eliminar mes ─────────────────────────────────────────────────────────
  function eliminarMes(id) {
    if (!confirm('¿Eliminar este mes?')) return
    const nuevos = meses.filter(m => m.id !== id)
    save(nuevos)
    setMesActivo(nuevos.length ? nuevos[nuevos.length - 1].id : null)
  }

  // ── Agregar compra con tarjeta ───────────────────────────────────────────
  function agregarCompra(compra) {
    const nuevos = meses.map(m => {
      if (m.id !== mesActivo) return m
      return { ...m, comprasNuevas: [...(m.comprasNuevas || []), compra] }
    })
    save(nuevos)
    setModal(null)
  }

  // ── Render ───────────────────────────────────────────────────────────────
  const mes    = meses.find(m => m.id === mesActivo)
  const calc   = mes ? calcular(mes, dolar) : null

  return (
    <div style={s.app}>
      {/* ── Header ── */}
      <div style={s.header}>
        <strong style={{ fontSize: 16 }}>Mis Cuentas</strong>
        <div style={s.headerRight}>
          <label style={s.btnSecondary}>
            Importar .xlsx
            <input ref={fileRef} type="file" accept=".xlsx" onChange={importarArchivo} style={{ display:'none' }}/>
          </label>
          <button style={vista==='mes' ? s.btnActive : s.btnSecondary} onClick={() => setVista('mes')}>Mes</button>
          <button style={vista==='estadisticas' ? s.btnActive : s.btnSecondary} onClick={() => setVista('estadisticas')}>Estadísticas</button>
        </div>
      </div>

      <div style={s.body}>
        {/* ── Sidebar: lista de meses ── */}
        <div style={s.sidebar}>
          <div style={s.sidebarTitle}>Meses</div>
          {meses.map(m => (
            <div key={m.id}
              style={{ ...s.sidebarItem, ...(m.id === mesActivo ? s.sidebarItemActive : {}) }}
              onClick={() => { setMesActivo(m.id); setVista('mes') }}>
              {nombreMes(m.fecha)}
            </div>
          ))}
          {mes && (
            <button style={{ ...s.btnSecondary, marginTop: 12, width: '100%' }} onClick={generarSig}>
              + Siguiente mes
            </button>
          )}
        </div>

        {/* ── Contenido principal ── */}
        <div style={s.main}>
          {vista === 'mes' && mes && calc && (
            <VistaMes
              mes={mes}
              calc={calc}
              dolar={dolar}
              setDolar={setDolar}
              onAgregarCompra={() => setModal('compra')}
              onEliminar={() => eliminarMes(mes.id)}
              onUpdateMes={updated => {
                const nuevos = meses.map(m => m.id === updated.id ? updated : m)
                save(nuevos)
              }}
            />
          )}
          {vista === 'estadisticas' && (
            <Estadisticas meses={meses} dolar={dolar} />
          )}
          {vista === 'mes' && !mes && (
            <div style={s.empty}>
              <p>Importá un archivo .xlsx para empezar.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal: nueva compra ── */}
      {modal === 'compra' && mes && (
        <ModalCompra
          tarjetas={mes.tarjetas.map(t => t.nombre)}
          onConfirmar={agregarCompra}
          onCancelar={() => setModal(null)}
        />
      )}
    </div>
  )
}

// ── Vista de un mes ──────────────────────────────────────────────────────────
function VistaMes({ mes, calc, dolar, setDolar, onAgregarCompra, onEliminar, onUpdateMes }) {
  return (
    <div>
      {/* Título y acciones */}
      <div style={s.mesHeader}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>{nombreMes(mes.fecha)}</h2>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <label style={{ fontSize: 12, color: '#888' }}>
            USD oficial:
            <input type="number" value={dolar}
              onChange={e => setDolar(parseFloat(e.target.value)||0)}
              style={{ ...s.inputSmall, width: 80, marginLeft: 6 }}/>
          </label>
          <button style={s.btnPrimary} onClick={onAgregarCompra}>+ Compra con tarjeta</button>
          <button style={s.btnDanger} onClick={onEliminar}>Eliminar</button>
        </div>
      </div>

      {/* ── Balance ── */}
      <Seccion titulo="Balance">
        <Tabla filas={[
          ['Ingresos brutos',   $(calc.ingresosBrutos),  'verde'],
          ['Apartado ('+Math.round((mes.apartado||0)*100)+'%)', '-'+$(calc.ingresosBrutos*(mes.apartado||0)), 'gris'],
          ['Ingresos netos',    $(calc.ingresosNetos),   'bold'],
          ['─', '', ''],
          ['Gastos fijos',      '-'+$(calc.gastosFijosTotal), ''],
          ['Tarjetas',          '-'+$(calc.tarjetasTotal),    ''],
          ['Otros gastos',      '-'+$(calc.otrosTotal),       ''],
          ['Compras nuevas',    '-'+$(calc.comprasTotal),     ''],
          ['─', '', ''],
          ['Presupuesto',       $(calc.presupuesto), calc.presupuesto >= 0 ? 'verde' : 'rojo'],
          ['─', '', ''],
          ['Libre base',        $(mes.libre||0), ''],
          ['Descontado (compras nuevas)', '-'+$(calc.comprasTotal), ''],
          ['Libre disponible',  $(calc.libreReal), calc.libreReal >= 0 ? 'verde' : 'rojo'],
        ]}/>
      </Seccion>

      {/* ── Ingresos ── */}
      <Seccion titulo="Ingresos">
        <Tabla filas={[
          ...mes.ingresos.map(i => [i.concepto, $(i.monto), '']),
          ['TOTAL', $(calc.ingresosBrutos), 'bold'],
        ]}/>
      </Seccion>

      {/* ── Gastos fijos ── */}
      <Seccion titulo="Gastos fijos">
        <Tabla filas={[
          ...mes.gastosFijos.map(g => [
            g.concepto,
            g.usd ? `USD ${g.monto} → ${$(g.monto * dolar)}` : $(g.monto),
            '',
          ]),
          ['TOTAL', $(calc.gastosFijosTotal), 'bold'],
        ]}/>
      </Seccion>

      {/* ── Tarjetas ── */}
      {mes.tarjetas.map(t => (
        <Seccion key={t.nombre} titulo={t.nombre}>
          <Tabla filas={[
            ['Mantenimiento', $(t.mantenimiento), 'gris'],
            ...t.items.map(i => [
              i.concepto,
              $(i.monto),
              i.cuota + (i.restantes > 0 ? ` (quedan ${i.restantes})` : ' ✓'),
            ]),
            ['TOTAL', $(t.mantenimiento + t.items.reduce((a,i)=>a+i.monto,0)), 'bold'],
          ]}/>
        </Seccion>
      ))}

      {/* ── Otros gastos ── */}
      {(mes.otrosGastos||[]).length > 0 && (
        <Seccion titulo="Otros gastos">
          <Tabla filas={[
            ...(mes.otrosGastos||[]).map(g => [
              g.concepto,
              $(g.monto),
              g.cuota ? g.cuota + (g.restantes > 0 ? ` (quedan ${g.restantes})` : ' ✓') : '',
            ]),
            ['TOTAL', $(calc.otrosTotal), 'bold'],
          ]}/>
        </Seccion>
      )}

      {/* ── Compras nuevas cargadas en la app ── */}
      {(mes.comprasNuevas||[]).length > 0 && (
        <Seccion titulo="Compras con tarjeta (cargadas en la app)">
          <Tabla filas={[
            ...(mes.comprasNuevas||[]).map((c, i) => [
              `${c.concepto} (${c.tarjeta})`,
              `${c.cuotaNum}/${c.totalCuotas} → ${$(c.montoCuota)}`,
              <button key={i} style={s.btnXs} onClick={() => {
                const nuevasList = mes.comprasNuevas.filter((_, j) => j !== i)
                onUpdateMes({ ...mes, comprasNuevas: nuevasList })
              }}>✕</button>
            ]),
            ['Descuento del libre', '-'+$(calc.comprasTotal), 'rojo'],
          ]}/>
        </Seccion>
      )}

      {/* ── Proyección ── */}
      <ProyeccionMeses mes={mes} calc={calc} dolar={dolar} />
    </div>
  )
}

// ── Proyección de próximos meses ─────────────────────────────────────────────
function ProyeccionMeses({ mes, dolar }) {
  // Calcular cómo decaen los gastos de tarjeta a medida que vencen cuotas
  const allItems = mes.tarjetas.flatMap(t => t.items)
  const gastosFijosBase = mes.gastosFijos.reduce((a, g) =>
    a + (g.usd && dolar > 0 ? g.monto * dolar : g.monto), 0)
  const mantBase = mes.tarjetas.reduce((a, t) => a + t.mantenimiento, 0)
  const otrosBase = (mes.otrosGastos||[]).reduce((a, g) => a + (g.restantes > 0 ? g.monto : 0), 0)

  const proyeccion = Array.from({ length: 7 }, (_, idx) => {
    const cuotasVigentes = allItems.reduce((a, i) => i.restantes > idx ? a + i.monto : a, 0)
    const otrosVigentes = (mes.otrosGastos||[]).reduce((a, g) => g.restantes > idx ? a + g.monto : a, 0)
    const totalGastos = gastosFijosBase + mantBase + cuotasVigentes + otrosVigentes
    const ingresosBrutos = mes.ingresos.reduce((a,i)=>a+i.monto,0)
    const netos = ingresosBrutos * (1 - (mes.apartado||0))
    const presupuesto = netos - totalGastos

    const fecha = new Date(mes.fecha)
    fecha.setMonth(fecha.getMonth() + idx)

    return { mes: fecha.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }), totalGastos, presupuesto, libre: mes.libre||0 }
  })

  return (
    <Seccion titulo="Proyección próximos meses">
      <div style={{ overflowX: 'auto' }}>
        <table style={s.tabla}>
          <thead>
            <tr style={s.trHead}>
              <th style={s.th}></th>
              {proyeccion.map((p, i) => <th key={i} style={{ ...s.th, color: i===0 ? '#fff' : '#888' }}>{p.mes}</th>)}
            </tr>
          </thead>
          <tbody>
            {[
              { label: 'Gastos', key: 'totalGastos', fmt: $ },
              { label: 'Presupuesto', key: 'presupuesto', fmt: $, color: true },
              { label: 'Libre', key: 'libre', fmt: $ },
            ].map(row => (
              <tr key={row.label} style={s.trBody}>
                <td style={s.tdLabel}>{row.label}</td>
                {proyeccion.map((p, i) => (
                  <td key={i} style={{ ...s.tdVal, color: row.color ? (p[row.key]>=0?'#4caf50':'#e55') : '#ccc' }}>
                    {row.fmt(p[row.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Seccion>
  )
}

// ── Estadísticas ─────────────────────────────────────────────────────────────
function Estadisticas({ meses, dolar }) {
  if (meses.length < 2) return <div style={s.empty}>Necesitás al menos 2 meses para ver estadísticas.</div>

  const datos = meses.map(m => ({ nombre: nombreMes(m.fecha), ...calcular(m, dolar) }))

  const avg = key => datos.reduce((a, d) => a + d[key], 0) / datos.length

  return (
    <div>
      <Seccion titulo="Promedios">
        <Tabla filas={[
          ['Ingresos brutos',  $(avg('ingresosBrutos'))],
          ['Gastos totales',   $(avg('gastosTotal'))],
          ['Presupuesto',      $(avg('presupuesto'))],
          ['Libre base',       $(meses.reduce((a,m)=>a+(m.libre||0),0)/meses.length)],
        ]}/>
      </Seccion>

      <Seccion titulo="Mes a mes">
        <div style={{ overflowX: 'auto' }}>
          <table style={s.tabla}>
            <thead>
              <tr style={s.trHead}>
                {['Mes','Ingresos','Gastos','Presupuesto','Libre'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {datos.map((d, i) => (
                <tr key={i} style={s.trBody}>
                  <td style={s.tdLabel}>{d.nombre}</td>
                  <td style={{ ...s.tdVal, color:'#4caf50' }}>{$(d.ingresosBrutos)}</td>
                  <td style={{ ...s.tdVal, color:'#e55' }}>{$(d.gastosTotal)}</td>
                  <td style={{ ...s.tdVal, color: d.presupuesto>=0?'#4caf50':'#e55' }}>{$(d.presupuesto)}</td>
                  <td style={{ ...s.tdVal, color: d.libreReal>=0?'#aaa':'#e55' }}>{$(d.libreReal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Seccion>
    </div>
  )
}

// ── Modal: nueva compra con tarjeta ──────────────────────────────────────────
function ModalCompra({ tarjetas, onConfirmar, onCancelar }) {
  const [paso, setPaso]   = useState(1)
  const [datos, setDatos] = useState({ concepto:'', tarjeta: tarjetas[0]||'', total:0, cuotas:1, desde:1 })

  const montoCuota = datos.cuotas > 0 ? datos.total / datos.cuotas : 0

  function confirmar() {
    onConfirmar({
      concepto:    datos.concepto,
      tarjeta:     datos.tarjeta,
      montoCuota:  montoCuota,
      totalCuotas: datos.cuotas,
      cuotaNum:    datos.desde,
    })
  }

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={{ fontWeight:700, fontSize:16, marginBottom:16 }}>Nueva compra con tarjeta</div>

        {paso === 1 && (
          <>
            <Label>¿Qué compraste?</Label>
            <input style={s.input} value={datos.concepto} autoFocus
              onChange={e => setDatos({...datos, concepto: e.target.value})}
              onKeyDown={e => e.key==='Enter' && datos.concepto && setPaso(2)}
              placeholder="Ej: Zapatillas"/>
            <ModalBtns onNext={() => datos.concepto && setPaso(2)} onCancel={onCancelar} nextLabel="Siguiente"/>
          </>
        )}

        {paso === 2 && (
          <>
            <Label>¿Con qué tarjeta?</Label>
            {tarjetas.map(t => (
              <button key={t}
                style={{ ...s.btnSecondary, display:'block', width:'100%', marginBottom:6, textAlign:'left',
                  background: datos.tarjeta===t ? '#2a2a50' : '' }}
                onClick={() => setDatos({...datos, tarjeta: t})}>
                {t}
              </button>
            ))}
            <ModalBtns onBack={() => setPaso(1)} onNext={() => setPaso(3)} onCancel={onCancelar} nextLabel="Siguiente"/>
          </>
        )}

        {paso === 3 && (
          <>
            <Label>Monto total de la compra</Label>
            <input style={s.input} type="number" value={datos.total||''}
              onChange={e => setDatos({...datos, total: parseFloat(e.target.value)||0})}
              placeholder="Ej: 120000"/>
            <Label style={{marginTop:12}}>Cantidad de cuotas</Label>
            <input style={s.input} type="number" value={datos.cuotas}
              onChange={e => setDatos({...datos, cuotas: parseInt(e.target.value)||1})}
              min="1"/>
            <Label style={{marginTop:12}}>¿Desde qué cuota empieza a pagar en este mes?</Label>
            <input style={s.input} type="number" value={datos.desde}
              onChange={e => setDatos({...datos, desde: parseInt(e.target.value)||1})}
              min="1" max={datos.cuotas}/>
            {datos.total > 0 && (
              <div style={{ marginTop:10, fontSize:13, color:'#aaa' }}>
                Cuota {datos.desde}/{datos.cuotas}: <strong style={{color:'#fff'}}>{$(montoCuota)}</strong>
                {' '}· Quedan {datos.cuotas - datos.desde} después de esta
              </div>
            )}
            <ModalBtns onBack={() => setPaso(2)} onNext={confirmar} onCancel={onCancelar} nextLabel="Agregar"/>
          </>
        )}
      </div>
    </div>
  )
}

// ── Componentes pequeños ─────────────────────────────────────────────────────
function Seccion({ titulo, children }) {
  return (
    <div style={s.seccion}>
      <div style={s.seccionTitulo}>{titulo}</div>
      {children}
    </div>
  )
}

function Tabla({ filas }) {
  return (
    <table style={s.tabla}>
      <tbody>
        {filas.map((fila, i) => {
          if (fila[0] === '─') return <tr key={i}><td colSpan={3} style={{padding:'2px 0',borderBottom:'1px solid #222'}}></td></tr>
          const color = fila[2] === 'verde' ? '#4caf50' : fila[2] === 'rojo' ? '#e55' : fila[2] === 'gris' ? '#888' : '#ccc'
          const fw    = fila[2] === 'bold' ? 700 : 400
          return (
            <tr key={i} style={s.trBody}>
              <td style={{ ...s.tdLabel, fontWeight: fw, color: fw===700 ? '#fff' : '#ccc' }}>{fila[0]}</td>
              <td style={{ ...s.tdVal, color, fontWeight: fw }}>{fila[1]}</td>
              <td style={{ ...s.tdExtra }}>{fila[2] !== 'verde' && fila[2] !== 'rojo' && fila[2] !== 'gris' && fila[2] !== 'bold' && fila[2] !== '' ? fila[2] : ''}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function Label({ children, style }) {
  return <div style={{ fontSize:13, color:'#aaa', marginBottom:6, ...style }}>{children}</div>
}

function ModalBtns({ onBack, onNext, onCancel, nextLabel }) {
  return (
    <div style={{ display:'flex', gap:8, marginTop:16, justifyContent:'flex-end' }}>
      <button style={s.btnSecondary} onClick={onCancel}>Cancelar</button>
      {onBack && <button style={s.btnSecondary} onClick={onBack}>← Atrás</button>}
      <button style={s.btnPrimary} onClick={onNext}>{nextLabel} →</button>
    </div>
  )
}

// ── Estilos ──────────────────────────────────────────────────────────────────
const s = {
  app:        { minHeight:'100vh', background:'#0e0e14', color:'#ddd', fontFamily:'system-ui,sans-serif', fontSize:14 },
  header:     { background:'#14141e', borderBottom:'1px solid #222', padding:'10px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' },
  headerRight:{ display:'flex', gap:8, alignItems:'center' },
  body:       { display:'flex', minHeight:'calc(100vh - 45px)' },
  sidebar:    { width:180, background:'#12121a', borderRight:'1px solid #222', padding:12, flexShrink:0 },
  sidebarTitle: { fontSize:11, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:8 },
  sidebarItem:  { padding:'6px 8px', borderRadius:4, cursor:'pointer', fontSize:13, color:'#aaa', marginBottom:2 },
  sidebarItemActive: { background:'#1e1e35', color:'#fff' },
  main:       { flex:1, padding:'16px 20px', maxWidth:900 },
  mesHeader:  { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:8 },
  seccion:    { marginBottom:20 },
  seccionTitulo: { fontSize:11, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'.07em', borderBottom:'1px solid #222', paddingBottom:4, marginBottom:6 },
  tabla:      { width:'100%', borderCollapse:'collapse' },
  trHead:     { borderBottom:'1px solid #222' },
  trBody:     { borderBottom:'1px solid #1a1a22' },
  th:         { padding:'4px 8px', textAlign:'left', fontSize:11, fontWeight:600, color:'#666', textTransform:'uppercase' },
  tdLabel:    { padding:'4px 8px', fontSize:14, color:'#ccc', width:'50%' },
  tdVal:      { padding:'4px 8px', fontSize:14, textAlign:'right', fontVariantNumeric:'tabular-nums' },
  tdExtra:    { padding:'4px 8px', fontSize:12, color:'#666', textAlign:'right' },
  btnPrimary: { padding:'5px 12px', background:'#3a3aaa', color:'#fff', border:'none', borderRadius:4, cursor:'pointer', fontSize:13, fontWeight:600 },
  btnSecondary: { padding:'5px 12px', background:'#1e1e28', color:'#aaa', border:'1px solid #333', borderRadius:4, cursor:'pointer', fontSize:13 },
  btnActive:  { padding:'5px 12px', background:'#2a2a45', color:'#fff', border:'1px solid #4444aa', borderRadius:4, cursor:'pointer', fontSize:13 },
  btnDanger:  { padding:'5px 12px', background:'transparent', color:'#884', border:'1px solid #443', borderRadius:4, cursor:'pointer', fontSize:13 },
  btnXs:      { padding:'1px 5px', background:'transparent', color:'#666', border:'1px solid #333', borderRadius:3, cursor:'pointer', fontSize:11 },
  input:      { display:'block', width:'100%', padding:'7px 10px', background:'#1a1a26', border:'1px solid #333', borderRadius:4, color:'#fff', fontSize:14, marginBottom:4 },
  inputSmall: { padding:'3px 6px', background:'#1a1a26', border:'1px solid #333', borderRadius:3, color:'#fff', fontSize:12 },
  overlay:    { position:'fixed', inset:0, background:'rgba(0,0,0,.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 },
  modal:      { background:'#16161f', border:'1px solid #2a2a3a', borderRadius:8, padding:24, width:400, maxWidth:'90vw' },
  empty:      { padding:40, color:'#555', textAlign:'center' },
}
