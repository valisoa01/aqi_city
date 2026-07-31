import React, { useEffect, useMemo, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell
} from 'recharts';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';

const COLORS = [
  '#4f8bf9', '#f9a94f', '#4ff9c1', '#f94f6b', '#c14ff9',
  '#f9e14f', '#4ff98b', '#f94fd1', '#8b4ff9'
];

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// Simple green -> yellow -> red interpolation based on aqi position in [min, max]
function aqiColor(value, min, max) {
  const t = max > min ? (value - min) / (max - min) : 0;
  const clamped = Math.max(0, Math.min(1, t));
  if (clamped < 0.5) {
    const p = clamped / 0.5;
    return `rgb(${Math.round(80 + p * 175)}, ${Math.round(200)}, ${Math.round(120 - p * 120)})`;
  }
  const p = (clamped - 0.5) / 0.5;
  return `rgb(${Math.round(255)}, ${Math.round(200 - p * 140)}, ${Math.round(0)})`;
}

export default function App() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [cityFilter, setCityFilter] = useState('all');

  useEffect(() => {
    fetch('/api/aqi')
      .then((r) => {
        if (!r.ok) throw new Error(`API error ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setRows(data);
        setStatus('ready');
      })
      .catch((e) => {
        setErrorMsg(e.message);
        setStatus('error');
      });
  }, []);

  const cities = useMemo(() => [...new Set(rows.map((r) => r.city))].sort(), [rows]);

  const filtered = useMemo(
    () => (cityFilter === 'all' ? rows : rows.filter((r) => r.city === cityFilter)),
    [rows, cityFilter]
  );

  const avg = (arr, key) => {
    const vals = arr.map((r) => Number(r[key])).filter((v) => !isNaN(v));
    if (!vals.length) return 0;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };

  const summary = useMemo(() => ({
    aqi: avg(filtered, 'aqi'),
    pm25: avg(filtered, 'pm25'),
    pm10: avg(filtered, 'pm10'),
    no2: avg(filtered, 'no2'),
  }), [filtered]);

  const cityTable = useMemo(() => {
    const byCity = {};
    for (const r of rows) {
      if (!byCity[r.city]) byCity[r.city] = [];
      byCity[r.city].push(r);
    }
    return Object.entries(byCity)
      .map(([city, arr]) => ({
        city,
        avgAqi: avg(arr, 'aqi'),
        country: arr[0].country,
        latitude: Number(arr[0].latitude),
        longitude: Number(arr[0].longitude),
      }))
      .sort((a, b) => a.avgAqi - b.avgAqi);
  }, [rows]);

  const aqiRange = useMemo(() => {
    const vals = cityTable.map((c) => c.avgAqi);
    return { min: Math.min(...vals), max: Math.max(...vals) };
  }, [cityTable]);

  const chartData = useMemo(() => {
    const byDay = {};
    for (const r of filtered) {
      const day = r.date;
      if (!byDay[day]) byDay[day] = { date: day };
      const key = r.city;
      if (!byDay[day][`${key}__sum`]) {
        byDay[day][`${key}__sum`] = 0;
        byDay[day][`${key}__count`] = 0;
      }
      byDay[day][`${key}__sum`] += Number(r.aqi) || 0;
      byDay[day][`${key}__count`] += 1;
    }
    return Object.values(byDay)
      .map((d) => {
        const out = { date: d.date };
        for (const k of Object.keys(d)) {
          if (k.endsWith('__sum')) {
            const city = k.replace('__sum', '');
            out[city] = d[`${city}__sum`] / d[`${city}__count`];
          }
        }
        return out;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filtered]);

  const histogramData = useMemo(() => {
    const vals = filtered.map((r) => Number(r.aqi)).filter((v) => !isNaN(v));
    if (!vals.length) return [];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const binCount = 12;
    const binWidth = (max - min) / binCount || 1;
    const bins = Array.from({ length: binCount }, (_, i) => ({
      range: `${(min + i * binWidth).toFixed(1)}–${(min + (i + 1) * binWidth).toFixed(1)}`,
      count: 0,
    }));
    for (const v of vals) {
      let idx = Math.floor((v - min) / binWidth);
      if (idx >= binCount) idx = binCount - 1;
      if (idx < 0) idx = 0;
      bins[idx].count += 1;
    }
    return bins;
  }, [filtered]);

  if (status === 'loading') return <div className="loading">Chargement des données AQI...</div>;
  if (status === 'error') {
    return (
      <div className="error">
        Erreur de chargement : {errorMsg}
        <br />
        Vérifiez que DATABASE_URL est bien configuré (voir README.md).
      </div>
    );
  }

  const chartCities = cityFilter === 'all' ? cities : [cityFilter];
  const mapCities = cityFilter === 'all' ? cityTable : cityTable.filter((c) => c.city === cityFilter);

  return (
    <div className="dashboard">
      <div className="header">
        <div>
          <h1>Suivi Qualité de l'Air — 9 villes</h1>
          <p>Données horaires, {rows.length.toLocaleString()} mesures</p>
        </div>
        <div className="filters">
          <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
            <option value="all">Toutes les villes</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="cards">
        <div className="card"><div className="label">AQI Moyen</div><div className="value">{summary.aqi.toFixed(2)}</div></div>
        <div className="card"><div className="label">PM2.5</div><div className="value">{summary.pm25.toFixed(1)}</div></div>
        <div className="card"><div className="label">PM10</div><div className="value">{summary.pm10.toFixed(1)}</div></div>
        <div className="card"><div className="label">NO2</div><div className="value">{summary.no2.toFixed(1)}</div></div>
      </div>

      <div className="panel">
        <h2>AQI moyen par ville (carte)</h2>
        <ComposableMap projectionConfig={{ scale: 140 }} style={{ width: '100%', height: '360px' }}>
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography key={geo.rsmKey} geography={geo} fill="#232739" stroke="#333852" strokeWidth={0.5} />
              ))
            }
          </Geographies>
          {mapCities.map((c) => (
            <Marker key={c.city} coordinates={[c.longitude, c.latitude]}>
              <circle
                r={8 + 10 * (aqiRange.max > aqiRange.min ? (c.avgAqi - aqiRange.min) / (aqiRange.max - aqiRange.min) : 0)}
                fill={aqiColor(c.avgAqi, aqiRange.min, aqiRange.max)}
                fillOpacity={0.75}
                stroke="#14161f"
                strokeWidth={1}
              />
              <text textAnchor="middle" y={-14} style={{ fontSize: 10, fill: '#eef0f6', fontFamily: 'inherit' }}>
                {c.city} ({c.avgAqi.toFixed(2)})
              </text>
            </Marker>
          ))}
        </ComposableMap>
      </div>

      <div className="panel">
        <h2>AQI moyen dans le temps par ville</h2>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2e42" />
            <XAxis dataKey="date" stroke="#9aa0b4" minTickGap={40} />
            <YAxis stroke="#9aa0b4" />
            <Tooltip contentStyle={{ background: '#1a1d2b', border: '1px solid #333852' }} />
            <Legend />
            {chartCities.map((city, i) => (
              <Line key={city} type="monotone" dataKey={city} stroke={COLORS[i % COLORS.length]} dot={false} strokeWidth={1.5} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid-2">
        <div className="panel">
          <h2>AQI moyen par ville (barres)</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={cityTable} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2e42" />
              <XAxis type="number" stroke="#9aa0b4" />
              <YAxis type="category" dataKey="city" stroke="#9aa0b4" width={90} />
              <Tooltip contentStyle={{ background: '#1a1d2b', border: '1px solid #333852' }} />
              <Bar dataKey="avgAqi">
                {cityTable.map((c) => <Cell key={c.city} fill={aqiColor(c.avgAqi, aqiRange.min, aqiRange.max)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel">
          <h2>Distribution des valeurs d'AQI {cityFilter !== 'all' ? `— ${cityFilter}` : ''}</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={histogramData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2e42" />
              <XAxis dataKey="range" stroke="#9aa0b4" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" height={60} />
              <YAxis stroke="#9aa0b4" />
              <Tooltip contentStyle={{ background: '#1a1d2b', border: '1px solid #333852' }} />
              <Bar dataKey="count" fill="#4f8bf9" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel">
        <h2>AQI moyen par ville (tableau)</h2>
        <table>
          <thead><tr><th>Ville</th><th>AQI moyen</th></tr></thead>
          <tbody>
            {cityTable.map((r) => <tr key={r.city}><td>{r.city}</td><td>{r.avgAqi.toFixed(2)}</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}