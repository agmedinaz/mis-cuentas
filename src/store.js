// ─── Mis Cuentas · Store ────────────────────────────────────────────────────
// Persiste en localStorage. Clave por mes: "mc_2026-12"

const PREFIX = 'mc_'

// ── Estructura de un mes ─────────────────────────────────────────────────────
export function emptyMonth(year, month) {
  return {
    id: `${year}-${String(month).padStart(2, '0')}`,
    year,
    month,
    // Ingresos
    ingresos: [
      { id: uid(), concepto: 'CONICET', monto: 0 },
      { id: uid(), concepto: 'Cargo', monto: 0 },
    ],
    // Porcentaje apartado (ej: 0.06 = 6%)
    apartado: 0.06,
    // Dinero libre fijo del mes
    libreBase: 0,
    // Gastos fijos
    gastosFijos: [
      { id: uid(), concepto: 'Alquiler', monto: 0 },
      { id: uid(), concepto: 'Expensas', monto: 0 },
      { id: uid(), concepto: 'ABSA', monto: 0 },
      { id: uid(), concepto: 'Luz', monto: 0 },
      { id: uid(), concepto: 'Gas', monto: 0 },
      { id: uid(), concepto: 'Internet', monto: 0 },
      { id: uid(), concepto: 'Celular', monto: 0 },
      // streaming
      { id: uid(), concepto: 'YouTube', monto: 0 },
      { id: uid(), concepto: 'HBO', monto: 0 },
      { id: uid(), concepto: 'Spotify', monto: 0 },
      { id: uid(), concepto: 'Netflix', monto: 0 },
      { id: uid(), concepto: 'Google One', monto: 0 },
    ],
    // Tarjetas: array de tarjetas, cada una con cuotas
    tarjetas: [
      { id: uid(), nombre: 'Tarjeta NX', mantenimiento: 0, items: [] },
      { id: uid(), nombre: 'BNA VISA', mantenimiento: 0, items: [] },
      { id: uid(), nombre: 'BNA Master', mantenimiento: 0, items: [] },
    ],
    // Gastos sueltos del mes (otros gastos: Uber, etc.)
    otrosGastos: [],
    // Reintegros / deudas que me deben
    reintegros: [],
    // Dólar y factor
    dolar: 0,
    factor: 0,
    // Notas libres
    notas: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

// ── CRUD meses ───────────────────────────────────────────────────────────────
export function loadMonth(id) {
  try {
    const raw = localStorage.getItem(PREFIX + id)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
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
    if (key?.startsWith(PREFIX)) {
      try {
        const d = JSON.parse(localStorage.getItem(key))
        months.push({ id: d.id, year: d.year, month: d.month, updatedAt: d.updatedAt })
      } catch {}
    }
  }
  return months.sort((a, b) => b.id.localeCompare(a.id))
}

export function deleteMonth(id) {
  localStorage.removeItem(PREFIX + id)
}

// ── Compras en cuotas pendientes (cross-mes) ─────────────────────────────────
// Se guardan por separado para poder imputarlas a cualquier mes
const PENDING_KEY = 'mc_pending_purchases'

export function loadPendingPurchases() {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY)) || []
  } catch { return [] }
}

export function savePendingPurchases(list) {
  localStorage.setItem(PENDING_KEY, JSON.stringify(list))
}

export function addPendingPurchase(purchase) {
  const list = loadPendingPurchases()
  list.push({ ...purchase, id: uid(), createdAt: Date.now() })
  savePendingPurchases(list)
  return list
}

export function removePendingPurchase(id) {
  const list = loadPendingPurchases().filter(p => p.id !== id)
  savePendingPurchases(list)
  return list
}

// ── Cálculos financieros ─────────────────────────────────────────────────────

export function calcMonth(data, pendingPurchases = []) {
  // Ingresos brutos
  const ingresosBrutos = sumList(data.ingresos, 'monto')

  // Apartado
  const montoApartado = ingresosBrutos * (data.apartado || 0)

  // Ingresos netos (brutos - apartado - libre)
  const ingresosNetos = ingresosBrutos - montoApartado - (data.libreBase || 0)

  // Gastos fijos
  const sumaGastosFijos = sumList(data.gastosFijos, 'monto')

  // Tarjetas: suma de mantenimiento + cuotas de cada tarjeta
  let sumaTarjetas = 0
  const tarjetasDetalle = data.tarjetas.map(t => {
    const cuotasSum = sumList(t.items, 'monto')
    const total = (t.mantenimiento || 0) + cuotasSum
    sumaTarjetas += total
    return { ...t, cuotasSum, total }
  })

  // Otros gastos del mes
  const sumaOtros = sumList(data.otrosGastos, 'monto')

  // Gastos totales
  const gastosTotales = sumaGastosFijos + sumaTarjetas + sumaOtros

  // Reintegros
  const totalReintegros = sumList(data.reintegros, 'monto')

  // Compras pendientes (hechas en otros meses, que impactan en el libre de ESTE mes)
  const pendingForThisMonth = pendingPurchases.filter(p => p.targetMonthId === data.id)
  const sumaPending = pendingForThisMonth.reduce((acc, p) => acc + (p.monto || 0), 0)

  // Libre disponible = libre base - compras pendientes cargadas
  const libreDisponible = (data.libreBase || 0) - sumaPending

  // Ahorro = netos - fijos - tarjetas - otros + reintegros - libreBase
  const ahorro = ingresosNetos - gastosTotales + totalReintegros

  // Presupuesto = netos - fijos - tarjetas - otros + reintegros (sin libre)
  const presupuesto = ingresosNetos - sumaGastosFijos - sumaTarjetas - sumaOtros + totalReintegros

  return {
    ingresosBrutos,
    montoApartado,
    ingresosNetos,
    sumaGastosFijos,
    sumaTarjetas,
    tarjetasDetalle,
    sumaOtros,
    gastosTotales,
    totalReintegros,
    sumaPending,
    pendingForThisMonth,
    libreDisponible,
    ahorro,
    presupuesto,
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
export function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function sumList(arr, key) {
  return (arr || []).reduce((acc, item) => acc + (parseFloat(item[key]) || 0), 0)
}

export function fmtARS(n) {
  if (n === null || n === undefined || isNaN(n)) return '$0'
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

export function monthName(m) {
  return ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
          'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][m - 1] || ''
}

// Importar desde planilla (objeto plano parseado externamente)
export function importFromSheetData(year, month, sheetData) {
  const base = emptyMonth(year, month)
  return { ...base, ...sheetData, id: base.id, year, month }
}
