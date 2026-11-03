// ── Parsear planilla ─────────────────────────────────────────────────────────
// Convierte los datos crudos de tu .xlsx al formato interno de la app.
export function parseSheet(rows) {
  // rows es un array de arrays (SheetJS aoa_to_sheet)
  const get = (r, c) => rows[r]?.[c] ?? null

  const month = {
    fecha: get(0, 0),

    // Ingresos (filas 2-4, col A=concepto B=monto)
    ingresos: [],

    // Config
    apartado: get(6, 1) || 0,   // B7
    libre: get(7, 1) || 0,       // B8

    // Gastos fijos (col C=monto, D=concepto)
    gastosFijos: [],

    // Tarjetas
    tarjetas: [],

    // Otros gastos (abajo de las tarjetas, col B=monto C=concepto)
    otrosGastos: [],
  }

  // Ingresos: filas 1-3 (0-indexed) col A y B
  for (let r = 1; r <= 3; r++) {
    const concepto = get(r, 0)
    const monto    = get(r, 1)
    if (concepto && monto && concepto !== 'INGRESOS BRUTOS') {
      month.ingresos.push({ concepto: String(concepto), monto: parseFloat(monto) || 0 })
    }
  }

  // Gastos fijos: filas 1-15, col D=concepto C=monto E=USD
  const gastosFijosNames = ['Alquiler','Expensas','ABSA','Luz','Gas','Internet','Celular',
    'YouTube','HBO','Spotify','Suscripción YT','Netflix','Google One','GELP']
  for (let r = 1; r <= 16; r++) {
    const concepto = get(r, 3)
    const monto    = get(r, 2)
    const usdVal   = get(r, 4)
    if (concepto && monto && gastosFijosNames.includes(String(concepto))) {
      const esUSD = usdVal && !isNaN(parseFloat(usdVal)) && parseFloat(usdVal) < 100
      month.gastosFijos.push({
        concepto: String(concepto),
        monto: esUSD ? parseFloat(usdVal) : parseFloat(monto) || 0,
        usd: !!esUSD,
      })
    }
  }

  // Tarjetas: buscar filas con "Tarjeta NX", "BNA VISA", "BNA Master"
  const tarjetaNames = ['Tarjeta NX', 'BNA VISA', 'BNA Master']
  let currentTarjeta = null

  for (let r = 0; r < rows.length; r++) {
    const a = get(r, 0)
    const c = get(r, 2)
    const d = get(r, 3)
    const e = get(r, 4)  // cuota "2/6"
    const f = get(r, 5)  // cuotas restantes

    if (a && tarjetaNames.includes(String(a))) {
      currentTarjeta = { nombre: String(a), mantenimiento: 0, items: [] }
      month.tarjetas.push(currentTarjeta)
      continue
    }

    if (currentTarjeta && c && d) {
      const monto = parseFloat(c) || 0
      if (monto === 0) continue
      if (String(d) === 'MANTENIMIENTO') {
        currentTarjeta.mantenimiento = monto
        continue
      }
      // Item con cuotas
      const cuota     = e ? String(e) : ''
      const restantes = f !== null && f !== undefined && f !== '' ? parseInt(f) : calcRestantes(cuota)
      currentTarjeta.items.push({ concepto: String(d), monto, cuota, restantes })
    }

    // Fin de tarjetas al llegar a SUMA TARJETAS
    if (a && String(a).includes('SUMA TARJETAS')) currentTarjeta = null
  }

  // Otros gastos (están debajo, col B=monto C=concepto D=cuota E=restantes)
  let enOtros = false
  for (let r = 0; r < rows.length; r++) {
    const b = get(r, 1)
    const c = get(r, 2)
    if (b === 'Otros gastos') { enOtros = true; continue }
    if (enOtros && b && c && String(c) !== 'Total') {
      const monto = parseFloat(b) || 0
      if (monto > 0) {
        const cuota     = get(r, 3) ? String(get(r, 3)) : ''
        const restantes = get(r, 4) !== null ? parseInt(get(r, 4)) : calcRestantes(cuota)
        const noPaga    = get(r, 5) === 'NO PAGA'
        if (!noPaga) month.otrosGastos.push({ concepto: String(c), monto, cuota, restantes })
      }
    }
    if (enOtros && c && String(c) === 'Total') break
  }

  return month
}

