// ─── Mis Cuentas · Store ────────────────────────────────────────────────────
const PREFIX = 'mc_'
const PENDING_KEY = 'mc_pending_purchases'
const SAVINGS_KEY = 'mc_savings'  // ahorros globales persistentes

// ── Colores de tarjetas ──────────────────────────────────────────────────────
export const TARJETA_COLORES = {
  'Tarjeta NX':   { bg: '#ffcc00', text: '#5a3e00', border: '#e6b800', nombre: 'NX' },
  'BNA VISA':     { bg: '#cc9966', text: '#3d2200', border: '#b8864e', nombre: 'VISA' },
  'BNA Master':   { bg: '#99cccc', text: '#003333', border: '#7ab8b8', nombre: 'Master' },
}
export function getTarjetaColor(nombre) {
  return TARJETA_COLORES[nombre] || { bg: '#26263f', text: '#e8e8f0', border: '#3a3a60', nombre: nombre }
}

// ── Grupos de gastos fijos ──────────────────────────────────────────────────
export const GRUPOS_GASTOS_FIJOS = ['Departamento', 'Servicios', 'Personales', 'Streaming']
export const GRUPO_DEFAULT = {
  'Alquiler': 'Departamento', 'Expensas': 'Departamento', 'ABSA': 'Departamento',
  'Luz': 'Servicios', 'Gas': 'Servicios', 'Internet': 'Servicios', 'Celular': 'Personales',
  'YouTube': 'Streaming', 'HBO': 'Streaming', 'Spotify': 'Streaming',
  'Netflix': 'Streaming', 'Google One': 'Streaming', 'Suscripción YT': 'Streaming',
}

