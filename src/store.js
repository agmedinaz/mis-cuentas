// ─── Mis Cuentas · Store ────────────────────────────────────────────────────
const PREFIX      = 'mc_'
const PENDING_KEY = 'mc_pending_purchases'
const SAVINGS_KEY = 'mc_savings'

// ── Colores de tarjetas ──────────────────────────────────────────────────────
export const TARJETA_COLORES = {
  'Tarjeta NX': { bg: '#ffcc00', text: '#5a3e00', border: '#e6b800' },
  'BNA VISA':   { bg: '#cc9966', text: '#3d2200', border: '#b8864e' },
  'BNA Master': { bg: '#99cccc', text: '#003333', border: '#7ab8b8' },
}
export function getTarjetaColor(nombre) {
  return TARJETA_COLORES[nombre] || { bg: '#26263f', text: '#e8e8f0', border: '#3a3a60' }
}

// ── Grupos de gastos fijos ──────────────────────────────────────────────────
export const GRUPOS_GASTOS_FIJOS = ['Departamento', 'Servicios', 'Personales', 'Streaming']

// ── Estructura de un mes ─────────────────────────────────────────────────────
export function emptyMonth(year, month) {
  return {
    id: `${year}-${String(month).padStart(2, '0')}`,
    year, month,

    // Ingresos separados en fijos y extras
    ingresosFijos: [
      { id: uid(), concepto: 'CONICET', monto: 0, usd: false },
      { id: uid(), concepto: 'UNLP',    monto: 0, usd: false },
    ],
    ingresosExtras: [],   // solo se cargan en el mes, no se copian

    // Distribución del ingreso:
    // pctAhorroLibre: % del ingreso bruto total que va a "ahorro + libre"
    // libreBase:      monto fijo en pesos destinado a gustitos
    // El resto (100% - pctAhorroLibre) va al presupuesto del mes
    // Dentro del pctAhorroLibre: montoAhorro = brutos*pctAhorroLibre - libreBase
    pctAhorroLibre: 0.23,  // 23% por defecto (como en tu planilla)
    libreBase: 0,

    // Distribución del ahorro entre USD y YPF (factores, suma = 1)
    factorUSD: 0.5,
    factorYPF: 0.5,

    gastosFijos: [
      { id: uid(), concepto: 'Alquiler',   monto: 0, grupo: 'Departamento', debitoAuto: null, usd: false },
      { id: uid(), concepto: 'Expensas',   monto: 0, grupo: 'Departamento', debitoAuto: null, usd: false },
      { id: uid(), concepto: 'ABSA',       monto: 0, grupo: 'Departamento', debitoAuto: null, usd: false },
      { id: uid(), concepto: 'Luz',        monto: 0, grupo: 'Servicios',    debitoAuto: null, usd: false },
      { id: uid(), concepto: 'Gas',        monto: 0, grupo: 'Servicios',    debitoAuto: null, usd: false },
      { id: uid(), concepto: 'Internet',   monto: 0, grupo: 'Servicios',    debitoAuto: 'BNA Master', usd: false },
      { id: uid(), concepto: 'Celular',    monto: 0, grupo: 'Personales',   debitoAuto: 'BNA Master', usd: false },
      { id: uid(), concepto: 'YouTube',    monto: 0, grupo: 'Streaming',    debitoAuto: 'Tarjeta NX', usd: true },
      { id: uid(), concepto: 'HBO',        monto: 0, grupo: 'Streaming',    debitoAuto: 'Tarjeta NX', usd: true },
      { id: uid(), concepto: 'Spotify',    monto: 0, grupo: 'Streaming',    debitoAuto: 'Tarjeta NX', usd: true },
      { id: uid(), concepto: 'Netflix',    monto: 0, grupo: 'Streaming',    debitoAuto: 'Tarjeta NX', usd: true },
      { id: uid(), concepto: 'Google One', monto: 0, grupo: 'Streaming',    debitoAuto: 'Tarjeta NX', usd: true },
    ],
    tarjetas: [
      { id: uid(), nombre: 'Tarjeta NX',  mantenimiento: 0, items: [] },
      { id: uid(), nombre: 'BNA VISA',    mantenimiento: 0, items: [] },
      { id: uid(), nombre: 'BNA Master',  mantenimiento: 0, items: [] },
    ],
    reintegros: [],
    dolarVenta: 0,
    dolarCompra: 0,
    notas: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

// ── Crear mes siguiente copiando solo lo persistente ────────────────────────
export function nextMonthFromPrev(prevData) {
  const { year, month } = prevData
  const nextM = month === 12 ? 1 : month + 1
  const nextY = month === 12 ? year + 1 : year
  const base  = emptyMonth(nextY, nextM)

  // Ingresos fijos → se copian igual
  // Si el mes anterior ya tiene la estructura nueva:
  if (prevData.ingresosFijos) {
    base.ingresosFijos  = prevData.ingresosFijos.map(i => ({ ...i, id: uid() }))
    base.ingresosExtras = []   // extras NO se copian
  } else {
    // Compatibilidad con datos viejos que solo tienen 'ingresos'
    base.ingresosFijos = (prevData.ingresos || []).map(i => ({ ...i, id: uid() }))
    base.ingresosExtras = []
  }

  // Configuración de distribución
  base.pctAhorroLibre = prevData.pctAhorroLibre ?? prevData.apartado ?? 0.23
  base.libreBase      = prevData.libreBase ?? 0
  base.factorUSD      = prevData.factorUSD ?? 0.5
  base.factorYPF      = prevData.factorYPF ?? 0.5

  // Gastos fijos → se copian con sus montos
  base.gastosFijos = (prevData.gastosFijos || []).map(g => ({ ...g, id: uid() }))

  // Tarjetas → copiar nombre y mantenimiento, avanzar cuotas, eliminar las terminadas
  base.tarjetas = (prevData.tarjetas || []).map(t => ({
    ...t,
    id: uid(),
    items: (t.items || [])
      // Solo incluir items que todavía tienen cuotas DESPUÉS de este mes
      // es decir, cuotasRestantes >= 1 ahora (en el mes anterior)
      .filter(item => {
        const r = cuotasRestantes(item)
        return r >= 1   // si r=0 era la última, no aparece en el siguiente mes
      })
      .map(item => {
        const r    = cuotasRestantes(item)
        const p    = (item.cuota || '').split('/')
        const act  = parseInt(p[0] || '1')
        const tot  = parseInt(p[1] || act.toString())
        return {
          ...item,
          id: uid(),
          cuota: tot > 0 ? `${act + 1}/${tot}` : item.cuota,
          cuotasRestantes: r - 1,
        }
      }),
  }))

  base.reintegros = []
  base.dolarVenta  = prevData.dolarVenta  || 0
  base.dolarCompra = prevData.dolarCompra || 0

  return base
}

function cuotasRestantes(item) {
  if (item.cuotasRestantes !== undefined && item.cuotasRestantes !== null) {
    return parseInt(item.cuotasRestantes)
  }
  const p = (item.cuota || '').split('/')
  if (p.length === 2) return Math.max(0, parseInt(p[1]) - parseInt(p[0]))
  return 0
}

// ── CRUD meses ───────────────────────────────────────────────────────────────
export function loadMonth(id) {
  try { return JSON.parse(localStorage.getItem(PREFIX + id)) || null }
  catch { return null }
}
export function saveMonth(data) {
  data.updatedAt = Date.now()
  localStorage.setItem(PREFIX + data.id, JSON.stringify(data))
  return data
}
export function listMonths() {
  const months = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(PREFIX) && !key.includes('pending') && !key.includes('savings')) {
      try {
        const d = JSON.parse(localStorage.getItem(key))
        if (d?.id) months.push({ id: d.id, year: d.year, month: d.month, updatedAt: d.updatedAt })
      } catch {}
    }
  }
  return months.sort((a, b) => b.id.localeCompare(a.id))
}
export function deleteMonth(id) { localStorage.removeItem(PREFIX + id) }

