import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { stockAPI } from '../services/api'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
  PieChart, Pie, Cell
} from 'recharts'
import CandlestickChart from '../components/CandlestickChart'
import AnimatedBackground from '../components/AnimatedBackground'

const STOCKS = [
  { group:'Indian Stocks (NSE)', options:[
    { label:'Reliance Industries', value:'RELIANCE.NS' },
    { label:'TCS', value:'TCS.NS' },
    { label:'Infosys', value:'INFY.NS' },
    { label:'HDFC Bank', value:'HDFCBANK.NS' },
    { label:'ICICI Bank', value:'ICICIBANK.NS' },
    { label:'Wipro', value:'WIPRO.NS' },
    { label:'Adani Enterprises', value:'ADANIENT.NS' },
    { label:'Bajaj Finance', value:'BAJFINANCE.NS' },
    { label:'ITC', value:'ITC.NS' },
  ]},
  { group:'US Stocks', options:[
    { label:'Apple', value:'AAPL' },
    { label:'Google', value:'GOOGL' },
    { label:'Microsoft', value:'MSFT' },
    { label:'Tesla', value:'TSLA' },
    { label:'Amazon', value:'AMZN' },
  ]},
  { group:'Crypto', options:[
    { label:'Bitcoin', value:'BTC-USD' },
    { label:'Ethereum', value:'ETH-USD' },
  ]},
  { group:'Indices', options:[
    { label:'Nifty 50', value:'^NSEI' },
    { label:'S&P 500', value:'^GSPC' },
  ]},
]

