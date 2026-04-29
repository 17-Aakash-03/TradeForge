import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { stockAPI } from '../services/api'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'

const STOCKS = [
  { group: 'Indian Stocks (NSE)', options: [
    { label: 'Reliance Industries', value: 'RELIANCE.NS' },
    { label: 'TCS', value: 'TCS.NS' },
    { label: 'Infosys', value: 'INFY.NS' },
    { label: 'HDFC Bank', value: 'HDFCBANK.NS' },
    { label: 'ICICI Bank', value: 'ICICIBANK.NS' },
    { label: 'Wipro', value: 'WIPRO.NS' },
    { label: 'Tata Motors', value: 'TATAMOTORS.NS' },
    { label: 'Adani Enterprises', value: 'ADANIENT.NS' },
    { label: 'Bajaj Finance', value: 'BAJFINANCE.NS' },
    { label: 'ITC', value: 'ITC.NS' },
  ]},
  { group: 'US Stocks', options: [
    { label: 'Apple', value: 'AAPL' },
    { label: 'Google', value: 'GOOGL' },
    { label: 'Microsoft', value: 'MSFT' },
    { label: 'Tesla', value: 'TSLA' },
    { label: 'Amazon', value: 'AMZN' },
  ]},
  { group: 'Crypto', options: [
    { label: 'Bitcoin', value: 'BTC-USD' },
    { label: 'Ethereum', value: 'ETH-USD' },
  ]},
  { group: 'Indices', options: [
    { label: 'Nifty 50', value: '^NSEI' },
    { label: 'S&P 500', value: '^GSPC' },
  ]},
]

const signalColor = { BUY: '#00d4aa', SELL: '#ff4444', HOLD: '#f0a500' }

