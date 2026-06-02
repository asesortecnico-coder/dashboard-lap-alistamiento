import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from './supabase'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, Legend
} from 'recharts'

const C = {
  navy:    '#1D2B5F', blue:    '#1E6FBF', cyan:    '#00B4D8',
  cyanL:   '#90E0EF', surface: '#F4F6FA', s2:      '#FFFFFF',
  s3:      '#E8EDF5', border:  'rgba(30,111,191,0.15)', text:    '#1A2B4A',
  muted:   '#5A7A9C', green:   '#10B981', yellow:  '#F59E0B', red: '#EF4444',
}

const fmt = n => (n ?? 0).toLocaleString('es-CO')
const pct = (a, b) => b ? ((a / b) * 100).toFixed(1) + ' %' : '0 %'

const MES_MAP = {
  '01':'Ene','02':'Feb','03':'Mar','04':'Abr','05':'May','06':'Jun',
  '07':'Jul','08':'Ago','09':'Sep','10':'Oct','11':'Nov','12':'Dic'
}

// Coordenadas de ciudades colombianas
const CIUDAD_COORDS = {
  'BOGOTA': [4.711, -74.0721], 'BOGOTÁ': [4.711, -74.0721],
  'MEDELLIN': [6.2442, -75.5812], 'MEDELLÍN': [6.2442, -75.5812],
  'CALI': [3.4516, -76.5320],
  'BARRANQUILLA': [10.9685, -74.7813],
  'CARTAGENA': [10.3910, -75.4794],
  'BUCARAMANGA': [7.1193, -73.1227],
  'CUCUTA': [7.8939, -72.5078], 'CÚCUTA': [7.8939, -72.5078],
  'MANIZALES': [5.0703, -75.5138],
  'PEREIRA': [4.8133, -75.6961],
  'IBAGUE': [4.4389, -75.2322], 'IBAGUÉ': [4.4389, -75.2322],
  'SANTA MARTA': [11.2408, -74.2110],
  'VILLAVICENCIO': [4.1420, -73.6266],
  'PASTO': [1.2136, -77.2811],
  'MONTERIA': [8.7575, -75.8851], 'MONTERÍA': [8.7575, -75.8851],
  'VALLEDUPAR': [10.4631, -73.2532],
  'NEIVA': [2.9273, -75.2819],
  'ARMENIA': [4.5339, -75.6811],
  'SINCELEJO': [9.3047, -75.3978],
  'POPAYAN': [2.4448, -76.6147], 'POPAYÁN': [2.4448, -76.6147],
  'URABA': [8.0999, -76.6561], 'URABÁ': [8.0999, -76.6561],
  'BOGOTA/CALI': [3.8, -75.5],
  'BUENAVENTURA': [3.8801, -77.0311],
  'TUNJA': [5.5353, -73.3678],
  'RIOHACHA': [11.5444, -72.9072],
  'QUIBDO': [5.6919, -76.6583], 'QUIBDÓ': [5.6919, -76.6583],
  'BUCARAMANGA/BOGOTA': [6.0, -73.7],
}

function parseMes(fecha) {
  if (!fecha) return null
  const str = String(fecha).trim()
  const [fechaParte] = str.split(' ')
  const partes = fechaParte.split('/')
  if (partes.length !== 3) return null
  const [d, m, y] = partes
  return `${MES_MAP[m.padStart(2,'0')] || m} ${y.slice(2)}`
}

function parseFechaNum(f) {
  if (!f) return 0
  const str = String(f).trim()
  const parts = str.split(' ')
  const dmY = parts[0].split('/')
  if (dmY.length !== 3) return 0
  const d = parseInt(dmY[0]), m = parseInt(dmY[1]), y = parseInt(dmY[2])
  const h = parts[1] ? parts[1].split(':') : [0,0,0]
  return y*100000000 + m*1000000 + d*10000 + parseInt(h[0]||0)*100 + parseInt(h[1]||0)
}

function parseFechaDate(f) {
  if (!f) return null
  const str = String(f).trim()
  const parts = str.split(' ')
  const dmY = parts[0].split('/')
  if (dmY.length !== 3) return null
  const [d, m, y] = dmY
  return new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`)
}

function KPI({ label, value, sub, accent = C.cyan }) {
  return (
    <div style={{ background: C.s2, border: `1px solid ${C.border}`, borderRadius: 12,
      padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 4,
      position: 'relative', overflow: 'hidden', boxShadow: '0 2px 8px rgba(30,111,191,0.08)' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${accent}, transparent)` }} />
      <span style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
      <span style={{ fontSize: 28, fontWeight: 700, color: C.text, lineHeight: 1 }}>{value}</span>
      {sub && <span style={{ fontSize: 11, color: C.muted }}>{sub}</span>}
    </div>
  )
}

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

function Card({ children, style = {} }) {
  return (
    <div style={{ background: C.s2, border: `1px solid ${C.border}`, borderRadius: 12,
      padding: '20px 20px 16px', boxShadow: '0 2px 8px rgba(30,111,191,0.08)', ...style }}>
      {children}
    </div>
  )
}

