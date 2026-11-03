# Mis Cuentas

App de finanzas personales. Funciona como **app de escritorio en Windows** (instalador ~5 MB via Tauri) y como **PWA en el celular** (instalable desde el navegador).

## ✨ Funcionalidades

- **Gestión mensual completa**: ingresos, gastos fijos, tarjetas con cuotas, otros gastos y reintegros — todo igual que tu planilla pero interactivo
- **Dinero libre**: ve cuánto libre real tenés disponible, descontando automáticamente las compras pendientes
- **Compras pendientes**: registrá compras con tarjeta que todavía no aparecen en la planilla del mes siguiente; el sistema las descuenta del libre del mes que corresponda
- **Resumen visual**: barra de distribución del ingreso, desglose por tarjeta, ahorro estimado
- **Multi-mes**: creá y navegá entre meses, con resumen general comparativo
- **100% local**: todos los datos se guardan en tu dispositivo (localStorage), sin servidores ni cuentas

## 🚀 Instalación

### En el celular (PWA)
1. Abrí la app desde el link de GitHub Pages (o el deploy que uses)
2. En Chrome/Safari: "Agregar a pantalla de inicio"
3. Listo, funciona como app nativa

### En Windows (app de escritorio)
1. Bajá el instalador `.msi` o `.exe` desde [Releases](../../releases)
2. Ejecutalo e instalá normalmente
3. La app queda en el menú inicio

## 🛠️ Desarrollo local

```bash
# Instalar dependencias
npm install

# Solo frontend (sin Tauri)
npm run dev
# → abre http://localhost:1420

# Con Tauri (requiere Rust instalado)
npm run tauri dev
```

**Requisitos para Tauri:**
- [Node.js 18+](https://nodejs.org)
- [Rust](https://rustup.rs) (se instala con `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)
- En Windows: [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)

## 📦 Build / Release

```bash
# Build solo frontend
npm run build

# Build app de escritorio
npm run tauri build
# → genera instalador en src-tauri/target/release/bundle/
```

Para hacer un release automático (Windows + Mac + Linux), creá un tag:
```bash
git tag v1.0.0
git push origin v1.0.0
```
GitHub Actions va a compilar y publicar los instaladores automáticamente.

## 🏗️ Estructura del proyecto

```
mis-cuentas/
├── src/
│   ├── main.jsx              # Entry point React
│   ├── App.jsx               # Shell principal + navegación
│   ├── store.js              # Lógica de datos y cálculos
│   ├── styles.css            # Estilos globales
│   ├── useToast.js           # Notificaciones
│   ├── pages/
│   │   ├── Dashboard.jsx     # Resumen general multi-mes
│   │   ├── MonthEditor.jsx   # Editor completo del mes
│   │   └── PendingPurchases.jsx  # Compras pendientes / cross-mes
│   └── components/
│       ├── LibreCard.jsx     # Card del dinero libre con pendientes
│       ├── TarjetaSection.jsx # Gestión de tarjetas y cuotas
│       └── NewMonthModal.jsx  # Modal para crear nuevo mes
├── src-tauri/                # Config de la app de escritorio
├── .github/workflows/        # CI/CD para releases automáticos
├── index.html
├── vite.config.js
└── package.json
```

## 💡 Cómo usar las compras pendientes

Esta es la función clave. Ejemplo:
- Diciembre tiene **$150.000 de libre**
- En noviembre compraste unas zapatillas en 6 cuotas: la primera cuota ($18.000) va a caer en diciembre
- Entrás a **"Compras pendientes"** y registrás: zapatillas, $18.000, mes destino: Diciembre 2026
- Ahora el libre de diciembre muestra **$132.000** disponibles reales
- Cuando diciembre finalmente llega y cargás las cuotas en la planilla, eliminás la compra pendiente

## 📝 Licencia

MIT