// ── Estructura de un mes ─────────────────────────────────────────────────────
export function emptyMonth(year, month) {
  return {
    id: `${year}-${String(month).padStart(2, '0')}`,
    year, month,
    ingresos: [
      { id: uid(), concepto: 'CONICET', monto: 0 },
      { id: uid(), concepto: 'Cargo', monto: 0 },
    ],
    apartado: 0.06,   // % del bruto que va a ahorro
    libreBase: 0,     // monto fijo libre para gustitos
    gastosFijos: [
      { id: uid(), concepto: 'Alquiler',       monto: 0, grupo: 'Departamento', debitoAuto: null, usd: false },
      { id: uid(), concepto: 'Expensas',       monto: 0, grupo: 'Departamento', debitoAuto: null, usd: false },
      { id: uid(), concepto: 'ABSA',           monto: 0, grupo: 'Departamento', debitoAuto: null, usd: false },
      { id: uid(), concepto: 'Luz',            monto: 0, grupo: 'Servicios',    debitoAuto: null, usd: false },
      { id: uid(), concepto: 'Gas',            monto: 0, grupo: 'Servicios',    debitoAuto: null, usd: false },
      { id: uid(), concepto: 'Internet',       monto: 0, grupo: 'Servicios',    debitoAuto: 'BNA Master', usd: false },
      { id: uid(), concepto: 'Celular',        monto: 0, grupo: 'Personales',   debitoAuto: 'BNA Master', usd: false },
      { id: uid(), concepto: 'YouTube',        monto: 0, grupo: 'Streaming',    debitoAuto: 'Tarjeta NX', usd: true },
      { id: uid(), concepto: 'HBO',            monto: 0, grupo: 'Streaming',    debitoAuto: 'Tarjeta NX', usd: true },
      { id: uid(), concepto: 'Spotify',        monto: 0, grupo: 'Streaming',    debitoAuto: 'Tarjeta NX', usd: true },
      { id: uid(), concepto: 'Netflix',        monto: 0, grupo: 'Streaming',    debitoAuto: 'Tarjeta NX', usd: true },
      { id: uid(), concepto: 'Google One',     monto: 0, grupo: 'Streaming',    debitoAuto: 'Tarjeta NX', usd: true },
    ],
    tarjetas: [
      { id: uid(), nombre: 'Tarjeta NX',  mantenimiento: 0, items: [] },
      { id: uid(), nombre: 'BNA VISA',    mantenimiento: 0, items: [] },
      { id: uid(), nombre: 'BNA Master',  mantenimiento: 0, items: [] },
    ],
    otrosGastos: [],
    reintegros: [],
    dolar: 0,        // cotización oficial al momento de cerrar el mes
    notas: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

// ── Crear mes siguiente con datos del anterior ──────────────────────────────
export function nextMonthFromPrev(prevData) {
  const { year, month } = prevData
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const base = emptyMonth(nextYear, nextMonth)

  // Copiar ingresos
  base.ingresos = prevData.ingresos.map(i => ({ ...i, id: uid() }))
  base.apartado = prevData.apartado
  base.libreBase = prevData.libreBase

  // Copiar gastos fijos con mismos montos
  base.gastosFijos = prevData.gastosFijos.map(g => ({ ...g, id: uid() }))

  // Mantener tarjetas con nombre, mantenimiento; avanzar cuotas (quitar las terminadas, reducir restantes)
  base.tarjetas = prevData.tarjetas.map(t => ({
    ...t,
    id: uid(),
    items: t.items
      .filter(item => {
        const restantes = parseInt(item.cuotasRestantes ?? item.cuota?.split('/')[1] ?? '1')
        const actuales = parseInt(item.cuota?.split('/')[0] ?? '1')
        return restantes > 0
      })
      .map(item => {
        // Avanzar cuota: "2/6" con 4 restantes → "3/6" con 3 restantes
        const partes = (item.cuota || '').split('/')
        const actual = parseInt(partes[0] || '1')
        const total = parseInt(partes[1] || '1')
        const restantes = parseInt(item.cuotasRestantes ?? (total - actual).toString())
        const newActual = actual + 1
        const newRestantes = restantes - 1
        return {
          ...item,
          id: uid(),
          cuota: total > 0 ? `${newActual}/${total}` : item.cuota,
          cuotasRestantes: newRestantes,
        }
      })
      .filter(item => {
        const r = parseInt(item.cuotasRestantes ?? '1')
        return r >= 0
      }),
  }))

  base.otrosGastos = []
  base.reintegros = []
  base.dolar = prevData.dolar

  return base
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

// ── Ahorros globales persistentes ─────────────────────────────────────────
export function loadSavings() {
  try { return JSON.parse(localStorage.getItem(SAVINGS_KEY)) || { usdAcciones: 0, ypfAcciones: 0, movimientos: [] } }
  catch { return { usdAcciones: 0, ypfAcciones: 0, movimientos: [] } }
}
export function saveSavings(data) { localStorage.setItem(SAVINGS_KEY, JSON.stringify(data)) }

// ── Compras pendientes cross-mes ─────────────────────────────────────────────
export function loadPendingPurchases() {
  try { return JSON.parse(localStorage.getItem(PENDING_KEY)) || [] }
  catch { return [] }
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
// dolarCompra: precio al que el banco te compra tus dólares (para valuar ahorros en ARS)
// dolarVenta:  precio al que el banco te vende dólares (para gastos en USD, streaming, comprar USD)
export function calcMonth(data, pendingPurchases = [], dolarVenta = 0, dolarCompra = 0) {
  // Fallback: si solo se pasa un valor, usarlo para ambos (compatibilidad)
  const venta  = dolarVenta  || data.dolar || 0
  const compra = dolarCompra || dolarVenta || data.dolar || 0

  // Ingresos brutos
  const ingresosBrutos = sumList(data.ingresos, 'monto')

  // Ahorro = brutos × apartado% − libre  (fórmula planilla: B5*B7-B8)
  const montoAhorro = ingresosBrutos * (data.apartado || 0) - (data.libreBase || 0)

  // Ingresos netos = brutos − libre − ahorro  (B5-B8-B9)
  const ingresosNetos = ingresosBrutos - (data.libreBase || 0) - Math.max(0, montoAhorro)

  // Gastos fijos en USD se convierten con cotización VENTA
  // (porque para pagarlos tenés que comprar dólares al banco)
  const gastosFijosConvertidos = (data.gastosFijos || []).map(g => {
    const montoARS = g.usd && venta > 0 ? (g.monto || 0) * venta : (g.monto || 0)
    return { ...g, montoARS }
  })

  // Para SUMA GASTOS FIJOS: todos los fijos (incluyendo los de débito auto)
  // pero se excluyen al calcular gastos totales si ya están en tarjeta
  const sumaGastosFijosBruto = gastosFijosConvertidos.reduce((a, g) => a + g.montoARS, 0)

  // Tarjetas: mantenimiento + cuotas propias + débitos automáticos que le corresponden
  const debitosAutoXTarjeta = {}
  gastosFijosConvertidos.forEach(g => {
    if (g.debitoAuto) {
      if (!debitosAutoXTarjeta[g.debitoAuto]) debitosAutoXTarjeta[g.debitoAuto] = 0
      debitosAutoXTarjeta[g.debitoAuto] += g.montoARS
    }
  })

  const tarjetasDetalle = (data.tarjetas || []).map(t => {
    const cuotasSum = sumList(t.items, 'monto')
    const debitos = debitosAutoXTarjeta[t.nombre] || 0
    const total = (t.mantenimiento || 0) + cuotasSum + debitos
    return { ...t, cuotasSum, debitos, total }
  })
  const sumaTarjetas = tarjetasDetalle.reduce((a, t) => a + t.total, 0)

  // Gastos fijos "propios" (sin los de débito auto, que ya están en tarjeta)
  const sumaGastosFijosNetos = gastosFijosConvertidos
    .filter(g => !g.debitoAuto)
    .reduce((a, g) => a + g.montoARS, 0)

  // Otros gastos del mes
  const sumaOtros = sumList(data.otrosGastos, 'monto')

  // Gastos totales = fijos_propios + tarjetas (que incluyen débitos auto) + otros
  // Esto evita doble conteo
  const gastosTotales = sumaGastosFijosNetos + sumaTarjetas + sumaOtros

  // Reintegros
  const totalReintegros = sumList(data.reintegros, 'monto')

  // Presupuesto = ingresos_netos − gastos_totales + reintegros  (F38 = B11 - C38)
  const presupuesto = ingresosNetos - gastosTotales + totalReintegros

  // Compras pendientes que impactan en este mes
  const pendingForThisMonth = (pendingPurchases || []).filter(p => p.targetMonthId === data.id)
  const sumaPending = pendingForThisMonth.reduce((a, p) => a + (p.monto || 0), 0)
  const libreDisponible = (data.libreBase || 0) - sumaPending

  // Streaming total en USD (informativo)
  const streamingUSD = gastosFijosConvertidos
    .filter(g => g.grupo === 'Streaming' && g.usd)
    .reduce((a, g) => a + (g.monto || 0), 0)

  const proyeccion = calcProyeccion(data, sumaGastosFijosNetos, ingresosBrutos, data.apartado, data.libreBase)

  return {
    ingresosBrutos,
    montoAhorro: Math.max(0, montoAhorro),
    ingresosNetos,
    gastosFijosConvertidos,
    sumaGastosFijosBruto,
    sumaGastosFijosNetos,
    sumaTarjetas,
    tarjetasDetalle,
    debitosAutoXTarjeta,
    sumaOtros,
    gastosTotales,
    totalReintegros,
    presupuesto,
    sumaPending,
    pendingForThisMonth,
    libreDisponible,
    streamingUSD,
    proyeccion,
    dolarVenta: venta,   // precio de venta (para gastos en USD)
    dolarCompra: compra, // precio de compra (para valuar ahorros)
  }
}

function calcProyeccion(data, gastosFijosNetos, ingresosBrutos, apartado, libreBase) {
  // Cuotas de tarjetas con cuotas restantes
  const items = data.tarjetas.flatMap(t => t.items || [])
  // Para cada mes futuro (0 = actual ya calculado, 1..6 = próximos)
  return Array.from({ length: 7 }, (_, mes) => {
    // Cuotas que todavía se pagan en este mes futuro
    const tarjetasMes = items.reduce((sum, item) => {
      const restantes = parseInt(item.cuotasRestantes ?? (() => {
        const p = (item.cuota || '').split('/')
        return parseInt(p[1] || p[0] || '1') - parseInt(p[0] || '1')
      })())
      return restantes > mes ? sum + (parseFloat(item.monto) || 0) : sum
    }, 0)
    // Mantenimientos se mantienen
    const mantTotal = data.tarjetas.reduce((a, t) => a + (t.mantenimiento || 0), 0)
    const gastosFijos = gastosFijosNetos + mantTotal + tarjetasMes
    const presupuesto = (ingresosBrutos) * (1 - (apartado || 0)) - gastosFijos
    const ahorro = ingresosBrutos * (apartado || 0) - (libreBase || 0)
    return { mes, gastosFijos, presupuesto, ahorro: Math.max(0, ahorro), libre: libreBase || 0 }
  })
}

// ── Helpers ──────────────────────────────────────────────────────────────────
export function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36) }
function sumList(arr, key) { return (arr || []).reduce((acc, i) => acc + (parseFloat(i[key]) || 0), 0) }

// ── Formateo de moneda ────────────────────────────────────────────────────────
// Formato: separador de miles = punto, decimal = coma, prefijo = "ARS " o "USD "
// Ejemplos: 150000 → "ARS 150.000"   0.5 → "ARS 0,50"   1234567.89 → "ARS 1.234.567,89"
const FMT_ARS = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
const FMT_USD = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function fmtARS(n) {
  if (n === null || n === undefined || isNaN(n)) return 'ARS 0'
  return 'ARS\u00a0' + FMT_ARS.format(n)   // \u00a0 = espacio no separable
}
export function fmtUSD(n) {
  if (n === null || n === undefined || isNaN(n)) return 'USD 0,00'
  return 'USD\u00a0' + FMT_USD.format(n)
}

export function monthName(m) {
  return ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][m-1] || ''
}

// ── Evaluador de expresiones ──────────────────────────────────────────────────
// Acepta tanto "," como "." como separador decimal (y "." como separador de miles).
// Regla: si hay un punto Y una coma, el punto es miles y la coma es decimal.
//        si solo hay coma, es decimal.
//        si solo hay punto:
//          - si está seguido de exactamente 3 dígitos al final → es miles → se elimina
//          - si no (ej: 1550.5) → es decimal → se convierte a coma
// Ejemplos:
//   "1.550"      → 1550
//   "1.550,50"   → 1550.50
//   "1550,5"     → 1550.5
//   "1550.5"     → 1550.5
//   "70000/2"    → 35000
//   "30.000/2"   → 15000
export function evalExpr(str) {
  if (str === '' || str === null || str === undefined) return 0
  let s = String(str).trim()

  // Separar tokens de una expresión (números y operadores)
  // Para cada token numérico, normalizar al formato JS (punto decimal)
  s = s.replace(/[\d.,]+/g, token => normalizeNumber(token))

  // Ahora s tiene solo dígitos, punto decimal JS, y operadores +−*/()
  if (!/^[\d\s+\-*/().]+$/.test(s)) return parseFloat(s) || 0
  try {
    const result = Function('"use strict"; return (' + s + ')')()
    return typeof result === 'number' && isFinite(result) ? result : 0
  } catch { return parseFloat(s) || 0 }
}

// Convierte un token numérico argentino a número JS
function normalizeNumber(token) {
  const hasDot   = token.includes('.')
  const hasComma = token.includes(',')

  if (hasDot && hasComma) {
    // Formato miles.decimal: "1.234.567,89" → "1234567.89"
    return token.replace(/\./g, '').replace(',', '.')
  }
  if (hasComma && !hasDot) {
    // Solo coma → decimal: "1550,5" → "1550.5"
    return token.replace(',', '.')
  }
  if (hasDot && !hasComma) {
    // Solo punto: ¿miles o decimal?
    const afterDot = token.split('.').pop()
    if (afterDot.length === 3) {
      // "1.550" → miles → eliminar punto
      return token.replace(/\./g, '')
    }
    // "1550.5" → decimal → dejar como está
    return token
  }
  return token  // sin separadores, número limpio
}