export default function Dashboard() {
  const { user, logout } = useAuth()
  const [ticker, setTicker] = useState('RELIANCE.NS')
  const [customTicker, setCustomTicker] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [capital, setCapital] = useState(100000)
  const [prediction, setPrediction] = useState(null)
  const [explanation, setExplanation] = useState(null)
  const [sentiment, setSentiment] = useState(null)
  const [backtestData, setBacktestData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [btLoading, setBtLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('predict')
  const [alertEmail, setAlertEmail] = useState('')
  const [alertSent, setAlertSent] = useState(false)
  const [alertLoading, setAlertLoading] = useState(false)

  const activeTicker = useCustom ? customTicker.toUpperCase() : ticker
  const token = localStorage.getItem('access_token')

  const handlePredict = async () => {
    if (!activeTicker) return
    setLoading(true)
    setError('')
    setPrediction(null)
    setExplanation(null)
    setSentiment(null)
    setAlertSent(false)
    try {
      const res = await stockAPI.predict(activeTicker)
      if (res.data.error) {
        setError(res.data.error + ' — Train this model first or use RELIANCE.NS, TCS.NS, BTC-USD')
      } else {
        setPrediction(res.data)
        try {
          const expRes = await stockAPI.explain(activeTicker)
          if (!expRes.data.error) setExplanation(expRes.data)
        } catch (e) {}
        try {
          const senRes = await stockAPI.sentiment(activeTicker)
          if (!senRes.data.error) setSentiment(senRes.data)
        } catch (e) {}
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Prediction failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleBacktest = async () => {
    if (!activeTicker) return
    setBtLoading(true)
    setError('')
    setBacktestData(null)
    try {
      const res = await stockAPI.backtest(activeTicker, capital)
      if (res.data.error) {
        setError(res.data.error)
      } else {
        setBacktestData(res.data)
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Backtest failed.')
    } finally {
      setBtLoading(false)
    }
  }

  const handleDownloadReport = () => {
    const url = stockAPI.reportUrl(activeTicker, capital, token)
    window.open(url, '_blank')
  }

  const handleAlert = async () => {
    if (!alertEmail) return
    setAlertLoading(true)
    try {
      const res = await stockAPI.sendAlert(activeTicker, alertEmail)
      if (res.data.success) {
        setAlertSent(true)
        setTimeout(() => setAlertSent(false), 5000)
      }
    } catch (e) {}
    finally { setAlertLoading(false) }
  }

  return (
    <div style={s.container}>
      <div style={s.navbar}>
        <h1 style={s.logo}>TradeForge</h1>
        <div style={s.navCenter}>
          <span style={s.navTag}>AI-Powered Trading Strategy Backtester</span>
        </div>
        <div style={s.navRight}>
          <div style={s.userBadge}>
            <span style={s.userName}>{user?.username}</span>
            <span style={{
              ...s.tierBadge,
              background: user?.tier === 'pro' ? '#f0a50020' : '#00d4aa20',
              color: user?.tier === 'pro' ? '#f0a500' : '#00d4aa',
              border: `1px solid ${user?.tier === 'pro' ? '#f0a500' : '#00d4aa'}`
            }}>
              {user?.tier?.toUpperCase()}
            </span>
          </div>
          <button onClick={logout} style={s.logoutBtn}>Logout</button>
        </div>
      </div>

      <div style={s.main}>
        <div style={s.pageHeader}>
          <h2 style={s.pageTitle}>
            {activeTab === 'predict' ? 'AI Signal Predictor' : 'Strategy Backtester'}
          </h2>
          <p style={s.pageSubtitle}>
            {activeTab === 'predict'
              ? 'Real-time BUY / SELL / HOLD signals powered by LSTM + XGBoost ensemble'
              : 'Simulate your strategy against years of real market data'}
          </p>
        </div>

        <div style={s.tabs}>
          {['predict', 'backtest'].map(tab => (
            <button key={tab}
              onClick={() => {
                setActiveTab(tab)
                setError('')
                setPrediction(null)
                setBacktestData(null)
                setExplanation(null)
                setSentiment(null)
                setAlertSent(false)
              }}
              style={{...s.tab, ...(activeTab === tab ? s.tabActive : {})}}>
              {tab === 'predict' ? '🤖 AI Predictor' : '📈 Backtester'}
            </button>
          ))}
        </div>

        <div style={s.controls}>
          <div style={s.controlRow}>
            <div style={s.controlItem}>
              <label style={s.label}>Stock / Asset</label>
              <select style={s.select} value={ticker}
                onChange={e => {
                  setTicker(e.target.value)
                  setUseCustom(false)
                  setCustomTicker('')
                }}
                disabled={useCustom}>
                {STOCKS.map(group => (
                  <optgroup key={group.group} label={group.group}>
                    {group.options.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div style={s.orDivider}>
              <span style={s.orText}>OR</span>
            </div>

            <div style={s.controlItem}>
              <label style={s.label}>Custom Symbol</label>
              <input
                style={{...s.input, borderColor: useCustom ? '#00d4aa' : '#2a2a2a'}}
                type="text"
                placeholder="e.g. ZOMATO.NS, NVDA"
                value={customTicker}
                onChange={e => {
                  setCustomTicker(e.target.value)
                  setUseCustom(e.target.value.length > 0)
                }}
              />
            </div>

            {activeTab === 'backtest' && (
              <div style={s.controlItem}>
                <label style={s.label}>Capital (₹)</label>
                <input style={s.input} type="number" value={capital}
                  onChange={e => setCapital(Number(e.target.value))} />
              </div>
            )}
          </div>

          <div style={s.activeTickerRow}>
            <span style={s.activeTickerLabel}>Analysing:</span>
            <span style={s.activeTickerValue}>{activeTicker}</span>
            {useCustom && <span style={s.customBadge}>Custom</span>}
          </div>

          <button
            style={{...s.button, opacity: loading || btLoading ? 0.7 : 1}}
            onClick={activeTab === 'predict' ? handlePredict : handleBacktest}
            disabled={loading || btLoading}>
            {loading || btLoading ? '⏳ Analysing...' :
              activeTab === 'predict' ? '🔍 Get AI Signal' : '🚀 Run Backtest'}
          </button>
        </div>

        {error && (
          <div style={s.errorBox}>
            <span>⚠️ {error}</span>
          </div>
        )}

        {activeTab === 'predict' && prediction && (
          <div style={s.card}>
            <div style={s.cardHeader}>
              <h3 style={s.cardTitle}>Signal for {prediction.ticker}</h3>
            </div>

            <div style={s.signalRow}>
              <div>
                <p style={s.label}>Today's Signal</p>
                <span style={{
                  ...s.signal,
                  color: signalColor[prediction.signal],
                  borderColor: signalColor[prediction.signal],
                  boxShadow: `0 0 20px ${signalColor[prediction.signal]}33`
                }}>
                  {prediction.signal}
                </span>
              </div>
              <div style={s.statsGrid}>
                {[
                  ['Model', prediction.model],
                  ['LSTM Vote', prediction.votes?.LSTM],
                  ['XGBoost Vote', prediction.votes?.XGBoost],
                  ['Agreement', prediction.votes?.agreement ? 'Yes ✓' : 'No ✗']
                ].map(([k, v]) => (
                  <div key={k} style={s.stat}>
                    <span style={s.statLabel}>{k}</span>
                    <span style={{
                      ...s.statVal,
                      color: k === 'Agreement'
                        ? (prediction.votes?.agreement ? '#00d4aa' : '#ff4444')
                        : k.includes('Vote') ? (signalColor[v] || '#fff')
                        : '#fff'
                    }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <p style={{...s.label, marginBottom: '12px'}}>Probability Distribution</p>
            {['BUY', 'SELL', 'HOLD'].map(sig => (
              <div key={sig} style={{marginBottom: '12px'}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'6px'}}>
                  <span style={{color: signalColor[sig], fontSize:'13px', fontWeight:'500'}}>{sig}</span>
                  <span style={{color:'#aaa', fontSize:'13px'}}>{prediction.probabilities?.[sig]}%</span>
                </div>
                <div style={s.barBg}>
                  <div style={{
                    ...s.barFill,
                    width: `${prediction.probabilities?.[sig]}%`,
                    background: signalColor[sig]
                  }} />
                </div>
              </div>
            ))}

            <div style={s.confidenceRow}>
              <div style={s.confItem}>
                <span style={s.confLabel}>LSTM Confidence</span>
                <span style={s.confVal}>{prediction.lstm_confidence}%</span>
              </div>
              <div style={s.confItem}>
                <span style={s.confLabel}>XGBoost Confidence</span>
                <span style={s.confVal}>{prediction.xgb_confidence}%</span>
              </div>
            </div>

            {explanation && (
              <div style={{marginTop:'24px', paddingTop:'24px', borderTop:'1px solid #1e1e1e'}}>
                <p style={{...s.label, marginBottom:'12px'}}>🧠 Why did the AI signal {explanation.signal}?</p>
                <div style={{
                  background:'#0a0a0a', borderRadius:'8px',
                  padding:'12px 16px', marginBottom:'16px',
                  border:'1px solid #1e1e1e', fontSize:'13px',
                  color:'#aaa', lineHeight:'1.6'
                }}>
                  {explanation.explanation}
                </div>
                <p style={{...s.label, marginBottom:'10px'}}>Top Feature Influences</p>
                {explanation.top_features?.map((feat, i) => (
                  <div key={i} style={{marginBottom:'10px'}}>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'4px'}}>
                      <span style={{
                        color: feat.impact === 'positive' ? '#00d4aa' : '#ff4444',
                        fontSize:'12px', fontWeight:'500'
                      }}>
                        {feat.impact === 'positive' ? '▲' : '▼'} {feat.label}
                      </span>
                      <span style={{color:'#555', fontSize:'11px'}}>
                        {feat.impact === 'positive' ? '+' : ''}{feat.shap_value}
                      </span>
                    </div>
                    <div style={{height:'5px', background:'#1e1e1e', borderRadius:'3px', overflow:'hidden'}}>
                      <div style={{
                        height:'100%',
                        width:`${Math.min(feat.abs_importance * 300, 100)}%`,
                        background: feat.impact === 'positive' ? '#00d4aa' : '#ff4444',
                        borderRadius:'3px'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {sentiment && (
              <div style={{marginTop:'24px', paddingTop:'24px', borderTop:'1px solid #1e1e1e'}}>
                <p style={{...s.label, marginBottom:'12px'}}>📰 News Sentiment Analysis</p>
                <div style={{
                  background:'#0a0a0a', borderRadius:'8px',
                  padding:'14px 16px', marginBottom:'16px',
                  border:`1px solid ${
                    sentiment.sentiment === 'positive' ? '#00d4aa40' :
                    sentiment.sentiment === 'negative' ? '#ff444440' : '#2a2a2a'
                  }`
                }}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px'}}>
                    <span style={{fontSize:'13px', fontWeight:'600', color:
                      sentiment.sentiment === 'positive' ? '#00d4aa' :
                      sentiment.sentiment === 'negative' ? '#ff4444' : '#aaa'
                    }}>
                      {sentiment.signal_impact}
                    </span>
                    <span style={{
                      fontSize:'11px', padding:'2px 8px', borderRadius:'10px',
                      background: sentiment.sentiment === 'positive' ? '#00d4aa20' :
                        sentiment.sentiment === 'negative' ? '#ff444420' : '#2a2a2a',
                      color: sentiment.sentiment === 'positive' ? '#00d4aa' :
                        sentiment.sentiment === 'negative' ? '#ff4444' : '#888'
                    }}>
                      {sentiment.headlines_analysed} headlines
                    </span>
                  </div>
                  <p style={{fontSize:'12px', color:'#666', lineHeight:'1.5'}}>
                    {sentiment.recommendation}
                  </p>
                  <div style={{display:'flex', gap:'16px', marginTop:'10px'}}>
                    <span style={{fontSize:'11px', color:'#00d4aa'}}>▲ {sentiment.positive_news} positive</span>
                    <span style={{fontSize:'11px', color:'#ff4444'}}>▼ {sentiment.negative_news} negative</span>
                    <span style={{fontSize:'11px', color:'#666'}}>➡ {sentiment.neutral_news} neutral</span>
                  </div>
                </div>
                <p style={{...s.label, marginBottom:'10px'}}>Latest Headlines</p>
                {sentiment.headlines?.map((h, i) => (
                  <div key={i} style={{
                    display:'flex', justifyContent:'space-between',
                    alignItems:'flex-start', padding:'10px 0',
                    borderBottom: i < sentiment.headlines.length - 1 ? '1px solid #1a1a1a' : 'none',
                    gap:'12px'
                  }}>
                    <div style={{flex:1}}>
                      <p style={{fontSize:'12px', color:'#ccc', lineHeight:'1.4', marginBottom:'3px'}}>
                        {h.title}
                      </p>
                      <span style={{fontSize:'10px', color:'#555'}}>
                        {h.source} · {h.published_at}
                      </span>
                    </div>
                    <span style={{
                      fontSize:'10px', fontWeight:'600', padding:'2px 8px',
                      borderRadius:'10px', flexShrink:0, whiteSpace:'nowrap',
                      background: h.sentiment === 'positive' ? '#00d4aa20' :
                        h.sentiment === 'negative' ? '#ff444420' : '#2a2a2a',
                      color: h.sentiment === 'positive' ? '#00d4aa' :
                        h.sentiment === 'negative' ? '#ff4444' : '#888',
                      border: `1px solid ${h.sentiment === 'positive' ? '#00d4aa40' :
                        h.sentiment === 'negative' ? '#ff444440' : '#333'}`
                    }}>
                      {h.sentiment} {h.confidence}%
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div style={{marginTop:'24px', paddingTop:'24px', borderTop:'1px solid #1e1e1e'}}>
              <p style={{...s.label, marginBottom:'12px'}}>📧 Email Signal Alert</p>
              <div style={{display:'flex', gap:'10px'}}>
                <input
                  style={{...s.input, flex:1}}
                  type="email"
                  placeholder="Enter email to receive this signal"
                  value={alertEmail}
                  onChange={e => setAlertEmail(e.target.value)}
                />
                <button
                  onClick={handleAlert}
                  disabled={alertLoading || !alertEmail}
                  style={{
                    padding:'10px 20px', borderRadius:'8px',
                    border:'1px solid #00d4aa', background:'transparent',
                    color:'#00d4aa', fontSize:'13px', fontWeight:'600',
                    cursor:'pointer', whiteSpace:'nowrap',
                    opacity: alertLoading || !alertEmail ? 0.6 : 1
                  }}>
                  {alertLoading ? '⏳ Sending...' : alertSent ? '✓ Sent!' : '📧 Send Alert'}
                </button>
              </div>
              {alertSent && (
                <p style={{color:'#00d4aa', fontSize:'12px', marginTop:'8px'}}>
                  ✓ Signal alert sent successfully! Check your inbox.
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'backtest' && backtestData && (
          <div>
            <div style={s.metricsGrid}>
              {[
                ['Total Return', `${backtestData.total_return}%`,
                  backtestData.total_return > 0 ? '#00d4aa' : '#ff4444'],
                ['CAGR', `${backtestData.cagr}%`, '#00d4aa'],
                ['Max Drawdown', `${backtestData.max_drawdown}%`, '#ff4444'],
                ['Win Rate', `${backtestData.win_rate}%`, '#f0a500'],
                ['Total Trades', backtestData.total_trades, '#fff'],
                ['Buy & Hold', `${backtestData.buy_hold_return}%`,
                  backtestData.total_return > backtestData.buy_hold_return
                    ? '#00d4aa' : '#f0a500']
              ].map(([label, value, color]) => (
                <div key={label} style={s.metricCard}>
                  <p style={s.metricLabel}>{label}</p>
                  <p style={{...s.metricValue, color}}>{value}</p>
                </div>
              ))}
            </div>

            <div style={{display:'flex', justifyContent:'flex-end', marginBottom:'16px'}}>
              <button
                onClick={handleDownloadReport}
                style={{
                  display:'inline-flex', alignItems:'center', gap:'8px',
                  padding:'10px 20px', borderRadius:'8px',
                  background:'transparent', border:'1px solid #00d4aa',
                  color:'#00d4aa', fontSize:'13px', fontWeight:'600',
                  cursor:'pointer'
                }}>
                📄 Download PDF Report
              </button>
            </div>

            <div style={s.chartCard}>
              <h3 style={s.chartTitle}>📈 Portfolio Equity Curve</h3>
              <p style={s.chartSubtitle}>
                Initial: ₹{backtestData.initial_capital?.toLocaleString()} →
                Final: ₹{backtestData.final_value?.toLocaleString()}
              </p>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={backtestData.portfolio_values}
                  margin={{top:10, right:20, left:10, bottom:10}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="date" tick={{fill:'#555', fontSize:11}}
                    tickFormatter={d => d.slice(2, 7)} />
                  <YAxis tick={{fill:'#555', fontSize:11}}
                    tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{background:'#1a1a1a', border:'1px solid #333', borderRadius:'8px'}}
                    labelStyle={{color:'#888', fontSize:'12px'}}
                    formatter={v => [`₹${Number(v).toLocaleString()}`, 'Portfolio Value']} />
                  <ReferenceLine y={backtestData.initial_capital}
                    stroke="#444" strokeDasharray="5 5"
                    label={{value:'Initial', fill:'#555', fontSize:10}} />
                  <Line type="monotone" dataKey="value"
                    stroke="#00d4aa" dot={false} strokeWidth={2.5}
                    activeDot={{r:4, fill:'#00d4aa'}} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div style={s.chartCard}>
              <h3 style={s.chartTitle}>🔄 Recent Trades</h3>
              <div style={{overflowX:'auto'}}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      {['Date','Action','Price','Shares','Profit/Loss'].map(h => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {backtestData.trades?.map((trade, i) => (
                      <tr key={i} style={{background: i%2===0 ? '#0d0d0d' : 'transparent'}}>
                        <td style={s.td}>{trade.date}</td>
                        <td style={{...s.td,
                          color: trade.action==='BUY' ? '#00d4aa' : '#ff4444',
                          fontWeight:'bold'}}>
                          {trade.action === 'BUY' ? '▲ BUY' : '▼ SELL'}
                        </td>
                        <td style={s.td}>₹{trade.price?.toLocaleString()}</td>
                        <td style={s.td}>{trade.shares?.toLocaleString()}</td>
                        <td style={{...s.td,
                          color: trade.profit > 0 ? '#00d4aa'
                            : trade.profit < 0 ? '#ff4444' : '#aaa',
                          fontWeight: trade.profit ? '500' : 'normal'}}>
                          {trade.profit
                            ? `${trade.profit > 0 ? '+' : ''}₹${trade.profit?.toLocaleString()}`
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const s = {
  container: { minHeight:'100vh', background:'#0a0a0a' },
  navbar: {
    display:'flex', justifyContent:'space-between', alignItems:'center',
    padding:'14px 40px', background:'#111', borderBottom:'1px solid #1e1e1e',
    position:'sticky', top:0, zIndex:100
  },
  logo: { color:'#00d4aa', fontSize:'20px', fontWeight:'bold', letterSpacing:'-0.5px' },
  navCenter: { flex:1, textAlign:'center' },
  navTag: { color:'#444', fontSize:'12px' },
  navRight: { display:'flex', alignItems:'center', gap:'12px' },
  userBadge: { display:'flex', alignItems:'center', gap:'8px' },
  userName: { color:'#888', fontSize:'13px' },
  tierBadge: {
    fontSize:'10px', fontWeight:'bold', padding:'2px 8px',
    borderRadius:'10px', letterSpacing:'0.05em'
  },
  logoutBtn: {
    padding:'7px 14px', borderRadius:'6px', border:'1px solid #2a2a2a',
    background:'transparent', color:'#666', cursor:'pointer', fontSize:'12px'
  },
  main: { maxWidth:'960px', margin:'0 auto', padding:'32px 24px' },
  pageHeader: { marginBottom:'28px' },
  pageTitle: { color:'#fff', fontSize:'24px', fontWeight:'600', marginBottom:'6px' },
  pageSubtitle: { color:'#555', fontSize:'14px', lineHeight:'1.5' },
  tabs: { display:'flex', gap:'8px', marginBottom:'24px' },
  tab: {
    padding:'9px 20px', borderRadius:'8px', border:'1px solid #2a2a2a',
    background:'transparent', color:'#555', cursor:'pointer', fontSize:'13px', fontWeight:'500'
  },
  tabActive: { background:'#00d4aa', color:'#000', border:'1px solid #00d4aa', fontWeight:'600' },
  controls: {
    background:'#111', borderRadius:'12px',
    padding:'24px', border:'1px solid #1e1e1e', marginBottom:'24px'
  },
  controlRow: { display:'flex', gap:'12px', marginBottom:'16px', flexWrap:'wrap', alignItems:'flex-end' },
  controlItem: { flex:1, minWidth:'180px' },
  orDivider: { display:'flex', alignItems:'flex-end', paddingBottom:'10px', flexShrink:0 },
  orText: { color:'#444', fontSize:'12px', fontWeight:'500' },
  label: {
    color:'#555', fontSize:'11px', display:'block',
    marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.06em'
  },
  select: {
    width:'100%', padding:'10px 12px', borderRadius:'8px',
    border:'1px solid #2a2a2a', background:'#1a1a1a', color:'#fff', fontSize:'13px', outline:'none'
  },
  input: {
    width:'100%', padding:'10px 12px', borderRadius:'8px',
    border:'1px solid #2a2a2a', background:'#1a1a1a', color:'#fff', fontSize:'13px', outline:'none'
  },
  activeTickerRow: {
    display:'flex', alignItems:'center', gap:'8px', marginBottom:'16px',
    padding:'8px 12px', background:'#0a0a0a', borderRadius:'6px', border:'1px solid #1e1e1e'
  },
  activeTickerLabel: { color:'#444', fontSize:'12px' },
  activeTickerValue: { color:'#00d4aa', fontSize:'13px', fontWeight:'600' },
  customBadge: {
    fontSize:'10px', padding:'2px 6px', borderRadius:'4px',
    background:'#00d4aa20', color:'#00d4aa', border:'1px solid #00d4aa40'
  },
  button: {
    width:'100%', padding:'13px', borderRadius:'8px', border:'none',
    background:'#00d4aa', color:'#000', fontSize:'14px', fontWeight:'700', cursor:'pointer'
  },
  errorBox: {
    background:'#ff444415', border:'1px solid #ff444440',
    borderRadius:'8px', padding:'12px 16px', marginBottom:'20px',
    color:'#ff6666', fontSize:'13px'
  },
  card: {
    background:'#111', borderRadius:'12px',
    padding:'24px', border:'1px solid #1e1e1e', marginBottom:'24px'
  },
  cardHeader: { marginBottom:'20px' },
  cardTitle: { color:'#fff', fontSize:'16px', fontWeight:'600' },
  signalRow: {
    display:'flex', justifyContent:'space-between',
    alignItems:'flex-start', marginBottom:'28px', flexWrap:'wrap', gap:'20px'
  },
  signal: {
    fontSize:'36px', fontWeight:'bold', border:'2px solid',
    borderRadius:'10px', padding:'8px 28px', display:'inline-block', letterSpacing:'2px'
  },
  statsGrid: { display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'16px' },
  stat: { display:'flex', flexDirection:'column', gap:'4px' },
  statLabel: { color:'#444', fontSize:'10px', textTransform:'uppercase', letterSpacing:'0.06em' },
  statVal: { color:'#fff', fontSize:'14px', fontWeight:'500' },
  barBg: { height:'8px', background:'#1e1e1e', borderRadius:'4px', overflow:'hidden' },
  barFill: { height:'100%', borderRadius:'4px', transition:'width 0.6s ease' },
  confidenceRow: {
    display:'flex', gap:'16px', marginTop:'20px',
    paddingTop:'20px', borderTop:'1px solid #1e1e1e'
  },
  confItem: { display:'flex', flexDirection:'column', gap:'4px' },
  confLabel: { color:'#444', fontSize:'10px', textTransform:'uppercase', letterSpacing:'0.06em' },
  confVal: { color:'#00d4aa', fontSize:'16px', fontWeight:'600' },
  metricsGrid: { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px', marginBottom:'20px' },
  metricCard: {
    background:'#111', borderRadius:'10px', padding:'18px',
    border:'1px solid #1e1e1e', textAlign:'center'
  },
  metricLabel: { color:'#555', fontSize:'10px', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'10px' },
  metricValue: { fontSize:'24px', fontWeight:'700' },
  chartCard: {
    background:'#111', borderRadius:'12px', padding:'24px',
    border:'1px solid #1e1e1e', marginBottom:'16px'
  },
  chartTitle: { color:'#fff', fontSize:'15px', fontWeight:'600', marginBottom:'6px' },
  chartSubtitle: { color:'#555', fontSize:'12px', marginBottom:'20px' },
  table: { width:'100%', borderCollapse:'collapse', minWidth:'500px' },
  th: {
    color:'#444', fontSize:'10px', textTransform:'uppercase',
    letterSpacing:'0.06em', padding:'10px 14px',
    textAlign:'left', borderBottom:'1px solid #1e1e1e'
  },
  td: { color:'#888', fontSize:'13px', padding:'10px 14px', borderBottom:'1px solid #111' }
}