const ALL_TICKERS = STOCKS.flatMap(g => g.options)
const PIE_COLORS = ['#00d4aa','#534AB7','#f0a500','#ff4444','#00b8d9']
const SIG = { BUY:'#00d4aa', SELL:'#ff4444', HOLD:'#f0a500' }
const TABS = [
  { key:'predict', label:'🤖 AI Predictor' },
  { key:'backtest', label:'📈 Backtester' },
  { key:'portfolio', label:'📊 Portfolio' },
  { key:'paper', label:'🎯 Paper Trading' },
  { key:'retrain', label:'🔄 Auto Retrain' },
  { key:'chart', label:'📉 Charts' },
]

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
  const [selectedTickers, setSelectedTickers] = useState(['RELIANCE.NS','TCS.NS','BTC-USD'])
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
          const r = await stockAPI.explain(activeTicker)
          if (!r.data.error) setExplanation(r.data)
        } catch {}
        try {
          const r = await stockAPI.sentiment(activeTicker)
          if (!r.data.error) setSentiment(r.data)
        } catch {}
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

  const handlePortfolioBacktest = async () => {
    if (selectedTickers.length < 2) {
      setError('Please select at least 2 stocks')
      return
    }
    setPfLoading(true)
    setError('')
    setPortfolioData(null)
    try {
      const res = await stockAPI.portfolioBacktest(selectedTickers, capital)
      if (res.data.error) {
        setError(res.data.error)
      } else {
        setPortfolioData(res.data)
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Portfolio backtest failed.')
    } finally {
      setPfLoading(false)
    }
  }

  const handleDownloadReport = () => window.open(stockAPI.reportUrl(activeTicker, capital, token), '_blank')

  const handleAlert = async () => {
    if (!alertEmail) return
    setAlertLoading(true)
    try {
      const res = await stockAPI.sendAlert(activeTicker, alertEmail)
      if (res.data.success) {
        setAlertSent(true)
        setTimeout(() => setAlertSent(false), 5000)
      }
    } catch {}
    finally {
      setAlertLoading(false)
    }
  }

  const toggleTicker = (val) => {
    if (selectedTickers.includes(val)) {
      if (selectedTickers.length > 2) {
        setSelectedTickers(selectedTickers.filter(t => t !== val))
      }
    } else {
      if (selectedTickers.length < 5) {
        setSelectedTickers([...selectedTickers, val])
      }
    }
  }

  const loadPaperPortfolio = async () => {
    try {
      const r = await stockAPI.paperPortfolio()
      setPaperData(r.data)
    } catch {}
  }

  const handlePaperTrade = async () => {
    setPaperLoading(true)
    setTradeResult(null)
    try {
      const r = await stockAPI.paperAutoTrade(paperTicker)
      setTradeResult(r.data)
      await loadPaperPortfolio()
    } catch {}
    finally {
      setPaperLoading(false)
    }
  }

  const handlePaperReset = async () => {
    if (!window.confirm('Reset portfolio to ₹1,00,000?')) return
    await stockAPI.paperReset()
    await loadPaperPortfolio()
    setTradeResult(null)
  }

  const loadRetrainStatus = async () => {
    try {
      const r = await stockAPI.retrainStatus()
      setRetrainStatus(r.data)
    } catch {}
  }

  const handleRetrain = async (force = false) => {
    setRetrainLoading(true)
    setRetrainResult(null)
    try {
      const r = await stockAPI.retrainRun(force)
      setRetrainResult(r.data)
      await loadRetrainStatus()
    } catch {}
    finally {
      setRetrainLoading(false)
    }
  }

  const switchTab = (key) => {
    setActiveTab(key)
    setError('')
    setPrediction(null)
    setBacktestData(null)
    setPortfolioData(null)
    setExplanation(null)
    setSentiment(null)
    setAlertSent(false)
    setRetrainResult(null)
  }

  const inp = {
    width:'100%', padding:'10px 12px', borderRadius:'10px',
    border:'1px solid rgba(255,255,255,0.07)', background:'rgba(255,255,255,0.03)',
    color:'#fff', fontSize:'13px', outline:'none', transition:'all 0.2s'
  }

  const StockSelect = ({ value, onChange, disabled }) => (
    <select style={{ ...inp, background:'rgba(0,0,0,0.5)' }} value={value} onChange={onChange} disabled={disabled}>
      {STOCKS.map(g => (
        <optgroup key={g.group} label={g.group}>
          {g.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </optgroup>
      ))}
    </select>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#080808', position:'relative' }}>
      <AnimatedBackground />

      {/* Navbar */}
      <div style={{
        display:'flex', justifyContent:'space-between', alignItems:'center',
        padding:'14px 28px', position:'sticky', top:0, zIndex:101,
        background:'rgba(5,5,5,0.92)', backdropFilter:'blur(30px)', WebkitBackdropFilter:'blur(30px)',
        borderBottom:'1px solid rgba(0,212,170,0.1)', flexWrap:'wrap', gap:'8px'
      }}>
        <span style={{
          fontSize:'20px', fontWeight:'700', letterSpacing:'-0.5px',
          background:'linear-gradient(135deg, #00ffcc, #00d4aa, #00a884)',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent'
        }}>TradeForge</span>
        <span style={{ color:'rgba(255,255,255,0.08)', fontSize:'12px', flex:1, textAlign:'center' }}>
          AI-Powered Trading Strategy Backtester
        </span>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <span style={{ color:'#444', fontSize:'12px' }}>{user?.username}</span>
          <span style={{
            fontSize:'10px', fontWeight:'700', padding:'2px 8px', borderRadius:'20px', letterSpacing:'0.05em',
            background:user?.tier==='pro'?'rgba(240,165,0,0.1)':'rgba(0,212,170,0.1)',
            color:user?.tier==='pro'?'#f0a500':'#00d4aa',
            border:`1px solid ${user?.tier==='pro'?'rgba(240,165,0,0.2)':'rgba(0,212,170,0.2)'}`
          }}>{user?.tier?.toUpperCase()}</span>
          <button onClick={logout} style={{ padding:'6px 12px', borderRadius:'8px', border:'1px solid rgba(255,255,255,0.07)', background:'transparent', color:'#444', cursor:'pointer', fontSize:'12px' }}>
            Logout
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ maxWidth:'960px', margin:'0 auto', padding:'28px 20px 60px', position:'relative', zIndex:1 }}>
        {/* Page header */}
        <div style={{ marginBottom:'24px' }}>
          <h2 style={{ color:'#fff', fontSize:'22px', fontWeight:'600', marginBottom:'5px' }}>
            {activeTab==='predict'?'AI Signal Predictor':activeTab==='backtest'?'Strategy Backtester':activeTab==='portfolio'?'Portfolio Backtester':activeTab==='paper'?'Paper Trading':activeTab==='chart'?'Candlestick Charts':'Auto Model Retraining'}
          </h2>
          <p style={{ color:'rgba(255,255,255,0.2)', fontSize:'13px', lineHeight:'1.5' }}>
            {activeTab==='predict'?'Real-time BUY / SELL / HOLD signals powered by LSTM + XGBoost ensemble':activeTab==='backtest'?'Simulate your strategy against years of real market data':activeTab==='portfolio'?'Backtest a multi-stock portfolio and analyse combined performance':activeTab==='paper'?'Trade with virtual money using live AI signals — no real money at risk':activeTab==='chart'?'Interactive candlestick charts with OHLCV data':'Keep AI models fresh by retraining with latest market data automatically'}
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:'6px', marginBottom:'24px', flexWrap:'wrap' }}>
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => switchTab(tab.key)}
              style={{
                padding:'8px 16px', borderRadius:'8px', cursor:'pointer', fontSize:'12px',
                fontWeight:activeTab===tab.key?'700':'500', transition:'all 0.2s', whiteSpace:'nowrap',
                border:activeTab===tab.key?'1px solid #00d4aa':'1px solid rgba(255,255,255,0.07)',
                background:activeTab===tab.key?'#00d4aa':'rgba(255,255,255,0.02)',
                color:activeTab===tab.key?'#000':'rgba(255,255,255,0.35)',
                boxShadow:activeTab===tab.key?'0 0 20px rgba(0,212,170,0.35)':'none'
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Controls */}
        {(activeTab==='predict'||activeTab==='backtest') && (
          <div style={s.box}>
            <div style={{ display:'flex', gap:'10px', marginBottom:'14px', flexWrap:'wrap', alignItems:'flex-end' }}>
              <div style={{ flex:1, minWidth:'180px' }}>
                <label style={s.lbl}>Stock / Asset</label>
                <StockSelect value={ticker} onChange={e => { setTicker(e.target.value); setUseCustom(false); setCustomTicker('') }} disabled={useCustom} />
              </div>
              <div style={{ display:'flex', alignItems:'flex-end', paddingBottom:'10px', color:'rgba(255,255,255,0.15)', fontSize:'11px', fontWeight:'500' }}>OR</div>
              <div style={{ flex:1, minWidth:'160px' }}>
                <label style={s.lbl}>Custom Symbol</label>
                <input style={{ ...inp, borderColor:useCustom?'rgba(0,212,170,0.4)':'rgba(255,255,255,0.07)' }}
                  placeholder="e.g. ZOMATO.NS, NVDA" value={customTicker}
                  onChange={e => { setCustomTicker(e.target.value); setUseCustom(e.target.value.length>0) }} />
              </div>
              {activeTab==='backtest' && (
                <div style={{ flex:1, minWidth:'130px' }}>
                  <label style={s.lbl}>Capital (₹)</label>
                  <input style={inp} type="number" value={capital} onChange={e => setCapital(Number(e.target.value))} />
                </div>
              )}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 12px', background:'rgba(0,212,170,0.04)', borderRadius:'8px', border:'1px solid rgba(0,212,170,0.1)', marginBottom:'14px' }}>
              <span style={{ color:'rgba(255,255,255,0.2)', fontSize:'10px', textTransform:'uppercase', letterSpacing:'0.08em' }}>Analysing</span>
              <span style={{ color:'#00d4aa', fontSize:'13px', fontWeight:'600' }}>{activeTicker}</span>
              {useCustom && <span style={{ fontSize:'10px', padding:'1px 6px', borderRadius:'4px', background:'rgba(0,212,170,0.1)', color:'#00d4aa', border:'1px solid rgba(0,212,170,0.2)' }}>Custom</span>}
            </div>
            <button style={{ ...s.btn, opacity:loading||btLoading?0.7:1 }}
              onClick={activeTab==='predict'?handlePredict:handleBacktest} disabled={loading||btLoading}>
              {loading||btLoading?'⏳ Analysing...':activeTab==='predict'?'🔍 Get AI Signal':'🚀 Run Backtest'}
            </button>
          </div>
        )}

        {activeTab==='portfolio' && (
          <div style={s.box}>
            <p style={{ ...s.lbl, marginBottom:'12px' }}>Select 2-5 stocks for your portfolio:</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', marginBottom:'14px' }}>
              {ALL_TICKERS.map(o => (
                <button key={o.value} onClick={() => toggleTicker(o.value)}
                  style={{
                    padding:'5px 11px', borderRadius:'20px', fontSize:'11px', fontWeight:'500',
                    cursor:'pointer', border:'1px solid', transition:'all 0.2s',
                    background:selectedTickers.includes(o.value)?'rgba(0,212,170,0.12)':'rgba(255,255,255,0.02)',
                    color:selectedTickers.includes(o.value)?'#00d4aa':'rgba(255,255,255,0.3)',
                    borderColor:selectedTickers.includes(o.value)?'rgba(0,212,170,0.35)':'rgba(255,255,255,0.06)'
                  }}>{o.label}</button>
              ))}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 12px', background:'rgba(0,212,170,0.04)', borderRadius:'8px', border:'1px solid rgba(0,212,170,0.1)', marginBottom:'14px' }}>
              <span style={{ color:'rgba(255,255,255,0.2)', fontSize:'11px' }}>Selected:</span>
              <span style={{ color:'#00d4aa', fontSize:'12px' }}>{selectedTickers.join(' + ')}</span>
              <span style={{ color:'rgba(255,255,255,0.15)', fontSize:'11px' }}>({selectedTickers.length}/5)</span>
            </div>
            <div style={{ marginBottom:'14px' }}>
              <label style={s.lbl}>Total Capital (₹)</label>
              <input style={inp} type="number" value={capital} onChange={e => setCapital(Number(e.target.value))} />
            </div>
            <button style={{ ...s.btn, opacity:pfLoading?0.7:1 }} onClick={handlePortfolioBacktest} disabled={pfLoading}>
              {pfLoading?'⏳ Running...':'📊 Run Portfolio Backtest'}
            </button>
          </div>
        )}

        {activeTab==='paper' && (
          <div style={s.box}>
            <div style={{ marginBottom:'14px' }}>
              <label style={s.lbl}>Stock / Asset</label>
              <StockSelect value={paperTicker} onChange={e => setPaperTicker(e.target.value)} />
            </div>
            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={handlePaperTrade} disabled={paperLoading} style={{ ...s.btn, flex:1, opacity:paperLoading?0.7:1 }}>
                {paperLoading?'⏳ Trading...':'🤖 Auto Trade with AI Signal'}
              </button>
              <button onClick={handlePaperReset} style={{ padding:'12px 18px', borderRadius:'10px', border:'1px solid rgba(255,68,68,0.3)', background:'transparent', color:'#ff5050', fontSize:'13px', fontWeight:'600', cursor:'pointer', whiteSpace:'nowrap' }}>
                Reset
              </button>
            </div>
          </div>
        )}

        {activeTab==='retrain' && (
          <div style={s.box}>
            <p style={{ color:'rgba(255,255,255,0.25)', fontSize:'13px', marginBottom:'16px', lineHeight:'1.7' }}>
              TradeForge automatically checks if AI models are outdated (older than 7 days) and retrains them with latest market data. You can also force retrain all models manually.
            </p>
            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={() => handleRetrain(false)} disabled={retrainLoading} style={{ ...s.btn, flex:1, opacity:retrainLoading?0.7:1 }}>
                {retrainLoading?'⏳ Retraining...':'🔄 Smart Retrain (outdated only)'}
              </button>
              <button onClick={() => handleRetrain(true)} disabled={retrainLoading}
                style={{ padding:'12px 18px', borderRadius:'10px', border:'1px solid rgba(240,165,0,0.3)', background:'transparent', color:'#f0a500', fontSize:'13px', fontWeight:'600', cursor:'pointer', whiteSpace:'nowrap', opacity:retrainLoading?0.7:1 }}>
                ⚡ Force All
              </button>
            </div>
          </div>
        )}

        {activeTab==='chart' && (
          <div style={s.box}>
            <label style={s.lbl}>Stock / Asset</label>
            <StockSelect value={chartTicker} onChange={e => setChartTicker(e.target.value)} />
          </div>
        )}

        {error && (
          <div style={{ background:'rgba(255,80,80,0.07)', border:'1px solid rgba(255,80,80,0.2)', borderRadius:'10px', padding:'10px 14px', marginBottom:'18px', color:'#ff6b6b', fontSize:'13px' }}>
            ⚠️ {error}
          </div>
        )}

        {/* AI Predictor */}
        {activeTab==='predict' && prediction && (
          <div style={s.card} className="animate-fade">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
              <h3 style={s.cardTitle}>Signal for {prediction.ticker}</h3>
              <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.15)' }}>Today</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'24px', flexWrap:'wrap', gap:'16px' }}>
              <div>
                <span style={s.lbl}>Today's Signal</span>
                <div style={{
                  marginTop:'6px', background:`${SIG[prediction.signal]}10`,
                  border:`2px solid ${SIG[prediction.signal]}40`, borderRadius:'12px',
                  padding:'10px 28px', display:'inline-block',
                  animation:'pulse 2.5s infinite',
                  boxShadow:`0 0 40px ${SIG[prediction.signal]}20`
                }}>
                  <div style={{ color:SIG[prediction.signal], fontSize:'36px', fontWeight:'700', letterSpacing:'3px' }}>
                    {prediction.signal}
                  </div>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
                {[
                  ['Model', prediction.model, '#fff'],
                  ['LSTM Vote', prediction.votes?.LSTM, SIG[prediction.votes?.LSTM]||'#fff'],
                  ['XGBoost Vote', prediction.votes?.XGBoost, SIG[prediction.votes?.XGBoost]||'#fff'],
                  ['Agreement', prediction.votes?.agreement?'Yes ✓':'No ✗', prediction.votes?.agreement?'#00d4aa':'#ff4444']
                ].map(([k,v,c]) => (
                  <div key={k}>
                    <span style={s.lbl}>{k}</span>
                    <span style={{ color:c, fontSize:'13px', fontWeight:'500', display:'block' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <span style={s.lbl}>Probability Distribution</span>
            {['BUY','SELL','HOLD'].map(sig => (
              <div key={sig} style={{ marginBottom:'12px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'5px' }}>
                  <span style={{ color:SIG[sig], fontSize:'12px', fontWeight:'500' }}>{sig}</span>
                  <span style={{ color:'rgba(255,255,255,0.25)', fontSize:'12px' }}>{prediction.probabilities?.[sig]}%</span>
                </div>
                <div style={{ height:'5px', background:'rgba(255,255,255,0.05)', borderRadius:'3px', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${prediction.probabilities?.[sig]}%`, background:SIG[sig], borderRadius:'3px', transition:'width 0.8s ease', boxShadow:`0 0 6px ${SIG[sig]}60` }} />
                </div>
              </div>
            ))}

            <div style={s.divider} />
            <div style={{ display:'flex', gap:'24px', flexWrap:'wrap' }}>
              {[['LSTM Confidence', prediction.lstm_confidence], ['XGBoost Confidence', prediction.xgb_confidence]].map(([l,v]) => (
                <div key={l}>
                  <span style={s.lbl}>{l}</span>
                  <span style={{ color:'#00d4aa', fontSize:'18px', fontWeight:'600', display:'block' }}>{v}%</span>
                </div>
              ))}
            </div>

            {explanation && (
              <>
                <div style={s.divider} />
                <span style={s.lbl}>🧠 Why did the AI signal {explanation.signal}?</span>
                <div style={{ background:'rgba(0,0,0,0.5)', borderRadius:'10px', padding:'12px 14px', marginBottom:'14px', border:'1px solid rgba(255,255,255,0.05)', fontSize:'13px', color:'rgba(255,255,255,0.35)', lineHeight:'1.6' }}>
                  {explanation.explanation}
                </div>
                {explanation.top_features?.map((f,i) => (
                  <div key={i} style={{ marginBottom:'10px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                      <span style={{ color:f.impact==='positive'?'#00d4aa':'#ff5050', fontSize:'12px', fontWeight:'500' }}>
                        {f.impact==='positive'?'▲':'▼'} {f.label}
                      </span>
                      <span style={{ color:'rgba(255,255,255,0.2)', fontSize:'11px' }}>{f.impact==='positive'?'+':''}{f.shap_value}</span>
                    </div>
                    <div style={{ height:'4px', background:'rgba(255,255,255,0.04)', borderRadius:'2px', overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${Math.min(f.abs_importance*300,100)}%`, background:f.impact==='positive'?'#00d4aa':'#ff5050', borderRadius:'2px' }} />
                    </div>
                  </div>
                ))}
              </>
            )}

            {sentiment && (
              <>
                <div style={s.divider} />
                <span style={s.lbl}>📰 News Sentiment</span>
                <div style={{ background:'rgba(0,0,0,0.4)', borderRadius:'10px', padding:'14px', marginBottom:'12px', border:`1px solid ${sentiment.sentiment==='positive'?'rgba(0,212,170,0.2)':sentiment.sentiment==='negative'?'rgba(255,80,80,0.2)':'rgba(255,255,255,0.05)'}` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
                    <span style={{ fontSize:'13px', fontWeight:'600', color:sentiment.sentiment==='positive'?'#00d4aa':sentiment.sentiment==='negative'?'#ff5050':'rgba(255,255,255,0.5)' }}>{sentiment.signal_impact}</span>
                    <span style={{ fontSize:'10px', padding:'2px 8px', borderRadius:'10px', background:'rgba(255,255,255,0.04)', color:'rgba(255,255,255,0.3)' }}>{sentiment.headlines_analysed} headlines</span>
                  </div>
                  <div style={{ display:'flex', gap:'16px' }}>
                    <span style={{ fontSize:'11px', color:'#00d4aa' }}>▲ {sentiment.positive_news}</span>
                    <span style={{ fontSize:'11px', color:'#ff5050' }}>▼ {sentiment.negative_news}</span>
                    <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.2)' }}>➡ {sentiment.neutral_news}</span>
                  </div>
                </div>
                {sentiment.headlines?.slice(0, 4).map((h,i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'10px 0', borderBottom:i<3?'1px solid rgba(255,255,255,0.04)':'none', gap:'12px' }}>
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:'12px', color:'rgba(255,255,255,0.6)', lineHeight:'1.4', marginBottom:'3px' }}>{h.title}</p>
                      <span style={{ fontSize:'10px', color:'rgba(255,255,255,0.2)' }}>{h.source} · {h.published_at}</span>
                    </div>
                    <span style={{
                      fontSize:'10px', fontWeight:'600', padding:'2px 8px', borderRadius:'10px', flexShrink:0, whiteSpace:'nowrap',
                      background:h.sentiment==='positive'?'rgba(0,212,170,0.1)':h.sentiment==='negative'?'rgba(255,80,80,0.1)':'rgba(255,255,255,0.04)',
                      color:h.sentiment==='positive'?'#00d4aa':h.sentiment==='negative'?'#ff5050':'rgba(255,255,255,0.3)',
                      border:`1px solid ${h.sentiment==='positive'?'rgba(0,212,170,0.2)':h.sentiment==='negative'?'rgba(255,80,80,0.2)':'rgba(255,255,255,0.07)'}`
                    }}>{h.sentiment} {h.confidence}%</span>
                  </div>
                ))}
              </>
            )}

            <div style={s.divider} />
            <span style={s.lbl}>📧 Email Signal Alert</span>
            <div style={{ display:'flex', gap:'10px' }}>
              <input style={{ ...inp, flex:1 }} type="email" placeholder="Enter email" value={alertEmail} onChange={e => setAlertEmail(e.target.value)} />
              <button onClick={handleAlert} disabled={alertLoading||!alertEmail}
                style={{ padding:'10px 16px', borderRadius:'10px', border:'1px solid rgba(0,212,170,0.3)', background:'transparent', color:'#00d4aa', fontSize:'12px', fontWeight:'600', cursor:'pointer', whiteSpace:'nowrap', opacity:alertLoading||!alertEmail?0.5:1 }}>
                {alertLoading?'⏳':alertSent?'✓ Sent!':'📧 Send'}
              </button>
            </div>
            {alertSent && <p style={{ color:'#00d4aa', fontSize:'12px', marginTop:'8px' }}>✓ Alert sent!</p>}
          </div>
        )}

        {/* Backtester */}
        {activeTab==='backtest' && backtestData && (
          <div className="animate-fade">
            <div style={s.metricsGrid}>
              {[
                ['Total Return', `${backtestData.total_return}%`, backtestData.total_return>0?'#00d4aa':'#ff5050'],
                ['CAGR', `${backtestData.cagr}%`, '#00d4aa'],
                ['Max Drawdown', `${backtestData.max_drawdown}%`, '#ff5050'],
                ['Win Rate', `${backtestData.win_rate}%`, '#f0a500'],
                ['Total Trades', backtestData.total_trades, '#fff'],
                ['Buy & Hold', `${backtestData.buy_hold_return}%`, backtestData.total_return>backtestData.buy_hold_return?'#00d4aa':'#f0a500']
              ].map(([l,v,c]) => (
                <div key={l} style={s.metricCard}>
                  <p style={s.metricLbl}>{l}</p>
                  <p style={{ fontSize:'22px', fontWeight:'700', color:c }}>{v}</p>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'14px' }}>
              <button onClick={handleDownloadReport} style={{ padding:'9px 18px', borderRadius:'10px', border:'1px solid rgba(0,212,170,0.3)', background:'transparent', color:'#00d4aa', fontSize:'12px', fontWeight:'600', cursor:'pointer' }}>
                📄 Download PDF Report
              </button>
            </div>
            <div style={s.chartCard}>
              <h3 style={s.chartTitle}>📈 Portfolio Equity Curve</h3>
              <p style={s.chartSub}>₹{backtestData.initial_capital?.toLocaleString()} → ₹{backtestData.final_value?.toLocaleString()}</p>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={backtestData.portfolio_values} margin={{top:10,right:20,left:10,bottom:10}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{fill:'rgba(255,255,255,0.2)',fontSize:11}} tickFormatter={d=>d.slice(2,7)} />
                  <YAxis tick={{fill:'rgba(255,255,255,0.2)',fontSize:11}} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{background:'rgba(8,8,8,0.95)',border:'1px solid rgba(0,212,170,0.2)',borderRadius:'10px'}} labelStyle={{color:'rgba(255,255,255,0.4)',fontSize:'12px'}} formatter={v=>[`₹${Number(v).toLocaleString()}`,'Portfolio']} />
                  <ReferenceLine y={backtestData.initial_capital} stroke="rgba(255,255,255,0.08)" strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="value" stroke="#00d4aa" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={s.chartCard}>
              <h3 style={s.chartTitle}>🔄 Recent Trades</h3>
              <div style={{ overflowX:'auto' }}>
                <table style={s.table}>
                  <thead>
                    <tr>{['Date','Action','Price','Shares','P&L'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {backtestData.trades?.map((t,i) => (
                      <tr key={i} style={{ background:i%2===0?'rgba(255,255,255,0.01)':'transparent' }}>
                        <td style={s.td}>{t.date}</td>
                        <td style={{ ...s.td, color:t.action==='BUY'?'#00d4aa':'#ff5050', fontWeight:'600' }}>{t.action==='BUY'?'▲ BUY':'▼ SELL'}</td>
                        <td style={s.td}>₹{t.price?.toLocaleString()}</td>
                        <td style={s.td}>{t.shares?.toLocaleString()}</td>
                        <td style={{ ...s.td, color:t.profit>0?'#00d4aa':t.profit<0?'#ff5050':'rgba(255,255,255,0.2)' }}>{t.profit?`${t.profit>0?'+':''}₹${t.profit?.toLocaleString()}`:'—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Portfolio */}
        {activeTab==='portfolio' && portfolioData && (
          <div className="animate-fade">
            <div style={s.metricsGrid}>
              {[
                ['Portfolio Return', `${portfolioData.total_return}%`, portfolioData.total_return>0?'#00d4aa':'#ff5050'],
                ['CAGR', `${portfolioData.cagr}%`, '#00d4aa'],
                ['Max Drawdown', `${portfolioData.max_drawdown}%`, '#ff5050'],
                ['Best', portfolioData.best_performer?.ticker, '#00d4aa'],
                ['Stocks', portfolioData.stocks_count, '#fff'],
                ['Final Value', `₹${portfolioData.final_value?.toLocaleString()}`, '#f0a500']
              ].map(([l,v,c]) => (
                <div key={l} style={s.metricCard}>
                  <p style={s.metricLbl}>{l}</p>
                  <p style={{ fontSize:l==='Final Value'?'15px':'22px', fontWeight:'700', color:c }}>{v}</p>
                </div>
              ))}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
              <div style={s.chartCard}>
                <h3 style={s.chartTitle}>📊 Allocation</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={portfolioData.allocation} dataKey="allocation_pct" nameKey="ticker" cx="50%" cy="50%" outerRadius={70} label={({ticker,allocation_pct})=>`${ticker} ${allocation_pct}%`}>
                      {portfolioData.allocation?.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={v=>[`${v}%`,'Allocation']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={s.chartCard}>
                <h3 style={s.chartTitle}>🏆 Performance</h3>
                {portfolioData.allocation?.map((stock,i) => (
                  <div key={i} style={{ marginBottom:'12px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'5px' }}>
                      <span style={{ color:'rgba(255,255,255,0.6)', fontSize:'12px' }}>{stock.ticker}</span>
                      <span style={{ color:stock.total_return>0?'#00d4aa':'#ff5050', fontSize:'12px', fontWeight:'600' }}>{stock.total_return>0?'+':''}{stock.total_return}%</span>
                    </div>
                    <div style={{ height:'5px', background:'rgba(255,255,255,0.04)', borderRadius:'3px', overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${Math.min(Math.abs(stock.total_return)/50*100,100)}%`, background:PIE_COLORS[i%PIE_COLORS.length], borderRadius:'3px' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={s.chartCard}>
              <h3 style={s.chartTitle}>📈 Combined Equity Curve</h3>
              <p style={s.chartSub}>₹{portfolioData.initial_capital?.toLocaleString()} → ₹{portfolioData.final_value?.toLocaleString()}</p>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={portfolioData.portfolio_values} margin={{top:10,right:20,left:10,bottom:10}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{fill:'rgba(255,255,255,0.2)',fontSize:11}} tickFormatter={d=>d.slice(2,7)} />
                  <YAxis tick={{fill:'rgba(255,255,255,0.2)',fontSize:11}} tickFormatter={v=>`₹${(v/100000).toFixed(1)}L`} />
                  <Tooltip contentStyle={{background:'rgba(8,8,8,0.95)',border:'1px solid rgba(0,212,170,0.2)',borderRadius:'10px'}} formatter={v=>[`₹${Number(v).toLocaleString()}`,'Portfolio']} />
                  <Line type="monotone" dataKey="value" stroke="#00d4aa" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Paper Trading */}
        {activeTab==='paper' && (
          <div className="animate-fade">
            {tradeResult && (
              <div style={{ ...s.card, borderColor:tradeResult.action==='BUY'?'rgba(0,212,170,0.25)':tradeResult.action==='SELL'?'rgba(255,80,80,0.25)':'rgba(255,255,255,0.07)', marginBottom:'14px' }}>
                <span style={s.lbl}>Last Trade</span>
                <p style={{ color:tradeResult.action==='BUY'?'#00d4aa':tradeResult.action==='SELL'?'#ff5050':'#f0a500', fontSize:'14px', fontWeight:'600', marginBottom:'4px' }}>
                  {tradeResult.action==='BUY'?'▲ BUY':tradeResult.action==='SELL'?'▼ SELL':'➡ HOLD'} — {tradeResult.ticker}
                </p>
                <p style={{ color:'rgba(255,255,255,0.35)', fontSize:'13px' }}>{tradeResult.message}</p>
                {tradeResult.ai_signal && <p style={{ color:'rgba(255,255,255,0.2)', fontSize:'11px', marginTop:'6px' }}>AI: {tradeResult.ai_signal} · Conf: {tradeResult.confidence}%</p>}
              </div>
            )}
            {paperData && (
              <div>
                <div style={s.metricsGrid}>
                  {[
                    ['Cash', `₹${paperData.cash_balance?.toLocaleString()}`, '#fff'],
                    ['Positions', `₹${paperData.positions_value?.toLocaleString()}`, '#00d4aa'],
                    ['Total Value', `₹${paperData.total_value?.toLocaleString()}`, '#00d4aa'],
                    ['Return', `${paperData.total_return}%`, paperData.total_return>=0?'#00d4aa':'#ff5050'],
                    ['P&L', `₹${paperData.total_pnl?.toLocaleString()}`, paperData.total_pnl>=0?'#00d4aa':'#ff5050'],
                    ['Trades', paperData.total_trades, '#fff']
                  ].map(([l,v,c]) => (
                    <div key={l} style={s.metricCard}>
                      <p style={s.metricLbl}>{l}</p>
                      <p style={{ fontSize:'17px', fontWeight:'700', color:c }}>{v}</p>
                    </div>
                  ))}
                </div>
                {paperData.open_positions?.length > 0 && (
                  <div style={s.chartCard}>
                    <h3 style={s.chartTitle}>📂 Open Positions</h3>
                    <div style={{ overflowX:'auto' }}>
                      <table style={s.table}>
                        <thead>
                          <tr>{['Ticker','Shares','Buy Price','Current','Value','P&L','Opened'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
                        </thead>
                        <tbody>
                          {paperData.open_positions.map((p,i) => (
                            <tr key={i} style={{ background:i%2===0?'rgba(255,255,255,0.01)':'transparent' }}>
                              <td style={{ ...s.td, color:'#00d4aa', fontWeight:'600' }}>{p.ticker}</td>
                              <td style={s.td}>{p.shares}</td>
                              <td style={s.td}>₹{p.buy_price?.toLocaleString()}</td>
                              <td style={s.td}>₹{p.current_price?.toLocaleString()}</td>
                              <td style={s.td}>₹{p.current_value?.toLocaleString()}</td>
                              <td style={{ ...s.td, color:p.unrealized_pnl>=0?'#00d4aa':'#ff5050', fontWeight:'500' }}>
                                {p.unrealized_pnl>=0?'+':''}₹{p.unrealized_pnl?.toLocaleString()} ({p.unrealized_pnl_pct}%)
                              </td>
                              <td style={s.td}>{p.opened_at}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {paperData.trade_history?.length > 0 && (
                  <div style={s.chartCard}>
                    <h3 style={s.chartTitle}>🔄 History</h3>
                    <div style={{ overflowX:'auto' }}>
                      <table style={s.table}>
                        <thead>
                          <tr>{['Date','Ticker','Action','Price','Shares','P&L'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
                        </thead>
                        <tbody>
                          {paperData.trade_history.map((t,i) => (
                            <tr key={i} style={{ background:i%2===0?'rgba(255,255,255,0.01)':'transparent' }}>
                              <td style={s.td}>{t.date}</td>
                              <td style={{ ...s.td, color:'#00d4aa' }}>{t.ticker}</td>
                              <td style={{ ...s.td, color:t.action==='BUY'?'#00d4aa':'#ff5050', fontWeight:'600' }}>{t.action==='BUY'?'▲':'▼'} {t.action}</td>
                              <td style={s.td}>₹{t.price?.toLocaleString()}</td>
                              <td style={s.td}>{t.shares}</td>
                              <td style={{ ...s.td, color:t.profit_loss>=0?'#00d4aa':'#ff5050' }}>{t.profit_loss!==0?`${t.profit_loss>=0?'+':''}₹${t.profit_loss?.toLocaleString()}`:'—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {!paperData.open_positions?.length && !paperData.trade_history?.length && (
                  <div style={{ ...s.card, textAlign:'center', padding:'48px' }}>
                    <p style={{ fontSize:'48px', marginBottom:'16px' }}>🎯</p>
                    <p style={{ color:'#fff', fontSize:'16px', fontWeight:'600', marginBottom:'8px' }}>No trades yet</p>
                    <p style={{ color:'rgba(255,255,255,0.2)', fontSize:'13px' }}>Click Auto Trade to start!</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Retrain */}
        {activeTab==='retrain' && (
          <div className="animate-fade">
            {retrainLoading && (
              <div style={{ ...s.card, textAlign:'center', padding:'40px' }}>
                <p style={{ fontSize:'36px', marginBottom:'14px' }}>⏳</p>
                <p style={{ color:'#fff', fontSize:'15px', fontWeight:'600', marginBottom:'6px' }}>Retraining AI Models...</p>
                <p style={{ color:'rgba(255,255,255,0.25)', fontSize:'13px' }}>This takes 10-15 minutes.</p>
              </div>
            )}
            {retrainResult && (
              <div style={s.card}>
                <h3 style={{ ...s.cardTitle, marginBottom:'16px' }}>Retraining Results</h3>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px', marginBottom:'16px' }}>
                  {[
                    ['Retrained', retrainResult.summary?.retrained, '#00d4aa'],
                    ['Skipped', retrainResult.summary?.skipped, 'rgba(255,255,255,0.3)'],
                    ['Failed', retrainResult.summary?.failed, '#ff5050'],
                    ['Duration', `${retrainResult.summary?.duration_seconds}s`, '#f0a500']
                  ].map(([l,v,c]) => (
                    <div key={l} style={{ ...s.metricCard, padding:'12px' }}>
                      <p style={s.metricLbl}>{l}</p>
                      <p style={{ fontSize:'20px', fontWeight:'700', color:c }}>{v}</p>
                    </div>
                  ))}
                </div>
                <div style={{ overflowX:'auto' }}>
                  <table style={s.table}>
                    <thead>
                      <tr>{['Ticker','Model','Action','Accuracy','Samples','Reason'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {retrainResult.results?.map((r,i) => (
                        <tr key={i} style={{ background:i%2===0?'rgba(255,255,255,0.01)':'transparent' }}>
                          <td style={{ ...s.td, color:'#00d4aa' }}>{r.ticker}</td>
                          <td style={s.td}>{r.model}</td>
                          <td style={{ ...s.td, color:r.action==='retrained'?'#00d4aa':r.action==='failed'?'#ff5050':'rgba(255,255,255,0.25)', fontWeight:'500' }}>
                            {r.action==='retrained'?'✓ Retrained':r.action==='skipped'?'— Skipped':'✗ Failed'}
                          </td>
                          <td style={s.td}>{r.accuracy?`${(r.accuracy*100).toFixed(1)}%`:'—'}</td>
                          <td style={s.td}>{r.samples||'—'}</td>
                          <td style={s.td}>{r.reason||'—'}</td>
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
                <p style={s.chartSub}>{retrainStatus.fresh_count} fresh · {retrainStatus.outdated_count} outdated · {retrainStatus.checked_at}</p>
                <div style={{ overflowX:'auto' }}>
                  <table style={s.table}>
                    <thead>
                      <tr>{['Ticker','Model','Status','Age','Last Trained'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {retrainStatus.models?.map((m,i) => (
                        <tr key={i} style={{ background:i%2===0?'rgba(255,255,255,0.01)':'transparent' }}>
                          <td style={{ ...s.td, color:'#00d4aa' }}>{m.ticker}</td>
                          <td style={s.td}>{m.model}</td>
                          <td style={{ ...s.td, color:m.status==='Fresh'?'#00d4aa':m.status==='Outdated'?'#f0a500':'#ff5050', fontWeight:'500' }}>
                            {m.status==='Fresh'?'✓ Fresh':m.status==='Outdated'?'⚠ Outdated':'✗ Missing'}
                          </td>
                          <td style={s.td}>{m.age_days}d</td>
                          <td style={s.td}>{m.last_trained||'—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab==='chart' && <CandlestickChart ticker={chartTicker} />}
      </div>
    </div>
  )
}

const s = {
  box: {
    background:'rgba(10,10,10,0.82)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
    borderRadius:'16px', padding:'20px', border:'1px solid rgba(255,255,255,0.07)', marginBottom:'20px'
  },
  card: {
    background:'rgba(10,10,10,0.82)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
    borderRadius:'16px', padding:'20px', border:'1px solid rgba(255,255,255,0.07)', marginBottom:'16px', transition:'border-color 0.2s'
  },
  cardTitle: { color:'#fff', fontSize:'15px', fontWeight:'600' },
  lbl: { color:'rgba(255,255,255,0.25)', fontSize:'10px', display:'block', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.08em' },
  btn: {
    width:'100%', padding:'13px', borderRadius:'10px', border:'none',
    background:'linear-gradient(135deg, #00d4aa, #00b894)', color:'#000',
    fontSize:'14px', fontWeight:'700', cursor:'pointer',
    boxShadow:'0 4px 30px rgba(0,212,170,0.3)', transition:'all 0.2s'
  },
  divider: { borderTop:'1px solid rgba(255,255,255,0.05)', margin:'20px 0' },
  metricsGrid: { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'16px' },
  metricCard: {
    background:'rgba(10,10,10,0.82)', backdropFilter:'blur(20px)',
    borderRadius:'12px', padding:'16px', border:'1px solid rgba(255,255,255,0.07)', textAlign:'center', transition:'all 0.2s'
  },
  metricLbl: { color:'rgba(255,255,255,0.25)', fontSize:'10px', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:'8px' },
  chartCard: {
    background:'rgba(10,10,10,0.82)', backdropFilter:'blur(20px)',
    borderRadius:'14px', padding:'20px', border:'1px solid rgba(255,255,255,0.07)', marginBottom:'12px'
  },
  chartTitle: { color:'#fff', fontSize:'14px', fontWeight:'600', marginBottom:'4px' },
  chartSub: { color:'rgba(255,255,255,0.2)', fontSize:'12px', marginBottom:'16px' },
  table: { width:'100%', borderCollapse:'collapse', minWidth:'480px' },
  th: { color:'rgba(255,255,255,0.2)', fontSize:'10px', textTransform:'uppercase', letterSpacing:'0.07em', padding:'8px 12px', textAlign:'left', borderBottom:'1px solid rgba(255,255,255,0.05)' },
  td: { color:'rgba(255,255,255,0.45)', fontSize:'12px', padding:'8px 12px', borderBottom:'1px solid rgba(255,255,255,0.03)' }
}