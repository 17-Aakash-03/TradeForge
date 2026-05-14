import { useEffect, useRef, useState } from 'react'
import { createChart, CandlestickSeries, HistogramSeries } from 'lightweight-charts'
import { stockAPI } from '../services/api'

export default function CandlestickChart({ ticker }) {
  const chartRef = useRef(null)
  const chartInstance = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [days, setDays] = useState(90)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    if (!ticker) return
    loadAndRender()
    return () => cleanup()
  }, [ticker, days])

  const cleanup = () => {
    if (chartInstance.current) {
      chartInstance.current.remove()
      chartInstance.current = null
    }
  }

  const loadAndRender = async () => {
    setLoading(true)
    setError('')
    cleanup()

    try {
      const res = await stockAPI.chartData(ticker, days)
      if (res.data.error) {
        setError(res.data.error)
        setLoading(false)
        return
      }

      const { candles, volumes } = res.data
      if (!candles || candles.length === 0) {
        setError('No chart data available')
        setLoading(false)
        return
      }

      const last = candles[candles.length - 1]
      const first = candles[0]
      const change = last.close - first.close
      const changePct = ((change / first.close) * 100).toFixed(2)
      setStats({
        current: last.close,
        change: change.toFixed(2),
        changePct,
        high: Math.max(...candles.map(c => c.high)).toFixed(2),
        low: Math.min(...candles.map(c => c.low)).toFixed(2),
        isPositive: change >= 0
      })

      setLoading(false)

      setTimeout(() => {
        if (!chartRef.current) return
        cleanup()

        const chart = createChart(chartRef.current, {
          width: chartRef.current.clientWidth || 800,
          height: 360,
          layout: {
            background: { color: '#0a0a0a' },
            textColor: '#888',
          },
          grid: {
            vertLines: { color: '#1a1a1a' },
            horzLines: { color: '#1a1a1a' },
          },
          rightPriceScale: { borderColor: '#2a2a2a' },
          timeScale: { borderColor: '#2a2a2a' },
        })

        chartInstance.current = chart

        const candleSeries = chart.addSeries(CandlestickSeries, {
          upColor: '#00d4aa',
          downColor: '#ff4444',
          borderUpColor: '#00d4aa',
          borderDownColor: '#ff4444',
          wickUpColor: '#00d4aa',
          wickDownColor: '#ff4444',
        })
        candleSeries.setData(candles)

        const volSeries = chart.addSeries(HistogramSeries, {
          color: '#00d4aa44',
          priceFormat: { type: 'volume' },
          priceScaleId: 'vol',
          scaleMargins: { top: 0.85, bottom: 0 },
        })
        volSeries.setData(volumes)

        chart.timeScale().fitContent()

        window.addEventListener('resize', () => {
          if (chartRef.current && chartInstance.current) {
            chartInstance.current.applyOptions({
              width: chartRef.current.clientWidth
            })
          }
        })
      }, 200)

    } catch(e) {
      setError('Failed to load: ' + e.message)
      setLoading(false)
    }
  }

  return (
    <div style={{background:'#111', borderRadius:'12px', border:'1px solid #1e1e1e', overflow:'hidden', marginBottom:'16px'}}>
      <div style={{padding:'16px 20px', borderBottom:'1px solid #1e1e1e'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'12px'}}>
          <div>
            <h3 style={{color:'#fff', fontSize:'15px', fontWeight:'600', marginBottom:'4px'}}>
              📊 {ticker} Candlestick Chart
            </h3>
            {stats && (
              <div style={{display:'flex', gap:'16px', alignItems:'center', flexWrap:'wrap'}}>
                <span style={{color:'#fff', fontSize:'18px', fontWeight:'700'}}>
                  ₹{Number(stats.current).toLocaleString()}
                </span>
                <span style={{color: stats.isPositive ? '#00d4aa' : '#ff4444', fontSize:'13px', fontWeight:'500'}}>
                  {stats.isPositive ? '+' : ''}{stats.change} ({stats.isPositive ? '+' : ''}{stats.changePct}%)
                </span>
                <span style={{color:'#555', fontSize:'11px'}}>H: {stats.high} · L: {stats.low}</span>
              </div>
            )}
          </div>
          <div style={{display:'flex', gap:'6px'}}>
            {[30, 90, 180, 365].map(d => (
              <button key={d} onClick={() => setDays(d)}
                style={{
                  padding:'4px 10px', borderRadius:'6px', fontSize:'11px',
                  fontWeight:'600', cursor:'pointer', border:'1px solid',
                  background: days === d ? '#00d4aa' : 'transparent',
                  color: days === d ? '#000' : '#555',
                  borderColor: days === d ? '#00d4aa' : '#2a2a2a'
                }}>
                {d === 30 ? '1M' : d === 90 ? '3M' : d === 180 ? '6M' : '1Y'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div style={{height:'360px', display:'flex', alignItems:'center', justifyContent:'center'}}>
          <p style={{color:'#555', fontSize:'13px'}}>⏳ Loading chart...</p>
        </div>
      )}

      {error && !loading && (
        <div style={{height:'200px', display:'flex', alignItems:'center', justifyContent:'center'}}>
          <p style={{color:'#ff4444', fontSize:'13px'}}>⚠️ {error}</p>
        </div>
      )}

      <div ref={chartRef} style={{
        width:'100%',
        display: loading || error ? 'none' : 'block'
      }} />
    </div>
  )
}