function calcRestantes(cuotaStr) {
  if (!cuotaStr) return 0
  const p = cuotaStr.split('/')
  if (p.length !== 2) return 0
  return Math.max(0, parseInt(p[1]) - parseInt(p[0]))
}

// ── Generar mes siguiente ────────────────────────────────────────────────────
export function generarSiguiente(mes) {
  const fecha  = new Date(mes.fecha)
  const sigFecha = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 1)

  return {
    fecha: sigFecha,
    ingresos: mes.ingresos.filter(i => !i.esExtra).map(i => ({ ...i })),
    apartado: mes.apartado,
    libre: mes.libre,
    gastosFijos: mes.gastosFijos.map(g => ({ ...g })),
    tarjetas: mes.tarjetas.map(t => ({
      ...t,
      items: t.items
        .filter(i => i.restantes > 0)
        .map(i => {
          const partes  = (i.cuota || '').split('/')
          const actual  = parseInt(partes[0] || '1')
          const total   = parseInt(partes[1] || '1')
          return {
            ...i,
            cuota: `${actual + 1}/${total}`,
            restantes: i.restantes - 1,
          }
        }),
    })),
    otrosGastos: mes.otrosGastos
      .filter(g => g.restantes > 0)
      .map(g => {
        const partes = (g.cuota || '').split('/')
        const actual = parseInt(partes[0] || '1')
        const total  = parseInt(partes[1] || '1')
        return {
          ...g,
          cuota: `${actual + 1}/${total}`,
          restantes: g.restantes - 1,
        }
      }),
    comprasNuevas: [],  // compras cargadas en la app
  }
}

// ── Calcular totales ─────────────────────────────────────────────────────────
export function calcular(mes, dolar = 0) {
  const ingresosBrutos = mes.ingresos.reduce((a, i) => a + i.monto, 0)
  const montoAhorro    = ingresosBrutos * (mes.apartado || 0) - (mes.libre || 0)
  const ingresosNetos  = ingresosBrutos - (ingresosBrutos * (mes.apartado || 0))

  const gastosFijosTotal = mes.gastosFijos.reduce((a, g) => {
    const m = g.usd && dolar > 0 ? g.monto * dolar : g.monto
    return a + m
  }, 0)

  const tarjetasTotal = mes.tarjetas.reduce((a, t) => {
    const cuotas = t.items.reduce((s, i) => s + i.monto, 0)
    return a + t.mantenimiento + cuotas
  }, 0)

  const otrosTotal = (mes.otrosGastos || []).reduce((a, g) => a + g.monto, 0)

  // Compras nuevas cargadas en la app
  const comprasTotal = (mes.comprasNuevas || []).reduce((a, c) => a + c.montoCuota, 0)

  const gastosTotal   = gastosFijosTotal + tarjetasTotal + otrosTotal + comprasTotal
  const presupuesto   = ingresosNetos - gastosTotal
  const libreReal     = (mes.libre || 0) - comprasTotal

  return {
    ingresosBrutos,
    ingresosNetos,
    montoAhorro: Math.max(0, montoAhorro),
    gastosFijosTotal,
    tarjetasTotal,
    otrosTotal,
    comprasTotal,
    gastosTotal,
    presupuesto,
    libreReal,
  }
}

// ── Formato de moneda ────────────────────────────────────────────────────────
const FMT = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const $  = n => `ARS ${FMT.format(n || 0)}`
export const $u = n => `USD ${FMT.format(n || 0)}`

export function nombreMes(fecha) {
  if (!fecha) return '—'
  const d = new Date(fecha)
  return d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
}

// ── Persistencia ─────────────────────────────────────────────────────────────
const KEY = 'mc2_meses'
export function guardar(meses) {
  localStorage.setItem(KEY, JSON.stringify(meses))
}
export function cargar() {
  try { return JSON.parse(localStorage.getItem(KEY)) || [] } catch { return [] }
}
