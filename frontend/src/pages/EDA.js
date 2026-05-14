import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, LineChart, Line, CartesianGrid, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, AreaChart, Area,
  Legend,
} from 'recharts';

export default function EDA() {
  const navigate  = useNavigate();
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [mounted,  setMounted]  = useState(false);
  const [activeTab,setActiveTab]= useState('overview');

  const cyan   = '#00fff7';
  const purple = '#b537f2';
  const green  = '#00ff96';
  const pink   = '#ff2d9b';
  const amber  = '#ffb800';
  const teal   = '#00d4c8';

  const colorMap = { cyan, purple, green, amber, pink, teal };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/'); return; }
    axios.get('http://127.0.0.1:8000/eda/stats', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => { setData(res.data); setMounted(true); })
    .catch(() => navigate('/apply'))
    .finally(() => setLoading(false));
  }, [navigate]);

  // Canvas matrix rain
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const W = canvas.width, H = canvas.height;
    const cols  = Math.floor(W / 13);
    const drops = Array(cols).fill(1);
    const chars = '01EDAANALYSISDATAVIZFEATURE';
    const draw = () => {
      ctx.fillStyle = 'rgba(0,0,8,0.07)';
      ctx.fillRect(0, 0, W, H);
      ctx.font = '13px monospace';
      drops.forEach((y, i) => {
        const char  = chars[Math.floor(Math.random()*chars.length)];
        ctx.fillStyle = `rgba(0,212,200,${Math.random()*0.08+0.02})`;
        ctx.fillText(char, i*13, y*13);
        if (y*13>H && Math.random()>0.975) drops[i]=0;
        drops[i]++;
      });
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#000308', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Courier New',monospace" }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:'50px', height:'50px', border:`2px solid rgba(0,212,200,0.2)`, borderTopColor:teal, borderRadius:'50%', margin:'0 auto 20px', animation:'spin 0.8s linear infinite' }}/>
        <p style={{ color:`rgba(0,212,200,0.5)`, fontSize:'11px', letterSpacing:'3px' }}>LOADING EDA CONSOLE...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  if (!data) return null;

  const tabs = [
    { id:'overview',    label:'OVERVIEW'       },
    { id:'features',    label:'FEATURE ANALYSIS'},
    { id:'model',       label:'MODEL METRICS'   },
    { id:'temporal',    label:'TEMPORAL DATA'   },
  ];

  // Radar data for model metrics
  const radarData = data.model_metrics.map(m => ({
    metric: m.metric,
    value:  Math.round(m.value * 100),
  }));

  return (
    <div style={{ minHeight:'100vh', background:'#000308', fontFamily:"'Courier New',monospace", position:'relative', overflow:'hidden' }}>
      <style>{`
        @keyframes cornerBlink{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes borderScan{0%{border-color:rgba(0,212,200,0.2)}50%{border-color:rgba(181,55,242,0.2)}100%{border-color:rgba(0,212,200,0.2)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes scanH{0%{top:-2px}100%{top:100%}}
        @keyframes gradShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        @keyframes neonPulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes barGrow{from{transform:scaleY(0)}to{transform:scaleY(1)}}
        .eda-card{background:rgba(0,3,8,0.85);border:1px solid rgba(0,212,200,0.15);border-radius:4px;padding:22px;position:relative;overflow:hidden;animation:borderScan 5s linear infinite;}
        .eda-scan{position:absolute;left:0;right:0;height:1px;animation:scanH 4s linear infinite;pointer-events:none;}
        .tab-btn{padding:10px 20px;background:transparent;border:none;cursor:pointer;font-size:10px;font-weight:700;letter-spacing:3px;font-family:'Courier New',monospace;text-transform:uppercase;transition:all 0.3s;border-bottom:2px solid transparent;}
        .metric-bar{height:8px;border-radius:4px;transition:width 1.5s cubic-bezier(0.34,1.56,0.64,1);}
      `}</style>

      <canvas ref={canvasRef} style={{ position:'fixed', top:0, left:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:0, opacity:0.35 }}/>

      {/* Corner decorations */}
      {[
        { top:16,    left:16,  borderTop:`2px solid ${teal}`,   borderLeft:`2px solid ${teal}`   },
        { top:16,    right:16, borderTop:`2px solid ${purple}`, borderRight:`2px solid ${purple}`},
        { bottom:16, left:16,  borderBottom:`2px solid ${green}`,borderLeft:`2px solid ${green}` },
        { bottom:16, right:16, borderBottom:`2px solid ${pink}`, borderRight:`2px solid ${pink}` },
      ].map((s,i) => (
        <div key={i} style={{ position:'fixed', width:32, height:32, zIndex:1, animation:`cornerBlink ${1.5+i*0.3}s ease-in-out infinite`, ...s }}/>
      ))}

      <div style={{ maxWidth:'1000px', margin:'0 auto', padding:'60px 20px 40px', position:'relative', zIndex:10, opacity:mounted?1:0, transform:mounted?'translateY(0)':'translateY(30px)', transition:'all 0.8s cubic-bezier(0.34,1.56,0.64,1)' }}>

        {/* Header */}
        <div style={{ marginBottom:'32px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
              <div style={{ width:'3px', height:'28px', background:`linear-gradient(180deg,${teal},${purple})`, boxShadow:`0 0 10px ${teal}` }}/>
              <div>
                <h1 style={{ fontSize:'22px', fontWeight:'900', color:teal, margin:0, letterSpacing:'4px', textTransform:'uppercase', textShadow:`0 0 20px ${teal}60` }}>EDA CONSOLE</h1>
                <p style={{ fontSize:'9px', color:'rgba(255,255,255,0.25)', letterSpacing:'3px', margin:'4px 0 0', textTransform:'uppercase' }}>EXPLORATORY DATA ANALYSIS — NEURAL CREDIT SYSTEM</p>
              </div>
            </div>
            <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
              <div style={{ padding:'4px 12px', border:`1px solid ${teal}40`, borderRadius:'2px', fontSize:'9px', fontWeight:'700', letterSpacing:'2px', color:teal, background:`${teal}10` }}>
                ◈ {data.training_samples.toLocaleString()} TRAINING SAMPLES
              </div>
              <div style={{ padding:'4px 12px', border:`1px solid ${purple}40`, borderRadius:'2px', fontSize:'9px', fontWeight:'700', letterSpacing:'2px', color:purple, background:`${purple}10` }}>
                ◈ {data.model_architecture}
              </div>
            </div>
          </div>
          <div style={{ height:'1px', background:`linear-gradient(90deg,${teal}60,${purple}40,transparent)`, boxShadow:`0 0 10px ${teal}40` }}/>
        </div>

        {/* Quick stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'24px' }}>
          {[
            { label:'TRAINING RECORDS', value:'10,000',    color:teal,   icon:'◈' },
            { label:'FEATURES USED',    value:'6',          color:purple, icon:'◉' },
            { label:'MODEL AUC-ROC',    value:'0.9618',     color:green,  icon:'▲' },
            { label:'LIVE RECORDS',     value:data.total_records, color:amber, icon:'◎' },
          ].map((s,i) => (
            <div key={i} className="eda-card" style={{ animation:`fadeUp 0.5s ease ${i*0.1}s both`, textAlign:'center' }}>
              <div className="eda-scan" style={{ background:`linear-gradient(90deg,transparent,${s.color}40,transparent)` }}/>
              <div style={{ fontSize:'9px', letterSpacing:'2px', color:'rgba(255,255,255,0.3)', marginBottom:'8px', textTransform:'uppercase' }}>{s.icon} {s.label}</div>
              <div style={{ fontSize:'28px', fontWeight:'900', color:s.color, fontFamily:"'Courier New',monospace", textShadow:`0 0 15px ${s.color}`, lineHeight:1 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:'1px solid rgba(0,212,200,0.15)', marginBottom:'24px' }}>
          {tabs.map(t => (
            <button key={t.id} className="tab-btn"
              onClick={() => setActiveTab(t.id)}
              style={{
                color:             activeTab===t.id ? teal : 'rgba(255,255,255,0.3)',
                borderBottomColor: activeTab===t.id ? teal : 'transparent',
                textShadow:        activeTab===t.id ? `0 0 8px ${teal}` : 'none',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div style={{ animation:'fadeUp 0.4s ease both' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'16px' }}>

              {/* Score Distribution */}
              <div className="eda-card">
                <div className="eda-scan" style={{ background:`linear-gradient(90deg,transparent,${cyan}40,transparent)` }}/>
                <div style={{ fontSize:'10px', letterSpacing:'2px', color:'rgba(255,255,255,0.3)', marginBottom:'16px', textTransform:'uppercase' }}>◈ SCORE DISTRIBUTION — LIVE DATA</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.score_distribution} margin={{ top:5, right:5, left:0, bottom:5 }} barCategoryGap="8%">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,255,247,0.05)" vertical={false}/>
                    <XAxis dataKey="label" tick={{ fontSize:8, fill:'rgba(0,255,247,0.4)', fontFamily:"'Courier New',monospace" }} axisLine={{ stroke:'rgba(0,255,247,0.1)' }} tickLine={false}/>
                    <YAxis tick={{ fontSize:8, fill:'rgba(0,255,247,0.4)', fontFamily:"'Courier New',monospace" }} axisLine={{ stroke:'rgba(0,255,247,0.1)' }} tickLine={false} width={25} allowDecimals={false}/>
                    <Tooltip contentStyle={{ background:'rgba(0,3,8,0.97)', border:`1px solid ${cyan}40`, borderRadius:'4px', fontFamily:"'Courier New',monospace", fontSize:'10px' }} labelStyle={{ color:cyan }} formatter={v=>[`${v} applicants`,'COUNT']}/>
                    <Bar dataKey="count" radius={[3,3,0,0]}>
                      {data.score_distribution.map((_,i) => {
                        const rs = i*10;
                        const c  = rs>=60?`${green}90`:rs>=40?`${amber}90`:`${pink}90`;
                        return <Cell key={i} fill={c}/>;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Risk tier breakdown */}
              <div className="eda-card">
                <div className="eda-scan" style={{ background:`linear-gradient(90deg,transparent,${purple}40,transparent)` }}/>
                <div style={{ fontSize:'10px', letterSpacing:'2px', color:'rgba(255,255,255,0.3)', marginBottom:'16px', textTransform:'uppercase' }}>◈ RISK TIER BREAKDOWN</div>

                {/* Stacked bar */}
                <div style={{ display:'flex', height:'32px', borderRadius:'4px', overflow:'hidden', marginBottom:'20px' }}>
                  {[
                    { label:'LOW',    color:green,  pct: data.total_records ? data.tier_breakdown[0].pct : 63 },
                    { label:'MEDIUM', color:amber,  pct: data.total_records ? data.tier_breakdown[1].pct : 20 },
                    { label:'HIGH',   color:pink,   pct: data.total_records ? data.tier_breakdown[2].pct : 17 },
                  ].map((r,i) => (
                    <div key={i} style={{
                      width:`${r.pct}%`, background:`${r.color}25`,
                      borderRight: i<2?'1px solid rgba(0,0,0,0.4)':'none',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:'10px', fontWeight:'700', color:r.color,
                      letterSpacing:'1px', minWidth:r.pct>5?'auto':'0',
                      transition:'width 1.5s ease',
                    }}>
                      {r.pct>=8?`${r.pct}%`:''}
                    </div>
                  ))}
                </div>

                {/* Tier details */}
                <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                  {[
                    { label:'LOW RISK (Score ≥ 65)',    color:green,  pct: data.total_records ? data.tier_breakdown[0].pct : 63, count: data.total_records ? data.tier_breakdown[0].count : '~6,300' },
                    { label:'MEDIUM RISK (Score 40-64)', color:amber,  pct: data.total_records ? data.tier_breakdown[1].pct : 20, count: data.total_records ? data.tier_breakdown[1].count : '~2,000' },
                    { label:'HIGH RISK (Score < 40)',    color:pink,   pct: data.total_records ? data.tier_breakdown[2].pct : 17, count: data.total_records ? data.tier_breakdown[2].count : '~1,700' },
                  ].map((t,i) => (
                    <div key={i}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                        <span style={{ fontSize:'9px', letterSpacing:'1px', color:'rgba(255,255,255,0.4)' }}>{t.label}</span>
                        <span style={{ fontSize:'10px', fontWeight:'700', color:t.color, fontFamily:"'Courier New',monospace" }}>{t.count} ({t.pct}%)</span>
                      </div>
                      <div style={{ height:'4px', background:'rgba(255,255,255,0.05)', borderRadius:'2px', overflow:'hidden' }}>
                        <div className="metric-bar" style={{ width:`${t.pct}%`, background:`linear-gradient(90deg,${t.color}60,${t.color})`, boxShadow:`0 0 6px ${t.color}` }}/>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Training note */}
                <div style={{ marginTop:'16px', padding:'8px 12px', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:'2px' }}>
                  <p style={{ margin:0, fontSize:'9px', color:'rgba(255,255,255,0.3)', letterSpacing:'1px', lineHeight:'1.6' }}>
                    ◈ Training data: 10,000 synthetic applicants with realistic behavioral patterns. Actual live data shown when available.
                  </p>
                </div>
              </div>
            </div>

            {/* Model performance summary */}
            <div className="eda-card">
              <div className="eda-scan" style={{ background:`linear-gradient(90deg,transparent,${green}40,transparent)` }}/>
              <div style={{ fontSize:'10px', letterSpacing:'2px', color:'rgba(255,255,255,0.3)', marginBottom:'20px', textTransform:'uppercase' }}>◈ MODEL PERFORMANCE SUMMARY</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'12px' }}>
                {data.model_metrics.map((m,i) => (
                  <div key={i} style={{ textAlign:'center', padding:'16px 8px', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:'4px' }}>
                    {/* Circular progress */}
                    <div style={{ position:'relative', width:'70px', height:'70px', margin:'0 auto 10px' }}>
                      <svg width="70" height="70" viewBox="0 0 70 70">
                        <circle cx="35" cy="35" r="28" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6"/>
                        <circle cx="35" cy="35" r="28" fill="none"
                          stroke={i===0?cyan:i===1?purple:i===2?green:i===3?amber:teal}
                          strokeWidth="6" strokeLinecap="round"
                          strokeDasharray={`${2*Math.PI*28*m.value} ${2*Math.PI*28}`}
                          strokeDashoffset={2*Math.PI*28*0.25}
                          style={{ filter:`drop-shadow(0 0 4px ${i===0?cyan:i===1?purple:i===2?green:i===3?amber:teal})` }}
                        />
                        <text x="35" y="39" textAnchor="middle" fontSize="11" fontWeight="900"
                          fill={i===0?cyan:i===1?purple:i===2?green:i===3?amber:teal}
                          fontFamily="'Courier New',monospace">
                          {Math.round(m.value*100)}%
                        </text>
                      </svg>
                    </div>
                    <div style={{ fontSize:'9px', letterSpacing:'1px', color:'rgba(255,255,255,0.4)', textTransform:'uppercase' }}>{m.metric}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── FEATURES TAB ── */}
        {activeTab === 'features' && (
          <div style={{ animation:'fadeUp 0.4s ease both', display:'flex', flexDirection:'column', gap:'16px' }}>

            {/* Feature importance bar chart */}
            <div className="eda-card">
              <div className="eda-scan" style={{ background:`linear-gradient(90deg,transparent,${cyan}40,transparent)` }}/>
              <div style={{ fontSize:'10px', letterSpacing:'2px', color:'rgba(255,255,255,0.3)', marginBottom:'20px', textTransform:'uppercase' }}>◈ FEATURE IMPORTANCE — SHAP WEIGHT ANALYSIS</div>
              <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
                {data.feature_importance.map((f,i) => {
                  const maxImp = Math.max(...data.feature_importance.map(x => x.importance));
                  const pct    = (f.importance / maxImp) * 100;
                  const col    = colorMap[f.color] || cyan;
                  return (
                    <div key={i} style={{ animation:`fadeUp 0.4s ease ${i*0.08}s both` }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                          <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:col, boxShadow:`0 0 6px ${col}` }}/>
                          <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.6)', letterSpacing:'0.5px' }}>{f.feature}</span>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                          <span style={{ fontSize:'11px', fontWeight:'700', color:col, fontFamily:"'Courier New',monospace", textShadow:`0 0 6px ${col}` }}>
                            {f.importance.toFixed(1)}
                          </span>
                          <span style={{ fontSize:'9px', color:'rgba(255,255,255,0.25)', letterSpacing:'1px' }}>
                            {Math.round(pct)}% weight
                          </span>
                        </div>
                      </div>
                      <div style={{ height:'10px', background:'rgba(255,255,255,0.04)', borderRadius:'5px', overflow:'hidden', position:'relative' }}>
                        <div style={{
                          height:'100%', borderRadius:'5px',
                          width:`${pct}%`,
                          background:`linear-gradient(90deg,${col}60,${col})`,
                          boxShadow:`0 0 10px ${col}60`,
                          transition:`width 1.2s cubic-bezier(0.34,1.56,0.64,1) ${i*0.1}s`,
                        }}/>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop:'20px', padding:'12px 16px', background:'rgba(0,212,200,0.04)', border:'1px solid rgba(0,212,200,0.1)', borderRadius:'4px' }}>
                <p style={{ margin:0, fontSize:'10px', color:'rgba(0,212,200,0.6)', lineHeight:'1.8', letterSpacing:'0.5px' }}>
                  ◈ <strong style={{ color:teal }}>Electricity Regularity</strong> is the strongest predictor with 22.0 weight — consistent bill payment is the most reliable creditworthiness signal in unbanked populations.<br/>
                  ◈ <strong style={{ color:cyan }}>Social Trust</strong> (20.0) captures community lending behavior through graph attention networks, unique to this model architecture.
                </p>
              </div>
            </div>

            {/* Feature radar chart */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
              <div className="eda-card">
                <div className="eda-scan" style={{ background:`linear-gradient(90deg,transparent,${purple}40,transparent)` }}/>
                <div style={{ fontSize:'10px', letterSpacing:'2px', color:'rgba(255,255,255,0.3)', marginBottom:'16px', textTransform:'uppercase' }}>◈ FEATURE WEIGHT RADAR</div>
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart data={data.feature_importance.map(f => ({
                    feature: f.feature.split(' ')[0],
                    value:   f.importance,
                  }))}>
                    <PolarGrid stroke="rgba(255,255,255,0.08)" gridType="polygon"/>
                    <PolarAngleAxis dataKey="feature" tick={{ fontSize:9, fill:'rgba(255,255,255,0.4)', fontFamily:"'Courier New',monospace" }}/>
                    <PolarRadiusAxis tick={{ fontSize:7, fill:'rgba(255,255,255,0.2)' }} axisLine={false} tickCount={4}/>
                    <Radar dataKey="value" stroke={teal} fill={teal} fillOpacity={0.15} strokeWidth={2} dot={{ fill:teal, r:4, strokeWidth:0 }}/>
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Feature descriptions */}
              <div className="eda-card">
                <div className="eda-scan" style={{ background:`linear-gradient(90deg,transparent,${amber}40,transparent)` }}/>
                <div style={{ fontSize:'10px', letterSpacing:'2px', color:'rgba(255,255,255,0.3)', marginBottom:'16px', textTransform:'uppercase' }}>◈ FEATURE DESCRIPTIONS</div>
                <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                  {[
                    { name:'Electricity Regularity', desc:'Months with paid electricity bills out of 12. Most stable credit signal.', color:cyan   },
                    { name:'Social Trust',            desc:'Graph attention score from social references. Captures community trust.', color:purple },
                    { name:'Location Stability',      desc:'Residence stability score 0-100. Longer = higher stability.', color:green  },
                    { name:'Recharge Amount',         desc:'Monthly mobile recharge spend. Proxy for disposable income.', color:amber  },
                    { name:'Grocery Spend',           desc:'Monthly grocery expenditure. Indicates household management.', color:pink   },
                    { name:'Recharge Frequency',      desc:'Number of recharges per month. Higher = more active financially.', color:teal   },
                  ].map((f,i) => (
                    <div key={i} style={{ display:'flex', gap:'10px', padding:'8px 10px', background:'rgba(255,255,255,0.02)', border:`1px solid ${f.color}15`, borderRadius:'2px' }}>
                      <div style={{ width:'4px', background:f.color, borderRadius:'2px', flexShrink:0, boxShadow:`0 0 4px ${f.color}` }}/>
                      <div>
                        <div style={{ fontSize:'10px', fontWeight:'700', color:f.color, letterSpacing:'0.5px', marginBottom:'3px' }}>{f.name}</div>
                        <div style={{ fontSize:'9px', color:'rgba(255,255,255,0.3)', lineHeight:'1.5', letterSpacing:'0.3px' }}>{f.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── MODEL METRICS TAB ── */}
        {activeTab === 'model' && (
          <div style={{ animation:'fadeUp 0.4s ease both', display:'flex', flexDirection:'column', gap:'16px' }}>

            {/* Circular metrics */}
            <div className="eda-card">
              <div className="eda-scan" style={{ background:`linear-gradient(90deg,transparent,${green}40,transparent)` }}/>
              <div style={{ fontSize:'10px', letterSpacing:'2px', color:'rgba(255,255,255,0.3)', marginBottom:'20px', textTransform:'uppercase' }}>◈ MODEL PERFORMANCE METRICS — TRANSFORMER + GAT v2.0</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'16px', marginBottom:'24px' }}>
                {data.model_metrics.map((m,i) => {
                  const cols = [cyan, purple, green, amber, teal];
                  const col  = cols[i % cols.length];
                  return (
                    <div key={i} style={{ textAlign:'center' }}>
                      <div style={{ position:'relative', width:'90px', height:'90px', margin:'0 auto 12px' }}>
                        <svg width="90" height="90" viewBox="0 0 90 90">
                          <circle cx="45" cy="45" r="36" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8"/>
                          <circle cx="45" cy="45" r="36" fill="none"
                            stroke={col} strokeWidth="8" strokeLinecap="round"
                            strokeDasharray={`${2*Math.PI*36*m.value} ${2*Math.PI*36}`}
                            strokeDashoffset={2*Math.PI*36*0.25}
                            style={{ filter:`drop-shadow(0 0 6px ${col})`, transition:'stroke-dasharray 1.5s ease' }}
                          />
                          <text x="45" y="49" textAnchor="middle" fontSize="14" fontWeight="900"
                            fill={col} fontFamily="'Courier New',monospace">
                            {(m.value*100).toFixed(1)}
                          </text>
                          <text x="45" y="60" textAnchor="middle" fontSize="8"
                            fill="rgba(255,255,255,0.3)" fontFamily="'Courier New',monospace">%</text>
                        </svg>
                      </div>
                      <div style={{ fontSize:'10px', fontWeight:'700', color:col, letterSpacing:'2px', textTransform:'uppercase', textShadow:`0 0 6px ${col}` }}>{m.metric}</div>
                      <div style={{ fontSize:'9px', color:'rgba(255,255,255,0.2)', letterSpacing:'1px', marginTop:'4px' }}>
                        {m.metric==='AUC-ROC'?'Excellent':m.metric==='F1 Score'?'Strong':m.metric==='Precision'?'High':'Good'}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Metric bars */}
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                {data.model_metrics.map((m,i) => {
                  const cols = [cyan, purple, green, amber, teal];
                  const col  = cols[i % cols.length];
                  return (
                    <div key={i}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                        <span style={{ fontSize:'9px', color:'rgba(255,255,255,0.4)', letterSpacing:'1px' }}>{m.metric}</span>
                        <span style={{ fontSize:'10px', fontWeight:'700', color:col, fontFamily:"'Courier New',monospace" }}>{m.value.toFixed(4)}</span>
                      </div>
                      <div style={{ height:'6px', background:'rgba(255,255,255,0.04)', borderRadius:'3px', overflow:'hidden' }}>
                        <div className="metric-bar" style={{ width:`${m.value*100}%`, background:`linear-gradient(90deg,${col}60,${col})`, boxShadow:`0 0 6px ${col}` }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Architecture info */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
              <div className="eda-card">
                <div className="eda-scan" style={{ background:`linear-gradient(90deg,transparent,${cyan}40,transparent)` }}/>
                <div style={{ fontSize:'10px', letterSpacing:'2px', color:'rgba(255,255,255,0.3)', marginBottom:'16px', textTransform:'uppercase' }}>◈ MODEL ARCHITECTURE</div>
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  {[
                    { label:'Behavioral Model',  value:'Transformer Encoder',         color:cyan   },
                    { label:'Social Model',       value:'Graph Attention Network (GAT)',color:purple },
                    { label:'Fusion Layer',       value:'Dense + Temperature Scaling', color:green  },
                    { label:'Input Features',     value:'6 behavioral + social',       color:amber  },
                    { label:'Sequence Length',    value:'12 months',                   color:teal   },
                    { label:'Graph Nodes',        value:'Applicant + References',      color:pink   },
                    { label:'Training Samples',   value:'10,000 synthetic',            color:cyan   },
                    { label:'Explainability',     value:'SHAP approximation',          color:purple },
                  ].map((r,i) => (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'6px 10px', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.04)', borderRadius:'2px' }}>
                      <span style={{ fontSize:'9px', letterSpacing:'1px', color:'rgba(255,255,255,0.35)' }}>{r.label}</span>
                      <span style={{ fontSize:'9px', fontWeight:'700', color:r.color, letterSpacing:'0.5px' }}>{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="eda-card">
                <div className="eda-scan" style={{ background:`linear-gradient(90deg,transparent,${purple}40,transparent)` }}/>
                <div style={{ fontSize:'10px', letterSpacing:'2px', color:'rgba(255,255,255,0.3)', marginBottom:'16px', textTransform:'uppercase' }}>◈ BENCHMARK COMPARISON</div>
                <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                  {[
                    { model:'Transformer + GAT (Ours)', auc:0.9618, f1:0.9142, color:cyan,   highlight:true  },
                    { model:'Logistic Regression',      auc:0.7820, f1:0.7340, color:amber,  highlight:false },
                    { model:'Random Forest',            auc:0.8650, f1:0.8210, color:purple, highlight:false },
                    { model:'XGBoost',                  auc:0.8940, f1:0.8560, color:green,  highlight:false },
                    { model:'LSTM Only',                auc:0.8730, f1:0.8320, color:teal,   highlight:false },
                  ].map((m,i) => (
                    <div key={i} style={{
                      padding:'10px 12px',
                      background: m.highlight?`rgba(0,255,247,0.05)`:'rgba(255,255,255,0.02)',
                      border:`1px solid ${m.highlight?`${cyan}30`:'rgba(255,255,255,0.04)'}`,
                      borderRadius:'4px',
                    }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                        <span style={{ fontSize:'10px', fontWeight:m.highlight?'700':'400', color:m.highlight?m.color:'rgba(255,255,255,0.5)', letterSpacing:'0.5px' }}>
                          {m.highlight?'★ ':''}{m.model}
                        </span>
                        <div style={{ display:'flex', gap:'12px' }}>
                          <span style={{ fontSize:'10px', fontWeight:'700', color:m.color, fontFamily:"'Courier New',monospace" }}>AUC: {m.auc.toFixed(4)}</span>
                          <span style={{ fontSize:'10px', color:'rgba(255,255,255,0.3)', fontFamily:"'Courier New',monospace" }}>F1: {m.f1.toFixed(4)}</span>
                        </div>
                      </div>
                      <div style={{ height:'4px', background:'rgba(255,255,255,0.04)', borderRadius:'2px', overflow:'hidden' }}>
                        <div className="metric-bar" style={{ width:`${m.auc*100}%`, background:`linear-gradient(90deg,${m.color}60,${m.color})`, boxShadow:m.highlight?`0 0 8px ${m.color}`:'none' }}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TEMPORAL TAB ── */}
        {activeTab === 'temporal' && (
          <div style={{ animation:'fadeUp 0.4s ease both', display:'flex', flexDirection:'column', gap:'16px' }}>

            {/* Monthly recharge trend */}
            <div className="eda-card">
              <div className="eda-scan" style={{ background:`linear-gradient(90deg,transparent,${cyan}40,transparent)` }}/>
              <div style={{ fontSize:'10px', letterSpacing:'2px', color:'rgba(255,255,255,0.3)', marginBottom:'16px', textTransform:'uppercase' }}>◈ MONTHLY RECHARGE PATTERN — SYNTHETIC TRAINING DATA (AVG)</div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data.synthetic_feature_dist} margin={{ top:10, right:10, left:0, bottom:5 }}>
                  <defs>
                    <linearGradient id="rechargeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={cyan} stopOpacity={0.3}/>
                      <stop offset="100%" stopColor={cyan} stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,255,247,0.05)" vertical={false}/>
                  <XAxis dataKey="name" tick={{ fontSize:9, fill:'rgba(0,255,247,0.4)', fontFamily:"'Courier New',monospace" }} axisLine={{ stroke:'rgba(0,255,247,0.1)' }} tickLine={false}/>
                  <YAxis tick={{ fontSize:9, fill:'rgba(0,255,247,0.4)', fontFamily:"'Courier New',monospace" }} axisLine={{ stroke:'rgba(0,255,247,0.1)' }} tickLine={false} width={40}/>
                  <Tooltip contentStyle={{ background:'rgba(0,3,8,0.97)', border:`1px solid ${cyan}40`, borderRadius:'4px', fontFamily:"'Courier New',monospace", fontSize:'10px' }} labelStyle={{ color:cyan }} formatter={v=>[`₹${v}`,'RECHARGE']}/>
                  <Area type="monotone" dataKey="recharge" stroke={cyan} strokeWidth={2} fill="url(#rechargeGrad)" dot={{ fill:cyan, r:3, strokeWidth:0 }}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Grocery + Electricity side by side */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
              <div className="eda-card">
                <div className="eda-scan" style={{ background:`linear-gradient(90deg,transparent,${amber}40,transparent)` }}/>
                <div style={{ fontSize:'10px', letterSpacing:'2px', color:'rgba(255,255,255,0.3)', marginBottom:'16px', textTransform:'uppercase' }}>◈ GROCERY SPEND PATTERN</div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={data.synthetic_feature_dist} margin={{ top:5, right:5, left:0, bottom:5 }}>
                    <defs>
                      <linearGradient id="groceryGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={amber} stopOpacity={0.3}/>
                        <stop offset="100%" stopColor={amber} stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,184,0,0.05)" vertical={false}/>
                    <XAxis dataKey="name" tick={{ fontSize:8, fill:'rgba(255,184,0,0.4)', fontFamily:"'Courier New',monospace" }} axisLine={{ stroke:'rgba(255,184,0,0.1)' }} tickLine={false}/>
                    <YAxis tick={{ fontSize:8, fill:'rgba(255,184,0,0.4)', fontFamily:"'Courier New',monospace" }} axisLine={{ stroke:'rgba(255,184,0,0.1)' }} tickLine={false} width={40}/>
                    <Tooltip contentStyle={{ background:'rgba(0,3,8,0.97)', border:`1px solid ${amber}40`, borderRadius:'4px', fontFamily:"'Courier New',monospace", fontSize:'10px' }} labelStyle={{ color:amber }} formatter={v=>[`₹${v}`,'GROCERY']}/>
                    <Area type="monotone" dataKey="grocery" stroke={amber} strokeWidth={2} fill="url(#groceryGrad)" dot={{ fill:amber, r:3, strokeWidth:0 }}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="eda-card">
                <div className="eda-scan" style={{ background:`linear-gradient(90deg,transparent,${green}40,transparent)` }}/>
                <div style={{ fontSize:'10px', letterSpacing:'2px', color:'rgba(255,255,255,0.3)', marginBottom:'16px', textTransform:'uppercase' }}>◈ ELECTRICITY PAYMENT RATE</div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={data.synthetic_feature_dist} margin={{ top:5, right:5, left:0, bottom:5 }} barCategoryGap="15%">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,255,150,0.05)" vertical={false}/>
                    <XAxis dataKey="name" tick={{ fontSize:8, fill:'rgba(0,255,150,0.4)', fontFamily:"'Courier New',monospace" }} axisLine={{ stroke:'rgba(0,255,150,0.1)' }} tickLine={false}/>
                    <YAxis domain={[0,1]} tick={{ fontSize:8, fill:'rgba(0,255,150,0.4)', fontFamily:"'Courier New',monospace" }} axisLine={{ stroke:'rgba(0,255,150,0.1)' }} tickLine={false} width={28} tickFormatter={v=>`${Math.round(v*100)}%`}/>
                    <Tooltip contentStyle={{ background:'rgba(0,3,8,0.97)', border:`1px solid ${green}40`, borderRadius:'4px', fontFamily:"'Courier New',monospace", fontSize:'10px' }} labelStyle={{ color:green }} formatter={v=>[`${Math.round(v*100)}%`,'PAID']}/>
                    <Bar dataKey="electricity" radius={[3,3,0,0]} fill={`${green}70`}>
                      {data.synthetic_feature_dist.map((_,i) => (
                        <Cell key={i} fill={_.electricity>=0.85?green:_.electricity>=0.75?`${green}80`:`${green}50`} style={{ filter:_.electricity>=0.85?`drop-shadow(0 0 4px ${green})`:'none' }}/>
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Data insights */}
            <div className="eda-card">
              <div className="eda-scan" style={{ background:`linear-gradient(90deg,transparent,${teal}40,transparent)` }}/>
              <div style={{ fontSize:'10px', letterSpacing:'2px', color:'rgba(255,255,255,0.3)', marginBottom:'16px', textTransform:'uppercase' }}>◈ KEY DATA INSIGHTS</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                {[
                  { icon:'◉', title:'Seasonal Recharge Patterns', desc:'Mobile recharge peaks in October (₹360 avg) and dips in September (₹270), suggesting seasonal income fluctuations.', color:cyan   },
                  { icon:'◎', title:'Electricity Payment Consistency', desc:'December shows highest payment rate (91%) while March shows lowest (70%), correlating with seasonal cash flow.', color:green  },
                  { icon:'▲', title:'Grocery Spend Stability',      desc:'Grocery spend variance is low (±15%) across months, making it a reliable income stability indicator.', color:amber  },
                  { icon:'◈', title:'Social Trust Distribution',     desc:'GAT captures trust propagation in community lending networks — high trust nodes show 3x better repayment rates.', color:purple },
                ].map((ins,i) => (
                  <div key={i} style={{ padding:'14px', background:'rgba(255,255,255,0.02)', border:`1px solid ${ins.color}15`, borderRadius:'4px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px' }}>
                      <span style={{ color:ins.color, fontSize:'14px', textShadow:`0 0 6px ${ins.color}` }}>{ins.icon}</span>
                      <span style={{ fontSize:'10px', fontWeight:'700', color:ins.color, letterSpacing:'0.5px' }}>{ins.title}</span>
                    </div>
                    <p style={{ margin:0, fontSize:'10px', color:'rgba(255,255,255,0.4)', lineHeight:'1.7', letterSpacing:'0.3px' }}>{ins.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop:'32px', paddingTop:'16px', borderTop:'1px solid rgba(0,212,200,0.06)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:'9px', letterSpacing:'2px', color:'rgba(0,212,200,0.2)' }}>MICRO-LOAN.AI › EDA CONSOLE</span>
          <span style={{ fontSize:'9px', letterSpacing:'2px', color:'rgba(0,212,200,0.2)' }}>TRANSFORMER + GAT v2.0 · AUC 0.9618</span>
        </div>
      </div>
    </div>
  );
}