// ── Ahorros globales persistentes ──────────────────────────────────────────
export function loadSavings() {
  try {
    return JSON.parse(localStorage.getItem(SAVINGS_KEY)) ||
      { usdUnidades: 0, ypfAcciones: 0, ypfPrecioUltimo: 0, movimientos: [] }
  } catch { return { usdUnidades: 0, ypfAcciones: 0, ypfPrecioUltimo: 0, movimientos: [] } }
}
export function saveSavings(data) { localStorage.setItem(SAVINGS_KEY, JSON.stringify(data)) }

// ── Compras pendientes cross-mes ─────────────────────────────────────────────
export function loadPendingPurchases() {
  try { return JSON.parse(localStorage.getItem(PENDING_KEY)) || [] } catch { return [] }
}
export function savePendingPurchases(list) { localStorage.setItem(PENDING_KEY, JSON.stringify(list)) }
export function addPendingPurchase(p) {
  const list = loadPendingPurchases()
  list.push({ ...p, id: uid(), createdAt: Date.now() })
  savePendingPurchases(list)
  return list
}
export function removePendingPurchase(id) {
  const list = loadPendingPurchases().filter(p => p.id !== id)
  savePendingPurchases(list)
  return list
}

// ── Cálculos financieros ─────────────────────────────────────────────────────
export function calcMonth(data, pendingPurchases = [], dolarVenta = 0, dolarCompra = 0) {
  const venta  = dolarVenta  || data.dolarVenta  || data.dolar || 0
  const compra = dolarCompra || data.dolarCompra || dolarVenta || data.dolar || 0

  // ── Ingresos ──────────────────────────────────────────────────────
  // Compatibilidad: si tiene estructura vieja (ingresos flat) migramos al vuelo
  const fijos  = data.ingresosFijos  || data.ingresos || []
  const extras = data.ingresosExtras || []
  const todosIngresos = [...fijos, ...extras]

  function toARS(item) {
    const m = parseFloat(item.monto) || 0
    return item.usd ? m * venta : m
  }

  const ingresosBrutos = todosIngresos.reduce((a, i) => a + toARS(i), 0)
  const ingresosFijosTotal  = fijos.reduce((a, i) => a + toARS(i), 0)
  const ingresosExtrasTotal = extras.reduce((a, i) => a + toARS(i), 0)

  // ── Distribución del ingreso ──────────────────────────────────────
  // pctAhorroLibre: % que va a "ahorro + libre", el resto al presupuesto del mes
  const pct         = data.pctAhorroLibre ?? data.apartado ?? 0.23
  const libre       = data.libreBase      ?? 0
  const montoAhorroLibre = ingresosBrutos * pct          // total destinado a ahorro+libre
  const montoAhorro      = Math.max(0, montoAhorroLibre - libre)  // la parte que va a invertir
  const ingresosParaGastos = ingresosBrutos - montoAhorroLibre    // para cubrir gastos del mes

  // ── Gastos fijos (convertir USD con cotización venta) ─────────────
  const gastosFijosConvertidos = (data.gastosFijos || []).map(g => {
    const montoARS = g.usd && venta > 0 ? (g.monto || 0) * venta : (g.monto || 0)
    return { ...g, montoARS }
  })

  // Débitos automáticos por tarjeta
  const debitosAutoXTarjeta = {}
  gastosFijosConvertidos.forEach(g => {
    if (g.debitoAuto) {
      debitosAutoXTarjeta[g.debitoAuto] = (debitosAutoXTarjeta[g.debitoAuto] || 0) + g.montoARS
    }
  })

  // Gastos fijos propios (sin débito auto, no duplicar)
  const sumaGastosFijosNetos = gastosFijosConvertidos
    .filter(g => !g.debitoAuto)
    .reduce((a, g) => a + g.montoARS, 0)

  // ── Tarjetas ───────────────────────────────────────────────────────
  const tarjetasDetalle = (data.tarjetas || []).map(t => {
    const cuotasSum = (t.items || []).reduce((a, i) => a + (parseFloat(i.monto) || 0), 0)
    const debitos   = debitosAutoXTarjeta[t.nombre] || 0
    const total     = (t.mantenimiento || 0) + cuotasSum + debitos
    return { ...t, cuotasSum, debitos, total }
  })
  const sumaTarjetas = tarjetasDetalle.reduce((a, t) => a + t.total, 0)

  // ── Reintegros ────────────────────────────────────────────────────
  const totalReintegros = (data.reintegros || []).reduce((a, r) => {
    const m = parseFloat(r.monto) || 0
    return a + (r.usd ? m * venta : m)
  }, 0)

  // ── Totales ────────────────────────────────────────────────────────
  const gastosTotales = sumaGastosFijosNetos + sumaTarjetas
  // Presupuesto sobrante = ingreso disponible para gastos − gastos totales + reintegros
  const presupuesto   = ingresosParaGastos - gastosTotales + totalReintegros

  // ── Libre disponible (descontando compras pendientes) ─────────────
  const pendingForThisMonth = (pendingPurchases || []).filter(p => p.targetMonthId === data.id)
  const sumaPending         = pendingForThisMonth.reduce((a, p) => a + (p.monto || 0), 0)
  const libreDisponible     = libre - sumaPending

  // ── Proyección próximos meses ──────────────────────────────────────
  const proyeccion = calcProyeccion(
    data, sumaGastosFijosNetos, ingresosBrutos, pct, libre
  )

  return {
    ingresosBrutos,
    ingresosFijosTotal,
    ingresosExtrasTotal,
    pct,
    libre,
    montoAhorroLibre,
    montoAhorro,
    ingresosParaGastos,
    gastosFijosConvertidos,
    sumaGastosFijosNetos,
    sumaTarjetas,
    tarjetasDetalle,
    debitosAutoXTarjeta,
    gastosTotales,
    totalReintegros,
    presupuesto,
    sumaPending,
    pendingForThisMonth,
    libreDisponible,
    proyeccion,
    dolarVenta: venta,
    dolarCompra: compra,
  }
}

