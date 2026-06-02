import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from './supabase'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend
} from 'recharts'

// ── Brand colors ──────────────────────────────────────────────
const C = {
  navy:    '#1D2B5F',
  blue:    '#1E6FBF',
  cyan:    '#00B4D8',
  cyanL:   '#90E0EF',
  surface: '#111D35',
  s2:      '#1A2B4A',
  s3:      '#223356',
  border:  'rgba(0,180,216,0.18)',
  text:    '#E8F4FD',
  muted:   '#7B9EC4',
  green:   '#10B981',
  yellow:  '#F59E0B',
  red:     '#EF4444',
}

// ── Helpers ───────────────────────────────────────────────────
const fmt = n => (n ?? 0).toLocaleString('es-CO')
const pct = (a, b) => b ? ((a / b) * 100).toFixed(1) + ' %' : '0 %'

const MES_MAP = {
  '11': 'Nov', '12': 'Dic',
  '01': 'Ene', '02': 'Feb', '03': 'Mar',
  '04': 'Abr', '05': 'May', '06': 'Jun'
}

function parseMes(fecha) {
  if (!fecha) return null
  const m = String(fecha).slice(5, 7)
  const y = String(fecha).slice(0, 4)
  return `${MES_MAP[m] || m} ${y.slice(2)}`
}

// ── KPI Card ──────────────────────────────────────────────────
function KPI({ label, value, sub, accent = C.cyan }) {
  return (
    <div style={{
      background: C.s2,
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      padding: '18px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${accent}, transparent)`
      }} />
      <span style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
      <span style={{ fontSize: 28, fontWeight: 700, color: C.text, lineHeight: 1 }}>{value}</span>
      {sub && <span style={{ fontSize: 11, color: C.muted }}>{sub}</span>}
    </div>
  )
}

// ── Section header ─────────────────────────────────────────────
function SectionTitle({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <div style={{ width: 3, height: 16, background: C.cyan, borderRadius: 2 }} />
      <span style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: 1.5 }}>
        {children}
      </span>
    </div>
  )
}

// ── Chart card ────────────────────────────────────────────────
function Card({ children, style = {} }) {
  return (
    <div style={{
      background: C.s2,
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      padding: '20px 20px 16px',
      ...style
    }}>
      {children}
    </div>
  )
}

// ── Custom Tooltip ─────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: C.navy, border: `1px solid ${C.border}`,
      borderRadius: 8, padding: '8px 12px', fontSize: 12, color: C.text
    }}>
      <p style={{ color: C.muted, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <b>{fmt(p.value)}</b></p>
      ))}
    </div>
  )
}

// ── Alert badge ───────────────────────────────────────────────
function AlertBadge({ nivel }) {
  const map = {
    ROJO:     { bg: 'rgba(239,68,68,0.15)',   color: '#EF4444', label: 'ROJO' },
    AMARILLO: { bg: 'rgba(245,158,11,0.15)',  color: '#F59E0B', label: 'AMARILLO' },
    VERDE:    { bg: 'rgba(16,185,129,0.15)',  color: '#10B981', label: 'VERDE' },
    GRIS:     { bg: 'rgba(107,114,128,0.15)', color: '#9CA3AF', label: 'GRIS' },
  }
  const s = map[nivel] || map.GRIS
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700
    }}>{s.label}</span>
  )
}

