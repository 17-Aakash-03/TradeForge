import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { stockAPI } from '../services/api'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
  PieChart, Pie, Cell
} from 'recharts'
import CandlestickChart from '../components/CandlestickChart'

const STOCKS = [
  {
    group: 'Indian Stocks (NSE)', options: [
      { label: 'Reliance Industries', value: 'RELIANCE.NS' },
      { label: 'TCS', value: 'TCS.NS' },
      { label: 'Infosys', value: 'INFY.NS' },
      { label: 'HDFC Bank', value: 'HDFCBANK.NS' },
      { label: 'ICICI Bank', value: 'ICICIBANK.NS' },
      { label: 'Wipro', value: 'WIPRO.NS' },
      { label: 'Adani Enterprises', value: 'ADANIENT.NS' },
      { label: 'Bajaj Finance', value: 'BAJFINANCE.NS' },
      { label: 'ITC', value: 'ITC.NS' },
    ]
  },
  {
    group: 'US Stocks', options: [
      { label: 'Apple', value: 'AAPL' },
      { label: 'Google', value: 'GOOGL' },
      { label: 'Microsoft', value: 'MSFT' },
      { label: 'Tesla', value: 'TSLA' },
      { label: 'Amazon', value: 'AMZN' },
    ]
  },
  {
    group: 'Crypto', options: [
      { label: 'Bitcoin', value: 'BTC-USD' },
      { label: 'Ethereum', value: 'ETH-USD' },
    ]
  },
  {
    group: 'Indices', options: [
      { label: 'Nifty 50', value: '^NSEI' },
      { label: 'S&P 500', value: '^GSPC' },
    ]
  },
]