function calcProyeccion(data, gastosFijosNetos, ingresosBrutos, pct, libreBase) {
  const items    = (data.tarjetas || []).flatMap(t => t.items || [])
  const mantTotal = (data.tarjetas || []).reduce((a, t) => a + (t.mantenimiento || 0), 0)
  return Array.from({ length: 7 }, (_, mes) => {
    const tarjetasMes = items.reduce((sum, item) => {
      const r = cuotasRestantes(item)
      return r > mes ? sum + (parseFloat(item.monto) || 0) : sum
    }, 0)
    const gf          = gastosFijosNetos + mantTotal + tarjetasMes
    const disponible  = ingresosBrutos * (1 - pct)
    const presupuesto = disponible - gf
    const ahorro      = Math.max(0, ingresosBrutos * pct - libreBase)
    return { mes, gastosFijos: gf, presupuesto, ahorro, libre: libreBase }
  })
}

// ── Helpers ──────────────────────────────────────────────────────────────────
export function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36) }

// ── Formateo ─────────────────────────────────────────────────────────────────
const FMT = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export function fmtARS(n) {
  if (n === null || n === undefined || isNaN(n)) return 'ARS\u00a00'
  return 'ARS\u00a0' + FMT.format(n)
}
export function fmtUSD(n) {
  if (n === null || n === undefined || isNaN(n)) return 'USD\u00a00,00'
  return 'USD\u00a0' + FMT.format(n)
}
export function monthName(m) {
  return ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio',
    'Agosto','Septiembre','Octubre','Noviembre','Diciembre'][m-1] || ''
}

// ── Evaluador de expresiones ──────────────────────────────────────────────────
export function evalExpr(str) {
  if (str === '' || str === null || str === undefined) return 0
  let s = String(str).trim()
  s = s.replace(/[\d.,]+/g, token => normalizeNumber(token))
  if (!/^[\d\s+\-*/().]+$/.test(s)) return parseFloat(s) || 0
  try {
    const result = Function('"use strict"; return (' + s + ')')()
    return typeof result === 'number' && isFinite(result) ? result : 0
  } catch { return parseFloat(s) || 0 }
}
function normalizeNumber(token) {
  const hasDot = token.includes('.'), hasComma = token.includes(',')
  if (hasDot && hasComma)  return token.replace(/\./g, '').replace(',', '.')
  if (hasComma && !hasDot) return token.replace(',', '.')
  if (hasDot && !hasComma) {
    const after = token.split('.').pop()
    return after.length === 3 ? token.replace(/\./g, '') : token
  }
  return token
}