// ── MAIN APP ──────────────────────────────────────────────────
export default function App() {
  const [ali, setAli]       = useState([])
  const [traz, setTraz]     = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]       = useState('alistamiento')
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroComercial, setFiltroComercial] = useState('')
  const [filtroAlerta, setFiltroAlerta]   = useState('')

  useEffect(() => {
  async function fetchAll(table) {
    let all = []
    let from = 0
    const PAGE = 1000
    while (true) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .range(from, from + PAGE - 1)
      if (error || !data || data.length === 0) break
      all = [...all, ...data]
      if (data.length < PAGE) break
      from += PAGE
    }
    return all
  }

  async function load() {
    const [a, t] = await Promise.all([
      fetchAll('alistamientos_preoperacionales'),
      fetchAll('trazabilidad_alistamientos'),
    ])
    setAli(a)
    setTraz(t)
    setLoading(false)
  }
  load()
}, [])

  // ── KPIs Alistamiento ──────────────────────────────────────
  const totalAli    = ali.length
  const aprobados   = ali.filter(r => r['ESTADO FINAL'] === 'APROBADO').length
  const reutilizados = ali.filter(r => r['CONDICIÓN DEL EQUIPO'] === 'USADO').length
  const tiempoPromedio = useMemo(() => {
    const vals = ali.map(r => parseFloat(r['TIEMPO EMPLEADO EN LA CONFIGURACIÓN DEL EQUIPO (MINUTOS)'])).filter(v => !isNaN(v))
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0
  }, [ali])

  const ultimoAli = useMemo(() => {
    if (!ali.length) return '-'
    const sorted = [...ali].sort((a, b) =>
      new Date(b['Marca temporal']) - new Date(a['Marca temporal']))
    return sorted[0]?.['Marca temporal']?.slice(0, 10) || '-'
  }, [ali])

  // ── Por mes ───────────────────────────────────────────────
  const porMes = useMemo(() => {
    const map = {}
    ali.forEach(r => {
      const m = parseMes(r['Marca temporal'])
      if (!m) return
      if (!map[m]) map[m] = { mes: m, total: 0, aprobado: 0, claro: 0, movistar: 0 }
      map[m].total++
      if (r['ESTADO FINAL'] === 'APROBADO') map[m].aprobado++
      if (r['OPERADOR SIM CARD'] === 'CLARO') map[m].claro++
      if (r['OPERADOR SIM CARD'] === 'MOVISTAR') map[m].movistar++
    })
    return Object.values(map).slice(-6)
  }, [ali])

  // ── Tecnología ────────────────────────────────────────────
  const porTecnologia = useMemo(() => {
    const map = {}
    ali.forEach(r => {
      const t = r['TIPO DE TECNOLOGÍA'] || 'Sin datos'
      map[t] = (map[t] || 0) + 1
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 9)
      .map(([name, value]) => ({ name, value }))
  }, [ali])

  // ── Operador SIM ──────────────────────────────────────────
  const porOperador = useMemo(() => {
    const map = {}
    ali.forEach(r => { const o = r['OPERADOR SIM CARD'] || 'N/A'; map[o] = (map[o] || 0) + 1 })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [ali])

  // ── Ciudad ────────────────────────────────────────────────
  const porCiudad = useMemo(() => {
    const map = {}
    ali.forEach(r => { const c = r['CIUDAD DONDE SE VA A INSTALAR'] || 'N/A'; map[c] = (map[c] || 0) + 1 })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([name, value]) => ({ name, value, pct: ((value / totalAli) * 100).toFixed(1) }))
  }, [ali, totalAli])

  // ── Cliente ───────────────────────────────────────────────
  const porCliente = useMemo(() => {
    const map = {}
    ali.forEach(r => { const c = r['NOMBRE CLIENTE'] || 'N/A'; map[c] = (map[c] || 0) + 1 })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 20)
      .map(([name, value]) => ({ name, value }))
  }, [ali])

  // ── Comercial ─────────────────────────────────────────────
  const porComercial = useMemo(() => {
    const map = {}
    ali.forEach(r => { const c = r['COMERCIAL ENCARGADO'] || 'N/A'; map[c] = (map[c] || 0) + 1 })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value, pct: ((value / totalAli) * 100).toFixed(1) }))
  }, [ali, totalAli])

  // ── Tasa aprobación por mes ───────────────────────────────
  const tasaAprobacion = useMemo(() => {
    return porMes.map(m => ({
      mes: m.mes,
      tasa: m.total ? +((m.aprobado / m.total) * 100).toFixed(1) : 0
    }))
  }, [porMes])

  // ── KPIs Trazabilidad ──────────────────────────────────────
  const kpiTraz = useMemo(() => {
    const completo  = traz.filter(r => r.estado_trazabilidad === 'COMPLETO').length
    const sinAli    = traz.filter(r => r.estado_trazabilidad === 'SIN ALISTAMIENTO').length
    const pendiente = traz.filter(r => r.estado_trazabilidad === 'PENDIENTE INSTALACIÓN').length
    const tardio    = traz.filter(r => r.estado_trazabilidad === 'REGISTRO TARDÍO').length
    const rojos     = traz.filter(r => r.nivel_alerta === 'ROJO').length
    const amarillos = traz.filter(r => r.nivel_alerta === 'AMARILLO').length
    return { completo, sinAli, pendiente, tardio, rojos, amarillos, total: traz.length }
  }, [traz])

  // ── Filtros trazabilidad ───────────────────────────────────
  const trazFiltrada = useMemo(() => {
    return traz.filter(r => {
      const okC = !filtroCliente   || (r.cliente || '').toLowerCase().includes(filtroCliente.toLowerCase())
      const okM = !filtroComercial || (r.comercial || '').toLowerCase().includes(filtroComercial.toLowerCase())
      const okA = !filtroAlerta    || r.nivel_alerta === filtroAlerta
      return okC && okM && okA
    })
  }, [traz, filtroCliente, filtroComercial, filtroAlerta])

  // ── Estados trazabilidad chart ─────────────────────────────
  const estadosTraz = useMemo(() => {
    const map = {}
    traz.forEach(r => { const e = r.estado_trazabilidad || 'N/A'; map[e] = (map[e] || 0) + 1 })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [traz])

  const COLORES_ESTADO = {
    'COMPLETO': C.green,
    'SIN ALISTAMIENTO': C.red,
    'PENDIENTE INSTALACIÓN': C.yellow,
    'REGISTRO TARDÍO': C.blue,
    'SOLO EN MOVIDESK': C.muted,
  }

  const PIE_COLORS = [C.cyan, C.blue, C.navy, C.cyanL, C.muted]

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: C.surface }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⬡</div>
        <p style={{ color: C.muted, fontSize: 14 }}>Cargando datos...</p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: C.surface }}>

      {/* HEADER */}
      <div style={{
        background: `linear-gradient(135deg, ${C.navy} 0%, #0D1B3E 100%)`,
        borderBottom: `1px solid ${C.border}`,
        padding: '0 32px',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 32, height: 32,
              background: `linear-gradient(135deg, ${C.cyan}, ${C.blue})`,
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 800, color: '#fff'
            }}>L</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>LAP Technologies</div>
              <div style={{ fontSize: 10, color: C.muted }}>Dirección de Operaciones & Productividad</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 4 }}>
            {[
              { key: 'alistamiento', label: 'Alistamiento' },
              { key: 'trazabilidad', label: 'Trazabilidad' },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                background: tab === t.key ? `rgba(0,180,216,0.15)` : 'transparent',
                border: tab === t.key ? `1px solid ${C.cyan}` : '1px solid transparent',
                color: tab === t.key ? C.cyan : C.muted,
                padding: '6px 16px', borderRadius: 8,
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.2s'
              }}>{t.label}</button>
            ))}
          </div>

          <div style={{ fontSize: 11, color: C.muted }}>
            Actualización: cada 2 horas · <span style={{ color: C.cyan }}>En vivo</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 32px' }}>

        {/* ═══════════════ TAB ALISTAMIENTO ═══════════════ */}
        {tab === 'alistamiento' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Sub-header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text }}>Alistamiento Preoperacional de Servicios I&M</h1>
                <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Responsable: Mc Gregory Suarez Quintero · Último: {ultimoAli}</p>
              </div>
            </div>

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
              <KPI label="Alistamientos Ejecutados" value={fmt(totalAli)} accent={C.cyan} />
              <KPI label="Aprobados" value={fmt(aprobados)} sub={pct(aprobados, totalAli)} accent={C.green} />
              <KPI label="Aprobación %" value={pct(aprobados, totalAli)} accent={C.green} />
              <KPI label="Reutilizados" value={fmt(reutilizados)} sub={pct(reutilizados, totalAli)} accent={C.yellow} />
              <KPI label="Tiempo Prom. (Min)" value={tiempoPromedio} accent={C.blue} />
            </div>

            {/* Row 1: Mes + Tecnología */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
              <Card>
                <SectionTitle>Cantidad de Alistamientos por Mes</SectionTitle>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={porMes} barSize={22}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                    <XAxis dataKey="mes" tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, color: C.muted }} />
                    <Bar dataKey="claro" name="CLARO" fill={C.cyan} radius={[4,4,0,0]} />
                    <Bar dataKey="movistar" name="MOVISTAR" fill={C.blue} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card>
                <SectionTitle>Tipo de Tecnología Alistada</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {porTecnologia.map((t, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: C.muted, width: 120, textAlign: 'right' }}>{t.name}</span>
                      <div style={{ flex: 1, height: 16, background: C.s3, borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{
                          width: `${(t.value / porTecnologia[0].value) * 100}%`,
                          height: '100%',
                          background: `linear-gradient(90deg, ${C.cyan}, ${C.blue})`,
                          borderRadius: 4,
                          transition: 'width 0.8s ease'
                        }} />
                      </div>
                      <span style={{ fontSize: 11, color: C.text, width: 30, textAlign: 'right', fontFamily: 'DM Mono' }}>{t.value}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Row 2: Operador + Ciudad + Condición */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: 16 }}>
              <Card>
                <SectionTitle>Empresa de Telefonía</SectionTitle>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={porOperador} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                      dataKey="value" nameKey="name">
                      {porOperador.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, color: C.muted }} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>

              <Card>
                <SectionTitle>Ciudad Donde Se Va a Instalar</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {porCiudad.map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 10, color: C.muted, width: 100, textAlign: 'right' }}>{c.name}</span>
                      <div style={{ flex: 1, height: 14, background: C.s3, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                          width: `${c.pct}%`, height: '100%',
                          background: `linear-gradient(90deg, ${C.blue}, ${C.cyan})`,
                          borderRadius: 3
                        }} />
                      </div>
                      <span style={{ fontSize: 10, color: C.muted, width: 40, fontFamily: 'DM Mono' }}>{c.pct}%</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <SectionTitle>Condición del Equipo</SectionTitle>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={[
                      { name: 'NUEVO', value: totalAli - reutilizados },
                      { name: 'USADO', value: reutilizados }
                    ]} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value">
                      <Cell fill={C.cyan} />
                      <Cell fill={C.blue} />
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, color: C.muted }} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Row 3: Clientes + Comercial */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
              <Card>
                <SectionTitle>Categorización Por Cliente</SectionTitle>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={porCliente} layout="horizontal" barSize={18}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: C.muted, fontSize: 9 }} axisLine={false} tickLine={false}
                      angle={-35} textAnchor="end" interval={0} height={60} />
                    <YAxis tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Alistamientos" fill={C.cyan} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card>
                <SectionTitle>Comercial Encargado</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {porComercial.map((c, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: C.text }}>{c.name}</span>
                        <span style={{ fontSize: 11, color: C.cyan, fontFamily: 'DM Mono' }}>{c.pct}%</span>
                      </div>
                      <div style={{ height: 6, background: C.s3, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                          width: `${c.pct}%`, height: '100%',
                          background: `linear-gradient(90deg, ${C.cyan}, ${C.blue})`,
                          borderRadius: 3
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Row 4: Tasa aprobación */}
            <Card>
              <SectionTitle>Tasa de Aprobación por Mes (%)</SectionTitle>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={tasaAprobacion} layout="vertical" barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} unit="%" />
                  <YAxis type="category" dataKey="mes" tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="tasa" name="Aprobación %" fill={C.green} radius={[0,4,4,0]}
                    label={{ position: 'right', fill: C.muted, fontSize: 10, formatter: v => v + '%' }} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

          </div>
        )}

        {/* ═══════════════ TAB TRAZABILIDAD ═══════════════ */}
        {tab === 'trazabilidad' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text }}>Trazabilidad de Alistamientos e Instalaciones</h1>
              <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Cruce Movidesk · Alistamientos · Servicios I&M</p>
            </div>

            {/* KPIs Trazabilidad */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14 }}>
              <KPI label="Total registros" value={fmt(kpiTraz.total)} accent={C.cyan} />
              <KPI label="Trazabilidad completa" value={fmt(kpiTraz.completo)} sub={pct(kpiTraz.completo, kpiTraz.total)} accent={C.green} />
              <KPI label="Sin alistamiento" value={fmt(kpiTraz.sinAli)} sub={pct(kpiTraz.sinAli, kpiTraz.total)} accent={C.red} />
              <KPI label="Pendiente instalación" value={fmt(kpiTraz.pendiente)} sub={pct(kpiTraz.pendiente, kpiTraz.total)} accent={C.yellow} />
              <KPI label="Alerta ROJA" value={fmt(kpiTraz.rojos)} accent={C.red} />
              <KPI label="Alerta AMARILLA" value={fmt(kpiTraz.amarillos)} accent={C.yellow} />
            </div>

            {/* Charts trazabilidad */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Card>
                <SectionTitle>Estado de Trazabilidad</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {estadosTraz.map((e, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: COLORES_ESTADO[e.name] || C.muted, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: C.muted, flex: 1 }}>{e.name}</span>
                      <div style={{ width: 120, height: 14, background: C.s3, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                          width: `${(e.value / kpiTraz.total) * 100}%`, height: '100%',
                          background: COLORES_ESTADO[e.name] || C.muted,
                          borderRadius: 3, opacity: 0.8
                        }} />
                      </div>
                      <span style={{ fontSize: 11, color: C.text, width: 36, textAlign: 'right', fontFamily: 'DM Mono' }}>{e.value}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <SectionTitle>Distribución por Nivel de Alerta</SectionTitle>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={[
                      { name: 'ROJO',     value: kpiTraz.rojos },
                      { name: 'AMARILLO', value: kpiTraz.amarillos },
                      { name: 'VERDE',    value: traz.filter(r => r.nivel_alerta === 'VERDE').length },
                      { name: 'GRIS',     value: traz.filter(r => r.nivel_alerta === 'GRIS').length },
                    ]} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value">
                      <Cell fill={C.red} />
                      <Cell fill={C.yellow} />
                      <Cell fill={C.green} />
                      <Cell fill={C.muted} />
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, color: C.muted }} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Filtros + Tabla */}
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <SectionTitle>Detalle de Trazabilidad</SectionTitle>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { placeholder: 'Filtrar cliente...', value: filtroCliente, setter: setFiltroCliente },
                    { placeholder: 'Filtrar comercial...', value: filtroComercial, setter: setFiltroComercial },
                  ].map((f, i) => (
                    <input key={i} placeholder={f.placeholder} value={f.value}
                      onChange={e => f.setter(e.target.value)}
                      style={{
                        background: C.s3, border: `1px solid ${C.border}`,
                        borderRadius: 6, padding: '6px 10px', fontSize: 11,
                        color: C.text, outline: 'none', width: 150
                      }} />
                  ))}
                  <select value={filtroAlerta} onChange={e => setFiltroAlerta(e.target.value)}
                    style={{
                      background: C.s3, border: `1px solid ${C.border}`,
                      borderRadius: 6, padding: '6px 10px', fontSize: 11,
                      color: C.text, outline: 'none'
                    }}>
                    <option value="">Todas las alertas</option>
                    <option value="ROJO">ROJO</option>
                    <option value="AMARILLO">AMARILLO</option>
                    <option value="VERDE">VERDE</option>
                    <option value="GRIS">GRIS</option>
                  </select>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                      {['Ticket','Placa','Cliente','Tecnología','Fecha Ali.','Fecha Inst.','Días','Estado','Alerta'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: C.muted, fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {trazFiltrada.slice(0, 100).map((r, i) => (
                      <tr key={i} style={{
                        borderBottom: `1px solid rgba(0,180,216,0.05)`,
                        background: i % 2 === 0 ? 'transparent' : 'rgba(0,180,216,0.02)',
                      }}>
                        <td style={{ padding: '7px 10px', color: C.cyan, fontFamily: 'DM Mono' }}>{r.ticket}</td>
                        <td style={{ padding: '7px 10px', color: C.text, fontFamily: 'DM Mono' }}>{r.placa}</td>
                        <td style={{ padding: '7px 10px', color: C.text, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.cliente}</td>
                        <td style={{ padding: '7px 10px', color: C.muted }}>{r.tecnologia}</td>
                        <td style={{ padding: '7px 10px', color: C.muted, fontFamily: 'DM Mono' }}>{r.fecha_alistamiento || '—'}</td>
                        <td style={{ padding: '7px 10px', color: C.muted, fontFamily: 'DM Mono' }}>{r.fecha_instalacion || '—'}</td>
                        <td style={{ padding: '7px 10px', color: C.text, fontFamily: 'DM Mono' }}>{r.dias_ali_inst || '—'}</td>
                        <td style={{ padding: '7px 10px', color: C.muted, fontSize: 10 }}>{r.estado_trazabilidad}</td>
                        <td style={{ padding: '7px 10px' }}><AlertBadge nivel={r.nivel_alerta} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {trazFiltrada.length > 100 && (
                  <p style={{ fontSize: 11, color: C.muted, padding: '10px', textAlign: 'center' }}>
                    Mostrando 100 de {trazFiltrada.length} registros
                  </p>
                )}
              </div>
            </Card>

          </div>
        )}
      </div>

      {/* FOOTER */}
      <div style={{
        borderTop: `1px solid ${C.border}`,
        padding: '16px 32px',
        textAlign: 'center',
        fontSize: 10,
        color: C.muted,
        marginTop: 24
      }}>
        LAP Technologies · Dirección de Operaciones & Productividad · Dashboard construido con React + Supabase
      </div>

    </div>
  )
}