const ALL_TICKERS = STOCKS.flatMap(g => g.options)
const PIE_COLORS = ['#00d4aa', '#534AB7', '#f0a500', '#ff4444', '#00b8d9']
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
  const [portfolioData, setPortfolioData] = useState(null)
  const [selectedTickers, setSelectedTickers] = useState(['RELIANCE.NS', 'TCS.NS', 'BTC-USD'])
  const [loading, setLoading] = useState(false)
  const [btLoading, setBtLoading] = useState(false)
  const [pfLoading, setPfLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('predict')
  const [alertEmail, setAlertEmail] = useState('')
  const [alertSent, setAlertSent] = useState(false)
  const [alertLoading, setAlertLoading] = useState(false)
  const [paperData, setPaperData] = useState(null)
  const [paperLoading, setPaperLoading] = useState(false)
  const [tradeResult, setTradeResult] = useState(null)
  const [paperTicker, setPaperTicker] = useState('RELIANCE.NS')
  const [retrainStatus, setRetrainStatus] = useState(null)
  const [retrainResult, setRetrainResult] = useState(null)
  const [retrainLoading, setRetrainLoading] = useState(false)
  // ── NEW: Chart tab state ──
  const [chartTicker, setChartTicker] = useState('RELIANCE.NS')

  const activeTicker = useCustom ? customTicker.toUpperCase() : ticker
  const token = localStorage.getItem('access_token')

  useEffect(() => {
    if (activeTab === 'paper') loadPaperPortfolio()
    if (activeTab === 'retrain') loadRetrainStatus()
  }, [activeTab])

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
        setError(res.data.error + ' — Train this model first or select from the dropdown')
      } else {
        setPrediction(res.data)
        try {
          const expRes = await stockAPI.explain(activeTicker)
          if (!expRes.data.error) setExplanation(expRes.data)
        } catch (e) { }
        try {
          const senRes = await stockAPI.sentiment(activeTicker)
          if (!senRes.data.error) setSentiment(senRes.data)
        } catch (e) { }
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
      if (res.data.error) setError(res.data.error)
      else setBacktestData(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Backtest failed.')
    } finally {
      setBtLoading(false)
    }
  }

  const handlePortfolioBacktest = async () => {
    if (selectedTickers.length < 2) { setError('Please select at least 2 stocks'); return }
    setPfLoading(true)
    setError('')
    setPortfolioData(null)
    try {
      const res = await stockAPI.portfolioBacktest(selectedTickers, capital)
      if (res.data.error) setError(res.data.error)
      else setPortfolioData(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Portfolio backtest failed.')
    } finally {
      setPfLoading(false)
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
      if (res.data.success) { setAlertSent(true); setTimeout(() => setAlertSent(false), 5000) }
    } catch (e) { }
    finally { setAlertLoading(false) }
  }

  const toggleTicker = (val) => {
    if (selectedTickers.includes(val)) {
      if (selectedTickers.length > 2) setSelectedTickers(selectedTickers.filter(t => t !== val))
    } else {
      if (selectedTickers.length < 5) setSelectedTickers([...selectedTickers, val])
    }
  }

  const loadPaperPortfolio = async () => {
    try {
      const res = await stockAPI.paperPortfolio()
      setPaperData(res.data)
    } catch (e) { }
  }

  const handlePaperTrade = async () => {
    setPaperLoading(true)
    setTradeResult(null)
    try {
      const res = await stockAPI.paperAutoTrade(paperTicker)
      setTradeResult(res.data)
      await loadPaperPortfolio()
    } catch (e) { }
    finally { setPaperLoading(false) }
  }

  const handlePaperReset = async () => {
    if (!window.confirm('Reset portfolio to ₹1,00,000?')) return
    await stockAPI.paperReset()
    await loadPaperPortfolio()
    setTradeResult(null)
  }

  const loadRetrainStatus = async () => {
    try {
      const res = await stockAPI.retrainStatus()
      setRetrainStatus(res.data)
    } catch (e) { }
  }

  const handleRetrain = async (force = false) => {
    setRetrainLoading(true)
    setRetrainResult(null)
    try {
      const res = await stockAPI.retrainRun(force)
      setRetrainResult(res.data)
      await loadRetrainStatus()
    } catch (e) { }
    finally { setRetrainLoading(false) }
  }

  const TABS = [
    { key: 'predict', label: '🤖 AI Predictor' },
    { key: 'backtest', label: '📈 Backtester' },
    { key: 'portfolio', label: '📊 Portfolio' },
    { key: 'paper', label: '🎯 Paper Trading' },
    { key: 'retrain', label: '🔄 Auto Retrain' },
    // ── NEW: Chart tab added ──
    { key: 'chart', label: '📊 Charts' },
  ]

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
            }}>{user?.tier?.toUpperCase()}</span>
          </div>
          <button onClick={logout} style={s.logoutBtn}>Logout</button>
        </div>
      </div>

      <div style={s.main}>
        <div style={s.pageHeader}>
          <h2 style={s.pageTitle}>
            {activeTab === 'predict' ? 'AI Signal Predictor' :
              activeTab === 'backtest' ? 'Strategy Backtester' :
                activeTab === 'portfolio' ? 'Portfolio Backtester' :
                  activeTab === 'paper' ? 'Paper Trading' :
                    activeTab === 'chart' ? 'Candlestick Charts' :
                      'Auto Model Retraining'}
          </h2>
          <p style={s.pageSubtitle}>
            {activeTab === 'predict' ? 'Real-time BUY / SELL / HOLD signals powered by LSTM + XGBoost ensemble' :
              activeTab === 'backtest' ? 'Simulate your strategy against years of real market data' :
                activeTab === 'portfolio' ? 'Backtest a multi-stock portfolio and analyse combined performance' :
                  activeTab === 'paper' ? 'Trade with virtual money using live AI signals — no real money at risk' :
                    activeTab === 'chart' ? 'Interactive candlestick charts with OHLCV data for loaded stocks' :
                      'Keep AI models fresh by retraining with latest market data automatically'}
          </p>
        </div>

        <div style={s.tabs}>
          {TABS.map(tab => (
            <button key={tab.key}
              onClick={() => {
                setActiveTab(tab.key)
                setError('')
                setPrediction(null)
                setBacktestData(null)
                setPortfolioData(null)
                setExplanation(null)
                setSentiment(null)
                setAlertSent(false)
                setRetrainResult(null)
              }}
              style={{ ...s.tab, ...(activeTab === tab.key ? s.tabActive : {}) }}>
              {tab.label}
            </button>
          ))}
        </div>

        {(activeTab === 'predict' || activeTab === 'backtest') && (
          <div style={s.controls}>
            <div style={s.controlRow}>
              <div style={s.controlItem}>
                <label style={s.label}>Stock / Asset</label>
                <select style={s.select} value={ticker}
                  onChange={e => { setTicker(e.target.value); setUseCustom(false); setCustomTicker('') }}
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
              <div style={s.orDivider}><span style={s.orText}>OR</span></div>
              <div style={s.controlItem}>
                <label style={s.label}>Custom Symbol</label>
                <input style={{ ...s.input, borderColor: useCustom ? '#00d4aa' : '#2a2a2a' }}
                  type="text" placeholder="e.g. ZOMATO.NS, NVDA" value={customTicker}
                  onChange={e => { setCustomTicker(e.target.value); setUseCustom(e.target.value.length > 0) }} />
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
              style={{ ...s.button, opacity: loading || btLoading ? 0.7 : 1 }}
              onClick={activeTab === 'predict' ? handlePredict : handleBacktest}
              disabled={loading || btLoading}>
              {loading || btLoading ? '⏳ Analysing...' :
                activeTab === 'predict' ? '🔍 Get AI Signal' : '🚀 Run Backtest'}
            </button>
          </div>
        )}

        {activeTab === 'portfolio' && (
          <div style={s.controls}>
            <p style={{ ...s.label, marginBottom: '12px' }}>Select 2-5 stocks for your portfolio:</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
              {ALL_TICKERS.map(opt => (
                <button key={opt.value} onClick={() => toggleTicker(opt.value)}
                  style={{
                    padding: '6px 12px', borderRadius: '20px', fontSize: '12px',
                    fontWeight: '500', cursor: 'pointer', border: '1px solid',
                    background: selectedTickers.includes(opt.value) ? '#00d4aa20' : 'transparent',
                    color: selectedTickers.includes(opt.value) ? '#00d4aa' : '#555',
                    borderColor: selectedTickers.includes(opt.value) ? '#00d4aa' : '#2a2a2a'
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
            <div style={{ ...s.activeTickerRow, marginBottom: '16px' }}>
              <span style={s.activeTickerLabel}>Selected:</span>
              <span style={{ color: '#00d4aa', fontSize: '13px' }}>{selectedTickers.join(' + ')}</span>
              <span style={{ color: '#555', fontSize: '11px' }}>({selectedTickers.length}/5)</span>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={s.label}>Total Capital (₹)</label>
              <input style={s.input} type="number" value={capital}
                onChange={e => setCapital(Number(e.target.value))} />
            </div>
            <button style={{ ...s.button, opacity: pfLoading ? 0.7 : 1 }}
              onClick={handlePortfolioBacktest} disabled={pfLoading}>
              {pfLoading ? '⏳ Running Portfolio Backtest...' : '📊 Run Portfolio Backtest'}
            </button>
          </div>
        )}

        {activeTab === 'paper' && (
          <div style={s.controls}>
            <p style={{ ...s.label, marginBottom: '12px' }}>Select stock for AI auto-trade:</p>
            <div style={s.controlRow}>
              <div style={s.controlItem}>
                <label style={s.label}>Stock / Asset</label>
                <select style={s.select} value={paperTicker}
                  onChange={e => setPaperTicker(e.target.value)}>
                  {STOCKS.map(group => (
                    <optgroup key={group.group} label={group.group}>
                      {group.options.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handlePaperTrade} disabled={paperLoading}
                style={{ ...s.button, flex: 1, opacity: paperLoading ? 0.7 : 1 }}>
                {paperLoading ? '⏳ Trading...' : '🤖 Auto Trade with AI Signal'}
              </button>
              <button onClick={handlePaperReset}
                style={{ padding: '13px 20px', borderRadius: '8px', border: '1px solid #ff4444', background: 'transparent', color: '#ff4444', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                🔄 Reset
              </button>
            </div>
          </div>
        )}

        {activeTab === 'retrain' && (
          <div style={s.controls}>
            <p style={{ color: '#aaa', fontSize: '13px', marginBottom: '16px', lineHeight: '1.6' }}>
              TradeForge automatically checks if AI models are outdated (older than 7 days) and retrains them with the latest market data. You can also force retrain all models manually.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => handleRetrain(false)} disabled={retrainLoading}
                style={{ ...s.button, flex: 1, opacity: retrainLoading ? 0.7 : 1 }}>
                {retrainLoading ? '⏳ Retraining...' : '🔄 Smart Retrain (outdated only)'}
              </button>
              <button onClick={() => handleRetrain(true)} disabled={retrainLoading}
                style={{ padding: '13px 20px', borderRadius: '8px', border: '1px solid #f0a500', background: 'transparent', color: '#f0a500', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', opacity: retrainLoading ? 0.7 : 1 }}>
                ⚡ Force Retrain All
              </button>
            </div>
          </div>
        )}

        {/* ── NEW: Chart tab controls ── */}
        {activeTab === 'chart' && (
          <div style={s.controls}>
            <div style={s.controlRow}>
              <div style={s.controlItem}>
                <label style={s.label}>Stock / Asset</label>
                <select style={s.select} value={chartTicker}
                  onChange={e => setChartTicker(e.target.value)}>
                  {STOCKS.map(group => (
                    <optgroup key={group.group} label={group.group}>
                      {group.options.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>
            <p style={{ color: '#555', fontSize: '12px' }}>
              Only stocks with loaded data are available: RELIANCE.NS, TCS.NS, BTC-USD
            </p>
          </div>
        )}

        {error && <div style={s.errorBox}><span>⚠️ {error}</span></div>}

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
                }}>{prediction.signal}</span>
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
                      color: k === 'Agreement' ? (prediction.votes?.agreement ? '#00d4aa' : '#ff4444')
                        : k.includes('Vote') ? (signalColor[v] || '#fff') : '#fff'
                    }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <p style={{ ...s.label, marginBottom: '12px' }}>Probability Distribution</p>
            {['BUY', 'SELL', 'HOLD'].map(sig => (
              <div key={sig} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: signalColor[sig], fontSize: '13px', fontWeight: '500' }}>{sig}</span>
                  <span style={{ color: '#aaa', fontSize: '13px' }}>{prediction.probabilities?.[sig]}%</span>
                </div>
                <div style={s.barBg}>
                  <div style={{ ...s.barFill, width: `${prediction.probabilities?.[sig]}%`, background: signalColor[sig] }} />
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
              <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #1e1e1e' }}>
                <p style={{ ...s.label, marginBottom: '12px' }}>🧠 Why did the AI signal {explanation.signal}?</p>
                <div style={{ background: '#0a0a0a', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', border: '1px solid #1e1e1e', fontSize: '13px', color: '#aaa', lineHeight: '1.6' }}>
                  {explanation.explanation}
                </div>
                <p style={{ ...s.label, marginBottom: '10px' }}>Top Feature Influences</p>
                {explanation.top_features?.map((feat, i) => (
                  <div key={i} style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: feat.impact === 'positive' ? '#00d4aa' : '#ff4444', fontSize: '12px', fontWeight: '500' }}>
                        {feat.impact === 'positive' ? '▲' : '▼'} {feat.label}
                      </span>
                      <span style={{ color: '#555', fontSize: '11px' }}>
                        {feat.impact === 'positive' ? '+' : ''}{feat.shap_value}
                      </span>
                    </div>
                    <div style={{ height: '5px', background: '#1e1e1e', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(feat.abs_importance * 300, 100)}%`, background: feat.impact === 'positive' ? '#00d4aa' : '#ff4444', borderRadius: '3px' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {sentiment && (
              <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #1e1e1e' }}>
                <p style={{ ...s.label, marginBottom: '12px' }}>📰 News Sentiment Analysis</p>
                <div style={{ background: '#0a0a0a', borderRadius: '8px', padding: '14px 16px', marginBottom: '16px', border: `1px solid ${sentiment.sentiment === 'positive' ? '#00d4aa40' : sentiment.sentiment === 'negative' ? '#ff444440' : '#2a2a2a'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: sentiment.sentiment === 'positive' ? '#00d4aa' : sentiment.sentiment === 'negative' ? '#ff4444' : '#aaa' }}>
                      {sentiment.signal_impact}
                    </span>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: sentiment.sentiment === 'positive' ? '#00d4aa20' : sentiment.sentiment === 'negative' ? '#ff444420' : '#2a2a2a', color: sentiment.sentiment === 'positive' ? '#00d4aa' : sentiment.sentiment === 'negative' ? '#ff4444' : '#888' }}>
                      {sentiment.headlines_analysed} headlines
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#666', lineHeight: '1.5' }}>{sentiment.recommendation}</p>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
                    <span style={{ fontSize: '11px', color: '#00d4aa' }}>▲ {sentiment.positive_news} positive</span>
                    <span style={{ fontSize: '11px', color: '#ff4444' }}>▼ {sentiment.negative_news} negative</span>
                    <span style={{ fontSize: '11px', color: '#666' }}>➡ {sentiment.neutral_news} neutral</span>
                  </div>
                </div>
                <p style={{ ...s.label, marginBottom: '10px' }}>Latest Headlines</p>
                {sentiment.headlines?.map((h, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: i < sentiment.headlines.length - 1 ? '1px solid #1a1a1a' : 'none', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '12px', color: '#ccc', lineHeight: '1.4', marginBottom: '3px' }}>{h.title}</p>
                      <span style={{ fontSize: '10px', color: '#555' }}>{h.source} · {h.published_at}</span>
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: '600', padding: '2px 8px', borderRadius: '10px', flexShrink: 0, whiteSpace: 'nowrap', background: h.sentiment === 'positive' ? '#00d4aa20' : h.sentiment === 'negative' ? '#ff444420' : '#2a2a2a', color: h.sentiment === 'positive' ? '#00d4aa' : h.sentiment === 'negative' ? '#ff4444' : '#888', border: `1px solid ${h.sentiment === 'positive' ? '#00d4aa40' : h.sentiment === 'negative' ? '#ff444440' : '#333'}` }}>
                      {h.sentiment} {h.confidence}%
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #1e1e1e' }}>
              <p style={{ ...s.label, marginBottom: '12px' }}>📧 Email Signal Alert</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input style={{ ...s.input, flex: 1 }} type="email"
                  placeholder="Enter email to receive this signal"
                  value={alertEmail} onChange={e => setAlertEmail(e.target.value)} />
                <button onClick={handleAlert} disabled={alertLoading || !alertEmail}
                  style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #00d4aa', background: 'transparent', color: '#00d4aa', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', opacity: alertLoading || !alertEmail ? 0.6 : 1 }}>
                  {alertLoading ? '⏳ Sending...' : alertSent ? '✓ Sent!' : '📧 Send Alert'}
                </button>
              </div>
              {alertSent && <p style={{ color: '#00d4aa', fontSize: '12px', marginTop: '8px' }}>✓ Signal alert sent! Check your inbox.</p>}
            </div>
          </div>
        )}

        {activeTab === 'backtest' && backtestData && (
          <div>
            <div style={s.metricsGrid}>
              {[
                ['Total Return', `${backtestData.total_return}%`, backtestData.total_return > 0 ? '#00d4aa' : '#ff4444'],
                ['CAGR', `${backtestData.cagr}%`, '#00d4aa'],
                ['Max Drawdown', `${backtestData.max_drawdown}%`, '#ff4444'],
                ['Win Rate', `${backtestData.win_rate}%`, '#f0a500'],
                ['Total Trades', backtestData.total_trades, '#fff'],
                ['Buy & Hold', `${backtestData.buy_hold_return}%`, backtestData.total_return > backtestData.buy_hold_return ? '#00d4aa' : '#f0a500']
              ].map(([label, value, color]) => (
                <div key={label} style={s.metricCard}>
                  <p style={s.metricLabel}>{label}</p>
                  <p style={{ ...s.metricValue, color }}>{value}</p>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <button onClick={handleDownloadReport}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px', background: 'transparent', border: '1px solid #00d4aa', color: '#00d4aa', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                📄 Download PDF Report
              </button>
            </div>
            <div style={s.chartCard}>
              <h3 style={s.chartTitle}>📈 Portfolio Equity Curve</h3>
              <p style={s.chartSubtitle}>Initial: ₹{backtestData.initial_capital?.toLocaleString()} → Final: ₹{backtestData.final_value?.toLocaleString()}</p>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={backtestData.portfolio_values} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="date" tick={{ fill: '#555', fontSize: 11 }} tickFormatter={d => d.slice(2, 7)} />
                  <YAxis tick={{ fill: '#555', fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }} labelStyle={{ color: '#888', fontSize: '12px' }} formatter={v => [`₹${Number(v).toLocaleString()}`, 'Portfolio Value']} />
                  <ReferenceLine y={backtestData.initial_capital} stroke="#444" strokeDasharray="5 5" label={{ value: 'Initial', fill: '#555', fontSize: 10 }} />
                  <Line type="monotone" dataKey="value" stroke="#00d4aa" dot={false} strokeWidth={2.5} activeDot={{ r: 4, fill: '#00d4aa' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={s.chartCard}>
              <h3 style={s.chartTitle}>🔄 Recent Trades</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={s.table}>
                  <thead>
                    <tr>{['Date', 'Action', 'Price', 'Shares', 'Profit/Loss'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {backtestData.trades?.map((trade, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? '#0d0d0d' : 'transparent' }}>
                        <td style={s.td}>{trade.date}</td>
                        <td style={{ ...s.td, color: trade.action === 'BUY' ? '#00d4aa' : '#ff4444', fontWeight: 'bold' }}>{trade.action === 'BUY' ? '▲ BUY' : '▼ SELL'}</td>
                        <td style={s.td}>₹{trade.price?.toLocaleString()}</td>
                        <td style={s.td}>{trade.shares?.toLocaleString()}</td>
                        <td style={{ ...s.td, color: trade.profit > 0 ? '#00d4aa' : trade.profit < 0 ? '#ff4444' : '#aaa' }}>
                          {trade.profit ? `${trade.profit > 0 ? '+' : ''}₹${trade.profit?.toLocaleString()}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'portfolio' && portfolioData && (
          <div>
            <div style={s.metricsGrid}>
              {[
                ['Portfolio Return', `${portfolioData.total_return}%`, portfolioData.total_return > 0 ? '#00d4aa' : '#ff4444'],
                ['CAGR', `${portfolioData.cagr}%`, '#00d4aa'],
                ['Max Drawdown', `${portfolioData.max_drawdown}%`, '#ff4444'],
                ['Best Performer', portfolioData.best_performer?.ticker, '#00d4aa'],
                ['Stocks', portfolioData.stocks_count, '#fff'],
                ['Final Value', `₹${portfolioData.final_value?.toLocaleString()}`, '#f0a500']
              ].map(([label, value, color]) => (
                <div key={label} style={s.metricCard}>
                  <p style={s.metricLabel}>{label}</p>
                  <p style={{ ...s.metricValue, color, fontSize: label === 'Final Value' ? '16px' : '24px' }}>{value}</p>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div style={s.chartCard}>
                <h3 style={s.chartTitle}>📊 Portfolio Allocation</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={portfolioData.allocation} dataKey="allocation_pct" nameKey="ticker" cx="50%" cy="50%" outerRadius={80} label={({ ticker, allocation_pct }) => `${ticker} ${allocation_pct}%`}>
                      {portfolioData.allocation?.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={v => [`${v}%`, 'Allocation']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={s.chartCard}>
                <h3 style={s.chartTitle}>🏆 Stock Performance</h3>
                {portfolioData.allocation?.map((stock, i) => (
                  <div key={i} style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: '#ccc', fontSize: '12px', fontWeight: '500' }}>{stock.ticker}</span>
                      <span style={{ color: stock.total_return > 0 ? '#00d4aa' : '#ff4444', fontSize: '12px', fontWeight: '600' }}>
                        {stock.total_return > 0 ? '+' : ''}{stock.total_return}%
                      </span>
                    </div>
                    <div style={{ height: '6px', background: '#1e1e1e', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(Math.abs(stock.total_return) / 50 * 100, 100)}%`, background: PIE_COLORS[i % PIE_COLORS.length], borderRadius: '3px' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '3px' }}>
                      <span style={{ fontSize: '10px', color: '#555' }}>Win Rate: {stock.win_rate}%</span>
                      <span style={{ fontSize: '10px', color: '#555' }}>Drawdown: {stock.max_drawdown}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={s.chartCard}>
              <h3 style={s.chartTitle}>📈 Combined Portfolio Equity Curve</h3>
              <p style={s.chartSubtitle}>Initial: ₹{portfolioData.initial_capital?.toLocaleString()} → Final: ₹{portfolioData.final_value?.toLocaleString()}</p>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={portfolioData.portfolio_values} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="date" tick={{ fill: '#555', fontSize: 11 }} tickFormatter={d => d.slice(2, 7)} />
                  <YAxis tick={{ fill: '#555', fontSize: 11 }} tickFormatter={v => `₹${(v / 100000).toFixed(1)}L`} />
                  <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }} labelStyle={{ color: '#888', fontSize: '12px' }} formatter={v => [`₹${Number(v).toLocaleString()}`, 'Portfolio Value']} />
                  <ReferenceLine y={portfolioData.initial_capital} stroke="#444" strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="value" stroke="#00d4aa" dot={false} strokeWidth={2.5} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'paper' && (
          <div>
            {tradeResult && (
              <div style={{ ...s.card, borderColor: tradeResult.action === 'BUY' ? '#00d4aa40' : tradeResult.action === 'SELL' ? '#ff444440' : '#2a2a2a', marginBottom: '16px' }}>
                <p style={{ ...s.label, marginBottom: '8px' }}>Last Trade Result</p>
                <p style={{ color: tradeResult.action === 'BUY' ? '#00d4aa' : tradeResult.action === 'SELL' ? '#ff4444' : '#f0a500', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                  {tradeResult.action === 'BUY' ? '▲ BUY' : tradeResult.action === 'SELL' ? '▼ SELL' : '➡ HOLD'} — {tradeResult.ticker}
                </p>
                <p style={{ color: '#aaa', fontSize: '13px' }}>{tradeResult.message}</p>
                {tradeResult.ai_signal && (
                  <p style={{ color: '#555', fontSize: '11px', marginTop: '6px' }}>
                    AI Signal: {tradeResult.ai_signal} · Confidence: {tradeResult.confidence}%
                  </p>
                )}
              </div>
            )}

            {paperData && (
              <div>
                <div style={s.metricsGrid}>
                  {[
                    ['Cash Balance', `₹${paperData.cash_balance?.toLocaleString()}`, '#fff'],
                    ['Positions Value', `₹${paperData.positions_value?.toLocaleString()}`, '#00d4aa'],
                    ['Total Value', `₹${paperData.total_value?.toLocaleString()}`, '#00d4aa'],
                    ['Total Return', `${paperData.total_return}%`, paperData.total_return >= 0 ? '#00d4aa' : '#ff4444'],
                    ['Realized P&L', `₹${paperData.total_pnl?.toLocaleString()}`, paperData.total_pnl >= 0 ? '#00d4aa' : '#ff4444'],
                    ['Total Trades', paperData.total_trades, '#fff']
                  ].map(([label, value, color]) => (
                    <div key={label} style={s.metricCard}>
                      <p style={s.metricLabel}>{label}</p>
                      <p style={{ ...s.metricValue, color, fontSize: '18px' }}>{value}</p>
                    </div>
                  ))}
                </div>

                {paperData.open_positions?.length > 0 && (
                  <div style={s.chartCard}>
                    <h3 style={s.chartTitle}>📂 Open Positions</h3>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={s.table}>
                        <thead>
                          <tr>{['Ticker', 'Shares', 'Buy Price', 'Current Price', 'Value', 'Unrealized P&L', 'Opened'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                        </thead>
                        <tbody>
                          {paperData.open_positions.map((pos, i) => (
                            <tr key={i} style={{ background: i % 2 === 0 ? '#0d0d0d' : 'transparent' }}>
                              <td style={{ ...s.td, color: '#00d4aa', fontWeight: '600' }}>{pos.ticker}</td>
                              <td style={s.td}>{pos.shares}</td>
                              <td style={s.td}>₹{pos.buy_price?.toLocaleString()}</td>
                              <td style={s.td}>₹{pos.current_price?.toLocaleString()}</td>
                              <td style={s.td}>₹{pos.current_value?.toLocaleString()}</td>
                              <td style={{ ...s.td, color: pos.unrealized_pnl >= 0 ? '#00d4aa' : '#ff4444', fontWeight: '500' }}>
                                {pos.unrealized_pnl >= 0 ? '+' : ''}₹{pos.unrealized_pnl?.toLocaleString()} ({pos.unrealized_pnl_pct}%)
                              </td>
                              <td style={s.td}>{pos.opened_at}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {paperData.trade_history?.length > 0 && (
                  <div style={s.chartCard}>
                    <h3 style={s.chartTitle}>🔄 Trade History</h3>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={s.table}>
                        <thead>
                          <tr>{['Date', 'Ticker', 'Action', 'Price', 'Shares', 'P&L'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                        </thead>
                        <tbody>
                          {paperData.trade_history.map((trade, i) => (
                            <tr key={i} style={{ background: i % 2 === 0 ? '#0d0d0d' : 'transparent' }}>
                              <td style={s.td}>{trade.date}</td>
                              <td style={{ ...s.td, color: '#00d4aa' }}>{trade.ticker}</td>
                              <td style={{ ...s.td, color: trade.action === 'BUY' ? '#00d4aa' : '#ff4444', fontWeight: 'bold' }}>
                                {trade.action === 'BUY' ? '▲ BUY' : '▼ SELL'}
                              </td>
                              <td style={s.td}>₹{trade.price?.toLocaleString()}</td>
                              <td style={s.td}>{trade.shares}</td>
                              <td style={{ ...s.td, color: trade.profit_loss >= 0 ? '#00d4aa' : '#ff4444', fontWeight: '500' }}>
                                {trade.profit_loss !== 0 ? `${trade.profit_loss >= 0 ? '+' : ''}₹${trade.profit_loss?.toLocaleString()}` : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {paperData.open_positions?.length === 0 && paperData.trade_history?.length === 0 && (
                  <div style={{ ...s.card, textAlign: 'center', padding: '40px' }}>
                    <p style={{ fontSize: '40px', marginBottom: '12px' }}>🎯</p>
                    <p style={{ color: '#fff', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>No trades yet</p>
                    <p style={{ color: '#555', fontSize: '13px' }}>Select a stock above and click Auto Trade to start paper trading!</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'retrain' && (
          <div>
            {retrainLoading && (
              <div style={{ ...s.card, textAlign: 'center', padding: '30px' }}>
                <p style={{ fontSize: '30px', marginBottom: '12px' }}>⏳</p>
                <p style={{ color: '#fff', fontSize: '15px', fontWeight: '600', marginBottom: '6px' }}>Retraining AI Models...</p>
                <p style={{ color: '#555', fontSize: '13px' }}>This takes 10-15 minutes. Please wait.</p>
              </div>
            )}

            {retrainResult && (
              <div style={s.card}>
                <h3 style={s.cardTitle}>Retraining Results</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', margin: '16px 0' }}>
                  {[
                    ['Retrained', retrainResult.summary?.retrained, '#00d4aa'],
                    ['Skipped', retrainResult.summary?.skipped, '#888'],
                    ['Failed', retrainResult.summary?.failed, '#ff4444'],
                    ['Duration', `${retrainResult.summary?.duration_seconds}s`, '#f0a500']
                  ].map(([label, value, color]) => (
                    <div key={label} style={{ ...s.metricCard, padding: '12px' }}>
                      <p style={s.metricLabel}>{label}</p>
                      <p style={{ ...s.metricValue, color, fontSize: '20px' }}>{value}</p>
                    </div>
                  ))}
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={s.table}>
                    <thead>
                      <tr>{['Ticker', 'Model', 'Action', 'Accuracy', 'Samples', 'Reason'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {retrainResult.results?.map((r, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? '#0d0d0d' : 'transparent' }}>
                          <td style={{ ...s.td, color: '#00d4aa' }}>{r.ticker}</td>
                          <td style={s.td}>{r.model}</td>
                          <td style={{ ...s.td, color: r.action === 'retrained' ? '#00d4aa' : r.action === 'failed' ? '#ff4444' : '#888', fontWeight: '500' }}>
                            {r.action === 'retrained' ? '✓ Retrained' : r.action === 'skipped' ? '— Skipped' : '✗ Failed'}
                          </td>
                          <td style={s.td}>{r.accuracy ? `${(r.accuracy * 100).toFixed(1)}%` : '—'}</td>
                          <td style={s.td}>{r.samples || '—'}</td>
                          <td style={s.td}>{r.reason || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {retrainStatus && (
              <div style={s.chartCard}>
                <h3 style={s.chartTitle}>📊 Model Status</h3>
                <p style={s.chartSubtitle}>
                  {retrainStatus.fresh_count} fresh · {retrainStatus.outdated_count} outdated · checked {retrainStatus.checked_at}
                </p>
                <div style={{ overflowX: 'auto' }}>
                  <table style={s.table}>
                    <thead>
                      <tr>{['Ticker', 'Model', 'Status', 'Age (days)', 'Last Trained'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {retrainStatus.models?.map((m, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? '#0d0d0d' : 'transparent' }}>
                          <td style={{ ...s.td, color: '#00d4aa' }}>{m.ticker}</td>
                          <td style={s.td}>{m.model}</td>
                          <td style={{ ...s.td, color: m.status === 'Fresh' ? '#00d4aa' : m.status === 'Outdated' ? '#f0a500' : '#ff4444', fontWeight: '500' }}>
                            {m.status === 'Fresh' ? '✓ Fresh' : m.status === 'Outdated' ? '⚠ Outdated' : '✗ Not trained'}
                          </td>
                          <td style={s.td}>{m.age_days}</td>
                          <td style={s.td}>{m.last_trained || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── NEW: Chart tab display ── */}
        {activeTab === 'chart' && (
          <CandlestickChart ticker={chartTicker} />
        )}

      </div>
    </div>
  )
}

const s = {
  container: { minHeight: '100vh', background: '#0a0a0a' },
  navbar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 16px', background: '#111', borderBottom: '1px solid #1e1e1e',
    position: 'sticky', top: 0, zIndex: 100, flexWrap: 'wrap', gap: '8px'
  },
  logo: { color: '#00d4aa', fontSize: '18px', fontWeight: 'bold', letterSpacing: '-0.5px' },
  navCenter: { display: 'none' },
  navTag: { color: '#444', fontSize: '12px' },
  navRight: { display: 'flex', alignItems: 'center', gap: '8px' },
  userBadge: { display: 'flex', alignItems: 'center', gap: '6px' },
  userName: { color: '#888', fontSize: '12px' },
  tierBadge: {
    fontSize: '10px', fontWeight: 'bold', padding: '2px 6px',
    borderRadius: '10px', letterSpacing: '0.05em'
  },
  logoutBtn: {
    padding: '6px 12px', borderRadius: '6px', border: '1px solid #2a2a2a',
    background: 'transparent', color: '#666', cursor: 'pointer', fontSize: '12px'
  },
  main: { maxWidth: '960px', margin: '0 auto', padding: '20px 16px' },
  pageHeader: { marginBottom: '20px' },
  pageTitle: { color: '#fff', fontSize: '20px', fontWeight: '600', marginBottom: '4px' },
  pageSubtitle: { color: '#555', fontSize: '13px', lineHeight: '1.5' },
  tabs: {
    display: 'flex', gap: '6px', marginBottom: '20px',
    flexWrap: 'wrap'
  },
  tab: {
    padding: '8px 14px', borderRadius: '8px', border: '1px solid #2a2a2a',
    background: 'transparent', color: '#555', cursor: 'pointer',
    fontSize: '12px', fontWeight: '500', whiteSpace: 'nowrap'
  },
  tabActive: {
    background: '#00d4aa', color: '#000',
    border: '1px solid #00d4aa', fontWeight: '600'
  },
  controls: {
    background: '#111', borderRadius: '12px',
    padding: '16px', border: '1px solid #1e1e1e', marginBottom: '20px'
  },
  controlRow: {
    display: 'flex', gap: '10px', marginBottom: '14px',
    flexWrap: 'wrap', alignItems: 'flex-end'
  },
  controlItem: { flex: 1, minWidth: '200px' },
  orDivider: {
    display: 'flex', alignItems: 'flex-end',
    paddingBottom: '10px', flexShrink: 0
  },
  orText: { color: '#444', fontSize: '12px', fontWeight: '500' },
  label: {
    color: '#555', fontSize: '10px', display: 'block',
    marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.06em'
  },
  select: {
    width: '100%', padding: '9px 10px', borderRadius: '8px',
    border: '1px solid #2a2a2a', background: '#1a1a1a',
    color: '#fff', fontSize: '14px', outline: 'none'
  },
  input: {
    width: '100%', padding: '9px 10px', borderRadius: '8px',
    border: '1px solid #2a2a2a', background: '#1a1a1a',
    color: '#fff', fontSize: '14px', outline: 'none'
  },
  activeTickerRow: {
    display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px',
    padding: '8px 10px', background: '#0a0a0a',
    borderRadius: '6px', border: '1px solid #1e1e1e', flexWrap: 'wrap'
  },
  activeTickerLabel: { color: '#444', fontSize: '12px' },
  activeTickerValue: { color: '#00d4aa', fontSize: '13px', fontWeight: '600' },
  customBadge: {
    fontSize: '10px', padding: '2px 6px', borderRadius: '4px',
    background: '#00d4aa20', color: '#00d4aa', border: '1px solid #00d4aa40'
  },
  button: {
    width: '100%', padding: '12px', borderRadius: '8px', border: 'none',
    background: '#00d4aa', color: '#000', fontSize: '14px',
    fontWeight: '700', cursor: 'pointer'
  },
  errorBox: {
    background: '#ff444415', border: '1px solid #ff444440',
    borderRadius: '8px', padding: '10px 14px', marginBottom: '16px',
    color: '#ff6666', fontSize: '13px'
  },
  card: {
    background: '#111', borderRadius: '12px',
    padding: '16px', border: '1px solid #1e1e1e', marginBottom: '20px'
  },
  cardHeader: { marginBottom: '16px' },
  cardTitle: { color: '#fff', fontSize: '15px', fontWeight: '600' },
  signalRow: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: '24px',
    flexWrap: 'wrap', gap: '16px'
  },
  signal: {
    fontSize: '32px', fontWeight: 'bold', border: '2px solid',
    borderRadius: '10px', padding: '8px 24px',
    display: 'inline-block', letterSpacing: '2px'
  },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '12px' },
  stat: { display: 'flex', flexDirection: 'column', gap: '4px' },
  statLabel: { color: '#444', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' },
  statVal: { color: '#fff', fontSize: '13px', fontWeight: '500' },
  barBg: { height: '7px', background: '#1e1e1e', borderRadius: '4px', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: '4px', transition: 'width 0.6s ease' },
  confidenceRow: {
    display: 'flex', gap: '12px', marginTop: '16px',
    paddingTop: '16px', borderTop: '1px solid #1e1e1e', flexWrap: 'wrap'
  },
  confItem: { display: 'flex', flexDirection: 'column', gap: '4px' },
  confLabel: { color: '#444', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' },
  confVal: { color: '#00d4aa', fontSize: '15px', fontWeight: '600' },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3,1fr)',
    gap: '10px', marginBottom: '16px'
  },
  metricCard: {
    background: '#111', borderRadius: '10px', padding: '14px',
    border: '1px solid #1e1e1e', textAlign: 'center'
  },
  metricLabel: {
    color: '#555', fontSize: '10px', textTransform: 'uppercase',
    letterSpacing: '0.06em', marginBottom: '8px'
  },
  metricValue: { fontSize: '20px', fontWeight: '700' },
  chartCard: {
    background: '#111', borderRadius: '12px', padding: '16px',
    border: '1px solid #1e1e1e', marginBottom: '14px'
  },
  chartTitle: { color: '#fff', fontSize: '14px', fontWeight: '600', marginBottom: '4px' },
  chartSubtitle: { color: '#555', fontSize: '12px', marginBottom: '16px' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: '480px' },
  th: {
    color: '#444', fontSize: '10px', textTransform: 'uppercase',
    letterSpacing: '0.06em', padding: '8px 12px',
    textAlign: 'left', borderBottom: '1px solid #1e1e1e'
  },
  td: { color: '#888', fontSize: '12px', padding: '8px 12px', borderBottom: '1px solid #111' }
}