const inputStyle = {
  background: '#F4F6FA', border: `1px solid rgba(30,111,191,0.2)`,
  borderRadius: 7, padding: '6px 10px', fontSize: 11,
  color: '#1A2B4A', outline: 'none', width: '100%', boxSizing: 'border-box'
}

function FilterBar({ children, onClear, count, active }) {
  return (
    <Card style={{ padding: '14px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.navy, textTransform: 'uppercase', letterSpacing: 1 }}>
            🔍 Filtros
          </span>
          {active && (
            <span style={{ background: `rgba(0,180,216,0.12)`, color: C.cyan,
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
              {count} resultado{count !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button onClick={onClear} style={{ fontSize: 10, color: C.muted, background: 'none',
          border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}>
          Limpiar filtros
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, alignItems: 'end' }}>
        {children}
      </div>
    </Card>
  )
}

function FInput({ label, placeholder, value, setter }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: C.muted, marginBottom: 4, fontWeight: 600 }}>{label}</div>
      <input placeholder={placeholder} value={value} onChange={e => setter(e.target.value)} style={inputStyle} />
    </div>
  )
}

function FSelect({ label, value, setter, options, placeholder }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: C.muted, marginBottom: 4, fontWeight: 600 }}>{label}</div>
      <select value={value} onChange={e => setter(e.target.value)}
        style={{ ...inputStyle, color: value ? '#1A2B4A' : '#5A7A9C' }}>
        <option value="">{placeholder || 'Todos'}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function FDate({ label, value, setter }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: C.muted, marginBottom: 4, fontWeight: 600 }}>{label}</div>
      <input type="date" value={value} onChange={e => setter(e.target.value)} style={inputStyle} />
    </div>
  )
}

// Mapa con Leaflet cargado dinámicamente
function MapaCiudades({ datos }) {
  const mapId = 'mapa-alistamientos'

  useEffect(() => {
    // Cargar CSS de Leaflet
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'
      document.head.appendChild(link)
    }

    // Cargar JS de Leaflet
    const initMap = () => {
      const L = window.L
      const container = document.getElementById(mapId)
      if (!container || !L) return

      // Limpiar mapa anterior
      if (container._leaflet_id) {
        container._leaflet_id = null
        container.innerHTML = ''
      }

      const map = L.map(mapId, { zoomControl: true, scrollWheelZoom: false })
        .setView([4.5, -74.0], 5.5)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(map)

      const maxVal = Math.max(...datos.map(d => d.value), 1)

      datos.forEach(({ name, value }) => {
        const key = name.toUpperCase().trim()
        const coords = CIUDAD_COORDS[key]
        if (!coords) return

        const radio = 8 + (value / maxVal) * 28

        const circle = L.circleMarker(coords, {
          radius: radio,
          fillColor: '#00B4D8',
          color: '#1D2B5F',
          weight: 2,
          opacity: 0.9,
          fillOpacity: 0.7
        }).addTo(map)

        circle.bindPopup(`
          <div style="font-family:sans-serif;font-size:13px;min-width:120px">
            <b style="color:#1D2B5F">${name}</b><br/>
            <span style="color:#5A7A9C">Alistamientos:</span>
            <b style="color:#00B4D8">${value}</b>
          </div>
        `)
      })
    }

    if (window.L) {
      initMap()
    } else {
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'
      script.onload = initMap
      document.head.appendChild(script)
    }

    return () => {
      const container = document.getElementById(mapId)
      if (container) container.innerHTML = ''
    }
  }, [datos])

  return (
    <div id={mapId} style={{
      height: 380, borderRadius: 8, overflow: 'hidden',
      border: `1px solid ${C.border}`, zIndex: 0
    }} />
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: `1px solid ${C.border}`,
      borderRadius: 8, padding: '8px 12px', fontSize: 12, color: C.text,
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
      <p style={{ color: C.muted, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <b>{fmt(p.value)}</b></p>
      ))}
    </div>
  )
}

function AlertBadge({ nivel }) {
  const map = {
    ROJO:     { bg: 'rgba(239,68,68,0.12)',   color: '#DC2626' },
    AMARILLO: { bg: 'rgba(245,158,11,0.12)',  color: '#D97706' },
    VERDE:    { bg: 'rgba(16,185,129,0.12)',  color: '#059669' },
    GRIS:     { bg: 'rgba(107,114,128,0.12)', color: '#6B7280' },
  }
  const s = map[nivel] || map.GRIS
  return (
    <span style={{ background: s.bg, color: s.color,
      padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{nivel || 'GRIS'}</span>
  )
}

const LOGO = "https://kvmheirckuhngouanphl.supabase.co/storage/v1/object/public/Control%20de%20Alistamiento/Mesa%20de%20trabajo%202-8.png"

export default function App() {
  const [ali, setAli]   = useState([])
  const [traz, setTraz] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]   = useState('alistamiento')

  const [fAliCliente,    setFAliCliente]    = useState('')
  const [fAliPlaca,      setFAliPlaca]      = useState('')
  const [fAliTecnico,    setFAliTecnico]    = useState('')
  const [fAliTecnologia, setFAliTecnologia] = useState('')
  const [fAliCiudad,     setFAliCiudad]     = useState('')
  const [fAliComercial,  setFAliComercial]  = useState('')
  const [fAliEstado,     setFAliEstado]     = useState('')
  const [fAliDesde,      setFAliDesde]      = useState('')
  const [fAliHasta,      setFAliHasta]      = useState('')

  const [fTrazCliente,   setFTrazCliente]   = useState('')
  const [fTrazPlaca,     setFTrazPlaca]     = useState('')
  const [fTrazAlerta,    setFTrazAlerta]    = useState('')
  const [fTrazEstado,    setFTrazEstado]    = useState('')
  const [fTrazDesde,     setFTrazDesde]     = useState('')
  const [fTrazHasta,     setFTrazHasta]     = useState('')

  useEffect(() => {
    async function fetchAll(table) {
      let all = [], from = 0
      const PAGE = 1000
      while (true) {
        const { data, error } = await supabase.from(table).select('*').range(from, from+PAGE-1)
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
      setAli(a); setTraz(t); setLoading(false)
    }
    load()
  }, [])

  const opTecnologia = useMemo(() => [...new Set(ali.map(r => r['TIPO DE TECNOLOGÍA']).filter(Boolean))].sort(), [ali])
  const opCiudad     = useMemo(() => [...new Set(ali.map(r => r['CIUDAD DONDE SE VA A INSTALAR']).filter(Boolean))].sort(), [ali])
  const opComercial  = useMemo(() => [...new Set(ali.map(r => r['COMERCIAL ENCARGADO']).filter(Boolean))].sort(), [ali])
  const opTecnico    = useMemo(() => [...new Set(ali.map(r => r['RESPONSABLE']).filter(Boolean))].sort(), [ali])
  const opEstadoAli  = useMemo(() => [...new Set(ali.map(r => r['ESTADO FINAL']).filter(Boolean))].sort(), [ali])
  const opEstadoTraz = useMemo(() => [...new Set(traz.map(r => r.estado_trazabilidad).filter(Boolean))].sort(), [traz])

  const aliFiltrada = useMemo(() => {
    return ali.filter(r => {
      const fecha = parseFechaDate(r['Marca temporal'])
      const desde = fAliDesde ? new Date(fAliDesde) : null
      const hasta = fAliHasta ? new Date(fAliHasta) : null
      return (
        (!fAliCliente    || (r['NOMBRE CLIENTE']||'').toLowerCase().includes(fAliCliente.toLowerCase())) &&
        (!fAliPlaca      || (r['IDENTIFICACIÓN DEL ACTIVO (PLACA)']||'').toLowerCase().includes(fAliPlaca.toLowerCase())) &&
        (!fAliTecnico    || r['RESPONSABLE'] === fAliTecnico) &&
        (!fAliTecnologia || r['TIPO DE TECNOLOGÍA'] === fAliTecnologia) &&
        (!fAliCiudad     || r['CIUDAD DONDE SE VA A INSTALAR'] === fAliCiudad) &&
        (!fAliComercial  || r['COMERCIAL ENCARGADO'] === fAliComercial) &&
        (!fAliEstado     || r['ESTADO FINAL'] === fAliEstado) &&
        (!desde || !fecha || fecha >= desde) &&
        (!hasta || !fecha || fecha <= hasta)
      )
    })
  }, [ali, fAliCliente, fAliPlaca, fAliTecnico, fAliTecnologia, fAliCiudad, fAliComercial, fAliEstado, fAliDesde, fAliHasta])

  const aliActive = !!(fAliCliente||fAliPlaca||fAliTecnico||fAliTecnologia||fAliCiudad||fAliComercial||fAliEstado||fAliDesde||fAliHasta)

  const totalAli     = aliFiltrada.length
  const aprobados    = aliFiltrada.filter(r => r['ESTADO FINAL'] === 'APROBADO').length
  const reutilizados = aliFiltrada.filter(r => r['CONDICIÓN DEL EQUIPO'] === 'USADO').length

  const tiempoPromedio = useMemo(() => {
    const vals = aliFiltrada.map(r => parseFloat(r['TIEMPO EMPLEADO EN LA CONFIGURACIÓN DEL EQUIPO (MINUTOS)'])).filter(v => !isNaN(v))
    return vals.length ? Math.round(vals.reduce((a,b) => a+b, 0) / vals.length) : 0
  }, [aliFiltrada])

  const ultimoAli = useMemo(() => {
    if (!ali.length) return '-'
    const mejor = ali.reduce((max, r) =>
      parseFechaNum(r['Marca temporal']) > parseFechaNum(max['Marca temporal']) ? r : max, ali[0])
    const f = String(mejor['Marca temporal'] || '').trim().split(' ')[0].split('/')
    if (f.length !== 3) return '-'
    return `${f[0].padStart(2,'0')}/${f[1].padStart(2,'0')}/${f[2]}`
  }, [ali])

  const porMes = useMemo(() => {
    const map = {}
    aliFiltrada.forEach(r => {
      const m = parseMes(r['Marca temporal'])
      if (!m) return
      if (!map[m]) map[m] = { mes: m, total: 0, aprobado: 0, claro: 0, movistar: 0 }
      map[m].total++
      if (r['ESTADO FINAL'] === 'APROBADO') map[m].aprobado++
      if (r['OPERADOR SIM CARD'] === 'CLARO') map[m].claro++
      if (r['OPERADOR SIM CARD'] === 'MOVISTAR') map[m].movistar++
    })
    return Object.values(map).slice(-6)
  }, [aliFiltrada])

  const porTecnologia = useMemo(() => {
    const map = {}
    aliFiltrada.forEach(r => { const t = r['TIPO DE TECNOLOGÍA']||'Sin datos'; map[t]=(map[t]||0)+1 })
    return Object.entries(map).sort((a,b) => b[1]-a[1]).slice(0,9).map(([name,value]) => ({name,value}))
  }, [aliFiltrada])

  const porOperador = useMemo(() => {
    const map = {}
    aliFiltrada.forEach(r => { const o = r['OPERADOR SIM CARD']||'N/A'; map[o]=(map[o]||0)+1 })
    return Object.entries(map).map(([name,value]) => ({name,value}))
  }, [aliFiltrada])

  const porCiudad = useMemo(() => {
    const map = {}
    aliFiltrada.forEach(r => { const c = r['CIUDAD DONDE SE VA A INSTALAR']||'N/A'; map[c]=(map[c]||0)+1 })
    return Object.entries(map).sort((a,b) => b[1]-a[1]).slice(0,10)
      .map(([name,value]) => ({name,value,pct:totalAli?((value/totalAli)*100).toFixed(1):'0'}))
  }, [aliFiltrada, totalAli])

  // Top 10 clientes para barras horizontales
  const porCliente = useMemo(() => {
    const map = {}
    aliFiltrada.forEach(r => { const c = r['NOMBRE CLIENTE']||'N/A'; map[c]=(map[c]||0)+1 })
    return Object.entries(map).sort((a,b) => b[1]-a[1]).slice(0,10)
      .map(([name,value]) => ({name,value,pct:totalAli?((value/totalAli)*100).toFixed(1):'0'}))
  }, [aliFiltrada, totalAli])

  const porComercial = useMemo(() => {
    const map = {}
    aliFiltrada.forEach(r => { const c = r['COMERCIAL ENCARGADO']||'N/A'; map[c]=(map[c]||0)+1 })
    return Object.entries(map).sort((a,b) => b[1]-a[1])
      .map(([name,value]) => ({name,value,pct:totalAli?((value/totalAli)*100).toFixed(1):'0'}))
  }, [aliFiltrada, totalAli])

  // Datos para mapa (todas las ciudades con coords)
  const datosMapa = useMemo(() => {
    const map = {}
    aliFiltrada.forEach(r => {
      const c = (r['CIUDAD DONDE SE VA A INSTALAR']||'').trim()
      if (c) map[c] = (map[c]||0)+1
    })
    return Object.entries(map)
      .filter(([name]) => CIUDAD_COORDS[name.toUpperCase().trim()])
      .sort((a,b) => b[1]-a[1])
      .map(([name,value]) => ({name,value}))
  }, [aliFiltrada])

  const trazFiltrada = useMemo(() => {
    return traz.filter(r => {
      const desde = fTrazDesde ? new Date(fTrazDesde) : null
      const hasta = fTrazHasta ? new Date(fTrazHasta) : null
      const fecha = r.fecha_alistamiento ? new Date(r.fecha_alistamiento) : null
      return (
        (!fTrazCliente || (r.cliente||'').toLowerCase().includes(fTrazCliente.toLowerCase())) &&
        (!fTrazPlaca   || (r.placa||'').toLowerCase().includes(fTrazPlaca.toLowerCase())) &&
        (!fTrazAlerta  || r.nivel_alerta === fTrazAlerta) &&
        (!fTrazEstado  || r.estado_trazabilidad === fTrazEstado) &&
        (!desde || !fecha || fecha >= desde) &&
        (!hasta || !fecha || fecha <= hasta)
      )
    })
  }, [traz, fTrazCliente, fTrazPlaca, fTrazAlerta, fTrazEstado, fTrazDesde, fTrazHasta])

  const trazActive = !!(fTrazCliente||fTrazPlaca||fTrazAlerta||fTrazEstado||fTrazDesde||fTrazHasta)

  const kpiTraz = useMemo(() => {
    const completo  = trazFiltrada.filter(r => r.estado_trazabilidad === 'COMPLETO').length
    const sinAli    = trazFiltrada.filter(r => r.estado_trazabilidad === 'SIN ALISTAMIENTO').length
    const pendiente = trazFiltrada.filter(r => r.estado_trazabilidad === 'PENDIENTE INSTALACIÓN').length
    const rojos     = trazFiltrada.filter(r => r.nivel_alerta === 'ROJO').length
    const amarillos = trazFiltrada.filter(r => r.nivel_alerta === 'AMARILLO').length
    return { completo, sinAli, pendiente, rojos, amarillos, total: trazFiltrada.length }
  }, [trazFiltrada])

  const estadosTraz = useMemo(() => {
    const map = {}
    trazFiltrada.forEach(r => { const e = r.estado_trazabilidad||'N/A'; map[e]=(map[e]||0)+1 })
    return Object.entries(map).map(([name,value]) => ({name,value}))
  }, [trazFiltrada])

  const COLORES_ESTADO = {
    'COMPLETO': C.green, 'SIN ALISTAMIENTO': C.red,
    'PENDIENTE INSTALACIÓN': C.yellow, 'REGISTRO TARDÍO': C.blue,
  }
  const PIE_COLORS = [C.cyan, C.blue, C.navy, C.cyanL, C.muted]

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:C.surface }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:32, marginBottom:12 }}>⬡</div>
        <p style={{ color:C.muted, fontSize:14 }}>Cargando datos...</p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:C.surface }}>
      <div style={{ background:'#FFFFFF', borderBottom:`1px solid ${C.border}`,
        padding:'0 32px', position:'sticky', top:0, zIndex:1000,
        boxShadow:'0 2px 8px rgba(30,111,191,0.08)' }}>
        <div style={{ maxWidth:1400, margin:'0 auto', display:'flex', alignItems:'center',
          justifyContent:'space-between', height:64 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <img src={LOGO} alt="LAP Technologies" style={{ height:42, width:'auto', objectFit:'contain' }} />
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>LAP Technologies</div>
              <div style={{ fontSize:10, color:C.muted }}>Dirección de Operaciones & Productividad</div>
            </div>
          </div>
          <div style={{ display:'flex', gap:4 }}>
            {[{key:'alistamiento',label:'Alistamiento'},{key:'trazabilidad',label:'Trazabilidad'}].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                background: tab===t.key ? 'rgba(0,180,216,0.1)' : 'transparent',
                border: tab===t.key ? `1px solid ${C.cyan}` : `1px solid ${C.border}`,
                color: tab===t.key ? C.cyan : C.muted,
                padding:'7px 18px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer'
              }}>{t.label}</button>
            ))}
          </div>
          <div style={{ fontSize:11, color:C.muted }}>
            Actualización: cada 2 horas · <span style={{ color:C.cyan }}>En vivo</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1400, margin:'0 auto', padding:'28px 32px' }}>

        {tab === 'alistamiento' && (
          <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
            <div>
              <h1 style={{ fontSize:20, fontWeight:700, color:C.navy }}>Alistamiento Preoperacional de Servicios I&M</h1>
              <p style={{ fontSize:12, color:C.muted, marginTop:2 }}>Responsable: María Jesus Correa Peinado · Último: {ultimoAli}</p>
            </div>

            <FilterBar
              onClear={() => { setFAliCliente(''); setFAliPlaca(''); setFAliTecnico('');
                setFAliTecnologia(''); setFAliCiudad(''); setFAliComercial('');
                setFAliEstado(''); setFAliDesde(''); setFAliHasta('') }}
              count={aliFiltrada.length} active={aliActive}>
              <FInput    label="Cliente"       placeholder="Buscar cliente..."  value={fAliCliente}    setter={setFAliCliente} />
              <FInput    label="Placa"         placeholder="Buscar placa..."    value={fAliPlaca}      setter={setFAliPlaca} />
              <FSelect   label="Responsable"   value={fAliTecnico}    setter={setFAliTecnico}    options={opTecnico}    placeholder="Todos" />
              <FSelect   label="Tecnología"    value={fAliTecnologia} setter={setFAliTecnologia} options={opTecnologia} placeholder="Todas" />
              <FSelect   label="Ciudad"        value={fAliCiudad}     setter={setFAliCiudad}     options={opCiudad}     placeholder="Todas" />
              <FSelect   label="Comercial"     value={fAliComercial}  setter={setFAliComercial}  options={opComercial}  placeholder="Todos" />
              <FSelect   label="Estado"        value={fAliEstado}     setter={setFAliEstado}     options={opEstadoAli}  placeholder="Todos" />
              <FDate     label="Desde"         value={fAliDesde}      setter={setFAliDesde} />
              <FDate     label="Hasta"         value={fAliHasta}      setter={setFAliHasta} />
            </FilterBar>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:14 }}>
              <KPI label="Alistamientos" value={fmt(totalAli)} accent={C.cyan} />
              <KPI label="Aprobados" value={fmt(aprobados)} sub={pct(aprobados,totalAli)} accent={C.green} />
              <KPI label="Aprobación %" value={pct(aprobados,totalAli)} accent={C.green} />
              <KPI label="Reutilizados" value={fmt(reutilizados)} sub={pct(reutilizados,totalAli)} accent={C.yellow} />
              <KPI label="Tiempo Prom. (Min)" value={tiempoPromedio} accent={C.blue} />
            </div>

            {/* Mes + Tecnología */}
            <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:16 }}>
              <Card>
                <SectionTitle>Cantidad de Alistamientos por Mes</SectionTitle>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={porMes} barSize={22}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                    <XAxis dataKey="mes" tick={{ fill:C.muted, fontSize:11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill:C.muted, fontSize:11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize:11, color:C.muted }} />
                    <Bar dataKey="claro" name="CLARO" fill={C.cyan} radius={[4,4,0,0]} />
                    <Bar dataKey="movistar" name="MOVISTAR" fill={C.blue} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card>
                <SectionTitle>Tipo de Tecnología Alistada</SectionTitle>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {porTecnologia.map((t,i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:11, color:C.muted, width:120, textAlign:'right' }}>{t.name}</span>
                      <div style={{ flex:1, height:16, background:C.s3, borderRadius:4, overflow:'hidden' }}>
                        <div style={{ width:`${porTecnologia[0].value?(t.value/porTecnologia[0].value)*100:0}%`,
                          height:'100%', background:`linear-gradient(90deg, ${C.cyan}, ${C.blue})`, borderRadius:4 }} />
                      </div>
                      <span style={{ fontSize:11, color:C.text, width:30, textAlign:'right' }}>{t.value}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Operador + Ciudad + Condición */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1.5fr 1fr', gap:16 }}>
              <Card>
                <SectionTitle>Empresa de Telefonía</SectionTitle>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={porOperador} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" nameKey="name">
                      {porOperador.map((_,i) => <Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize:11, color:C.muted }} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
              <Card>
                <SectionTitle>Ciudad Donde Se Va a Instalar</SectionTitle>
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  {porCiudad.map((c,i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:10, color:C.muted, width:100, textAlign:'right' }}>{c.name}</span>
                      <div style={{ flex:1, height:14, background:C.s3, borderRadius:3, overflow:'hidden' }}>
                        <div style={{ width:`${c.pct}%`, height:'100%',
                          background:`linear-gradient(90deg, ${C.blue}, ${C.cyan})`, borderRadius:3 }} />
                      </div>
                      <span style={{ fontSize:10, color:C.muted, width:40 }}>{c.pct}%</span>
                    </div>
                  ))}
                </div>
              </Card>
              <Card>
                <SectionTitle>Condición del Equipo</SectionTitle>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={[{name:'NUEVO',value:totalAli-reutilizados},{name:'USADO',value:reutilizados}]}
                      cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value">
                      <Cell fill={C.cyan} /><Cell fill={C.blue} />
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize:11, color:C.muted }} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Mapa + Distribución Clientes */}
            <div style={{ display:'grid', gridTemplateColumns:'1.3fr 1fr', gap:16 }}>
              <Card>
                <SectionTitle>Distribución Geográfica de Alistamientos</SectionTitle>
                <MapaCiudades datos={datosMapa} />
                <p style={{ fontSize:10, color:C.muted, marginTop:8, textAlign:'center' }}>
                  El tamaño del punto es proporcional a la cantidad de alistamientos por ciudad
                </p>
              </Card>
              <Card>
                <SectionTitle>Top 10 Clientes con Más Alistamientos</SectionTitle>
                <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:4 }}>
                  {porCliente.map((c,i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:10, color:C.muted, width:22, textAlign:'right', fontWeight:700 }}>
                        {i+1}.
                      </span>
                      <span style={{ fontSize:10, color:C.text, width:140, overflow:'hidden',
                        textOverflow:'ellipsis', whiteSpace:'nowrap', flexShrink:0 }}>{c.name}</span>
                      <div style={{ flex:1, height:18, background:C.s3, borderRadius:4, overflow:'hidden' }}>
                        <div style={{
                          width:`${porCliente[0].value?(c.value/porCliente[0].value)*100:0}%`,
                          height:'100%',
                          background: i===0
                            ? `linear-gradient(90deg, ${C.cyan}, ${C.blue})`
                            : i < 3
                            ? `linear-gradient(90deg, ${C.blue}, #3b82f6)`
                            : `linear-gradient(90deg, #3b82f6, ${C.cyanL})`,
                          borderRadius:4
                        }} />
                      </div>
                      <span style={{ fontSize:11, color:C.navy, fontWeight:700, width:28, textAlign:'right' }}>
                        {c.value}
                      </span>
                      <span style={{ fontSize:10, color:C.muted, width:38, textAlign:'right' }}>
                        {c.pct}%
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Comercial */}
            <Card>
              <SectionTitle>Comercial Encargado</SectionTitle>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {porComercial.map((c,i) => (
                  <div key={i}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:11, color:C.text }}>{c.name}</span>
                      <span style={{ fontSize:11, color:C.blue, fontWeight:600 }}>{c.value} · {c.pct}%</span>
                    </div>
                    <div style={{ height:6, background:C.s3, borderRadius:3, overflow:'hidden' }}>
                      <div style={{ width:`${c.pct}%`, height:'100%',
                        background:`linear-gradient(90deg, ${C.cyan}, ${C.blue})`, borderRadius:3 }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Tabla detalle */}
            <Card>
              <SectionTitle>Detalle de Alistamientos</SectionTitle>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                  <thead>
                    <tr style={{ borderBottom:`2px solid ${C.border}` }}>
                      {['Fecha','Cliente','Placa','Responsable','Tecnología','Ciudad','Comercial','Estado'].map(h => (
                        <th key={h} style={{ padding:'10px', textAlign:'left', color:C.navy, fontWeight:700, whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {aliFiltrada.slice(0,100).map((r,i) => (
                      <tr key={i} style={{ borderBottom:`1px solid ${C.border}`,
                        background: i%2===0 ? '#FFFFFF' : '#F8FAFC' }}>
                        <td style={{ padding:'7px 10px', color:C.muted }}>{String(r['Marca temporal']||'').split(' ')[0]}</td>
                        <td style={{ padding:'7px 10px', color:C.text, maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r['NOMBRE CLIENTE']}</td>
                        <td style={{ padding:'7px 10px', color:C.blue, fontWeight:600 }}>{r['IDENTIFICACIÓN DEL ACTIVO (PLACA)']}</td>
                        <td style={{ padding:'7px 10px', color:C.muted }}>{r['RESPONSABLE']}</td>
                        <td style={{ padding:'7px 10px', color:C.muted }}>{r['TIPO DE TECNOLOGÍA']}</td>
                        <td style={{ padding:'7px 10px', color:C.muted }}>{r['CIUDAD DONDE SE VA A INSTALAR']}</td>
                        <td style={{ padding:'7px 10px', color:C.muted }}>{r['COMERCIAL ENCARGADO']}</td>
                        <td style={{ padding:'7px 10px' }}>
                          <span style={{
                            background: r['ESTADO FINAL']==='APROBADO' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                            color: r['ESTADO FINAL']==='APROBADO' ? '#059669' : '#DC2626',
                            padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:700
                          }}>{r['ESTADO FINAL']}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {aliFiltrada.length > 100 && (
                  <p style={{ fontSize:11, color:C.muted, padding:'10px', textAlign:'center' }}>
                    Mostrando 100 de {aliFiltrada.length} registros
                  </p>
                )}
              </div>
            </Card>
          </div>
        )}

        {tab === 'trazabilidad' && (
          <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
            <div>
              <h1 style={{ fontSize:20, fontWeight:700, color:C.navy }}>Trazabilidad de Alistamientos e Instalaciones</h1>
              <p style={{ fontSize:12, color:C.muted, marginTop:2 }}>Cruce Movidesk · Alistamientos · Servicios I&M</p>
            </div>

            <FilterBar
              onClear={() => { setFTrazCliente(''); setFTrazPlaca('');
                setFTrazAlerta(''); setFTrazEstado(''); setFTrazDesde(''); setFTrazHasta('') }}
              count={trazFiltrada.length} active={trazActive}>
              <FInput  label="Cliente"  placeholder="Buscar cliente..." value={fTrazCliente} setter={setFTrazCliente} />
              <FInput  label="Placa"    placeholder="Buscar placa..."   value={fTrazPlaca}   setter={setFTrazPlaca} />
              <FSelect label="Alerta"   value={fTrazAlerta} setter={setFTrazAlerta}
                options={['ROJO','AMARILLO','VERDE','GRIS']} placeholder="Todas" />
              <FSelect label="Estado"   value={fTrazEstado} setter={setFTrazEstado}
                options={opEstadoTraz} placeholder="Todos" />
              <FDate   label="Desde"    value={fTrazDesde}  setter={setFTrazDesde} />
              <FDate   label="Hasta"    value={fTrazHasta}  setter={setFTrazHasta} />
            </FilterBar>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap:14 }}>
              <KPI label="Total registros" value={fmt(kpiTraz.total)} accent={C.cyan} />
              <KPI label="Trazabilidad completa" value={fmt(kpiTraz.completo)} sub={pct(kpiTraz.completo,kpiTraz.total)} accent={C.green} />
              <KPI label="Sin alistamiento" value={fmt(kpiTraz.sinAli)} sub={pct(kpiTraz.sinAli,kpiTraz.total)} accent={C.red} />
              <KPI label="Pendiente instalación" value={fmt(kpiTraz.pendiente)} sub={pct(kpiTraz.pendiente,kpiTraz.total)} accent={C.yellow} />
              <KPI label="Alerta ROJA" value={fmt(kpiTraz.rojos)} accent={C.red} />
              <KPI label="Alerta AMARILLA" value={fmt(kpiTraz.amarillos)} accent={C.yellow} />
            </div>

{/* Top clientes trazabilidad */}
            <Card>
              <SectionTitle>Top 10 Clientes con Más Registros</SectionTitle>
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:4 }}>
                {useMemo(() => {
                  const map = {}
                  trazFiltrada.forEach(r => { const c = r.cliente||'N/A'; map[c]=(map[c]||0)+1 })
                  return Object.entries(map).sort((a,b) => b[1]-a[1]).slice(0,10)
                    .map(([name,value],i) => ({name,value,pct:kpiTraz.total?((value/kpiTraz.total)*100).toFixed(1):'0',i}))
                }, [trazFiltrada,kpiTraz]).map((c,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:10, color:C.muted, width:22, textAlign:'right', fontWeight:700 }}>{i+1}.</span>
                    <span style={{ fontSize:10, color:C.text, width:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flexShrink:0 }}>{c.name}</span>
                    <div style={{ flex:1, height:18, background:C.s3, borderRadius:4, overflow:'hidden' }}>
                      <div style={{ width:`${c.pct}%`, height:'100%', background:`linear-gradient(90deg, ${C.cyan}, ${C.blue})`, borderRadius:4 }} />
                    </div>
                    <span style={{ fontSize:11, color:C.navy, fontWeight:700, width:28, textAlign:'right' }}>{c.value}</span>
                    <span style={{ fontSize:10, color:C.muted, width:38, textAlign:'right' }}>{c.pct}%</span>
                  </div>
                ))}
              </div>
            </Card>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <Card>
                <SectionTitle>Estado de Trazabilidad</SectionTitle>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {estadosTraz.map((e,i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:10, height:10, borderRadius:2, background:COLORES_ESTADO[e.name]||C.muted, flexShrink:0 }} />
                      <span style={{ fontSize:11, color:C.muted, flex:1 }}>{e.name}</span>
                      <div style={{ width:120, height:14, background:C.s3, borderRadius:3, overflow:'hidden' }}>
                        <div style={{ width:`${kpiTraz.total?(e.value/kpiTraz.total)*100:0}%`, height:'100%',
                          background:COLORES_ESTADO[e.name]||C.muted, borderRadius:3, opacity:0.8 }} />
                      </div>
                      <span style={{ fontSize:11, color:C.text, width:36, textAlign:'right', fontWeight:600 }}>{e.value}</span>
                    </div>
                  ))}
                </div>
              </Card>
              <Card>
                <SectionTitle>Distribución por Nivel de Alerta</SectionTitle>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={[
                      {name:'ROJO',    value:kpiTraz.rojos},
                      {name:'AMARILLO',value:kpiTraz.amarillos},
                      {name:'VERDE',   value:trazFiltrada.filter(r=>r.nivel_alerta==='VERDE').length},
                      {name:'GRIS',    value:trazFiltrada.filter(r=>r.nivel_alerta==='GRIS').length},
                    ]} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value">
                      <Cell fill={C.red}/><Cell fill={C.yellow}/><Cell fill={C.green}/><Cell fill={C.muted}/>
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize:11, color:C.muted }} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </div>

            <Card>
              <SectionTitle>Detalle de Trazabilidad</SectionTitle>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                  <thead>
                    <tr style={{ borderBottom:`2px solid ${C.border}` }}>
                      {['Ticket','Placa','Cliente','Tecnología','Fecha Ali.','Fecha Inst.','Días','Estado','Alerta'].map(h => (
                        <th key={h} style={{ padding:'10px', textAlign:'left', color:C.navy, fontWeight:700, whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {trazFiltrada.slice(0,100).map((r,i) => (
                      <tr key={i} style={{ borderBottom:`1px solid ${C.border}`,
                        background: i%2===0 ? '#FFFFFF' : '#F8FAFC' }}>
                        <td style={{ padding:'7px 10px', color:C.blue, fontWeight:600 }}>{r.ticket}</td>
                        <td style={{ padding:'7px 10px', color:C.text }}>{r.placa}</td>
                        <td style={{ padding:'7px 10px', color:C.text, maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.cliente}</td>
                        <td style={{ padding:'7px 10px', color:C.muted }}>{r.tecnologia}</td>
                        <td style={{ padding:'7px 10px', color:C.muted }}>{r.fecha_alistamiento||'—'}</td>
                        <td style={{ padding:'7px 10px', color:C.muted }}>{r.fecha_instalacion||'—'}</td>
                        <td style={{ padding:'7px 10px', color:C.text, fontWeight:600 }}>{r.dias_ali_inst||'—'}</td>
                        <td style={{ padding:'7px 10px', color:C.muted, fontSize:10 }}>{r.estado_trazabilidad}</td>
                        <td style={{ padding:'7px 10px' }}><AlertBadge nivel={r.nivel_alerta} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {trazFiltrada.length > 100 && (
                  <p style={{ fontSize:11, color:C.muted, padding:'10px', textAlign:'center' }}>
                    Mostrando 100 de {trazFiltrada.length} registros
                  </p>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>

      <div style={{ borderTop:`1px solid ${C.border}`, padding:'16px 32px',
        textAlign:'center', fontSize:10, color:C.muted, marginTop:24, background:'#fff' }}>
        LAP Technologies · Dirección de Operaciones & Productividad
      </div>
    </div>
  )
}
