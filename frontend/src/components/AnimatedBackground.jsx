import { useEffect, useRef } from 'react'

export default function AnimatedBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    let W = window.innerWidth
    let H = window.innerHeight
    canvas.width = W
    canvas.height = H

    const resize = () => {
      W = window.innerWidth
      H = window.innerHeight
      canvas.width = W
      canvas.height = H
    }
    window.addEventListener('resize', resize)

    // ── Matrix rain columns ──
    const FONT_SIZE = 13
    const cols = Math.floor(W / FONT_SIZE)
    const drops = Array.from({ length: cols }, () => Math.random() * -100)
    const chars = '0123456789ABCDEF₹$%+-×÷BUY SELL HOLD RSI MACD EMA LSTM AI'.split('')

    // ── Animated price lines (beautiful flowing curves) ──
    const priceLines = Array.from({ length: 8 }, (_, i) => {
      const pts = []
      let y = 0.2 + Math.random() * 0.6
      for (let x = 0; x < 300; x++) {
        y += (Math.random() - 0.48) * 0.012
        y = Math.max(0.05, Math.min(0.95, y))
        pts.push(y)
      }
      const isGreen = Math.random() > 0.35
      return {
        pts, offset: Math.random() * W,
        y: 50 + (i / 8) * (H - 100),
        w: 300 + Math.random() * 200,
        h: 60 + Math.random() * 80,
        speed: 0.2 + Math.random() * 0.3,
        opacity: 0.08 + Math.random() * 0.12,
        isGreen,
        color: isGreen ? '0,212,170' : '255,80,80',
        scroll: 0
      }
    })

    // ── Floating price bubbles ──
    const tickers = [
      { s:'RELIANCE', p:'+2.4%', g:true }, { s:'TCS', p:'-0.8%', g:false },
      { s:'BTC', p:'+5.2%', g:true }, { s:'NIFTY', p:'+1.1%', g:true },
      { s:'AAPL', p:'-1.3%', g:false }, { s:'TSLA', p:'+8.7%', g:true },
      { s:'GOOGL', p:'+0.5%', g:true }, { s:'ETH', p:'-2.1%', g:false },
      { s:'MSFT', p:'+3.2%', g:true }, { s:'INFY', p:'-0.4%', g:false },
      { s:'AMZN', p:'+1.9%', g:true }, { s:'S&P500', p:'+0.7%', g:true },
    ]
    const bubbles = Array.from({ length: 12 }, (_, i) => ({
      ...tickers[i % tickers.length],
      x: Math.random() * W,
      y: Math.random() * H,
      vy: -(0.1 + Math.random() * 0.2),
      vx: (Math.random() - 0.5) * 0.15,
      opacity: 0,
      maxOp: 0.12 + Math.random() * 0.16,
      life: Math.random() * 400,
      maxLife: 350 + Math.random() * 400
    }))

    // ── Candlestick rain ──
    const candles = Array.from({ length: 40 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      open: 0.3 + Math.random() * 0.4,
      close: 0.3 + Math.random() * 0.4,
      high: 0.1 + Math.random() * 0.2,
      low: 0.7 + Math.random() * 0.2,
      bw: 5 + Math.random() * 6,
      bh: 24 + Math.random() * 32,
      vy: 0.2 + Math.random() * 0.4,
      opacity: 0.04 + Math.random() * 0.08,
      spin: Math.random() * 0.02 - 0.01
    }))

    let animId
    let frame = 0

    const draw = () => {
      // Dark fade trail for matrix effect
      ctx.fillStyle = 'rgba(8,8,8,0.08)'
      ctx.fillRect(0, 0, W, H)

      frame++

      // ── Matrix rain ──
      ctx.font = `${FONT_SIZE}px monospace`
      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)]
        const x = i * FONT_SIZE
        const y = drops[i] * FONT_SIZE

        // Bright head
        ctx.fillStyle = `rgba(180,255,230,${0.7 + Math.random() * 0.3})`
        ctx.fillText(char, x, y)

        // Trail (green)
        ctx.fillStyle = `rgba(0,212,170,${0.04 + Math.random() * 0.05})`
        ctx.fillText(chars[Math.floor(Math.random() * chars.length)], x, y - FONT_SIZE)

        drops[i]++
        if (drops[i] * FONT_SIZE > H && Math.random() > 0.975) {
          drops[i] = -Math.random() * 20
        }
      }

      // ── Price chart lines ──
      priceLines.forEach(line => {
        line.scroll += line.speed
        if (line.scroll > line.w + 100) line.scroll = -line.w

        const startX = line.scroll - line.w
        ctx.beginPath()
        line.pts.forEach((p, idx) => {
          const px = startX + (idx / line.pts.length) * line.w
          const py = line.y + (p - 0.5) * line.h
          idx === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
        })
        ctx.strokeStyle = `rgba(${line.color},${line.opacity})`
        ctx.lineWidth = 1.5
        ctx.stroke()

        // Glow
        ctx.strokeStyle = `rgba(${line.color},${line.opacity * 0.4})`
        ctx.lineWidth = 4
        ctx.stroke()

        // Area fill
        const endX = startX + line.w
        const endY = line.y + (line.pts[line.pts.length - 1] - 0.5) * line.h
        ctx.lineTo(endX, line.y + line.h)
        ctx.lineTo(startX, line.y + line.h)
        ctx.closePath()
        ctx.fillStyle = `rgba(${line.color},${line.opacity * 0.08})`
        ctx.fill()
      })

      // ── Floating ticker bubbles ──
      bubbles.forEach(b => {
        b.x += b.vx
        b.y += b.vy
        b.life++

        if (b.life < 60) b.opacity = Math.min(b.maxOp, b.opacity + b.maxOp / 60)
        else if (b.life > b.maxLife - 60) b.opacity = Math.max(0, b.opacity - b.maxOp / 60)

        if (b.life > b.maxLife || b.y < -50) {
          const t = tickers[Math.floor(Math.random() * tickers.length)]
          Object.assign(b, { ...t, x: Math.random() * W, y: H + 20, life: 0, opacity: 0 })
        }

        const col = b.g ? `rgba(0,212,170,${b.opacity})` : `rgba(255,80,80,${b.opacity})`
        const borderCol = b.g ? `rgba(0,212,170,${b.opacity * 3})` : `rgba(255,80,80,${b.opacity * 3})`

        // Bubble bg
        const bw = ctx.measureText(`${b.s} ${b.p}`).width + 20
        const bh = 28
        ctx.beginPath()
        ctx.roundRect(b.x - bw / 2, b.y - bh / 2, bw, bh, 6)
        ctx.fillStyle = b.g ? `rgba(0,212,170,${b.opacity * 0.12})` : `rgba(255,80,80,${b.opacity * 0.12})`
        ctx.fill()
        ctx.strokeStyle = borderCol
        ctx.lineWidth = 0.8
        ctx.stroke()

        ctx.font = 'bold 11px monospace'
        ctx.fillStyle = col
        ctx.fillText(`${b.s} ${b.p}`, b.x - bw / 2 + 10, b.y + 4)
      })

      // ── Candlestick rain ──
      candles.forEach(c => {
        c.y += c.vy
        if (c.y > H + 80) {
          c.y = -80
          c.x = Math.random() * W
          c.open = 0.3 + Math.random() * 0.4
          c.close = 0.3 + Math.random() * 0.4
          c.opacity = 0.04 + Math.random() * 0.08
        }

        const isG = c.close < c.open
        const col = isG ? `rgba(0,212,170,${c.opacity})` : `rgba(255,80,80,${c.opacity})`
        const midX = c.x + c.bw / 2
        const bodyTop = c.y + Math.min(c.open, c.close) * c.bh
        const bodyH = Math.abs(c.open - c.close) * c.bh

        ctx.beginPath()
        ctx.moveTo(midX, c.y + c.high * c.bh)
        ctx.lineTo(midX, c.y + c.low * c.bh)
        ctx.strokeStyle = col
        ctx.lineWidth = 0.8
        ctx.stroke()

        ctx.fillStyle = col
        ctx.fillRect(c.x, bodyTop, c.bw, Math.max(bodyH, 2))
      })

      // ── Pulsing rings at random ──
      if (frame % 90 === 0) {
        const rx = Math.random() * W
        const ry = Math.random() * H
        let r = 0
        const expand = setInterval(() => {
          ctx.beginPath()
          ctx.arc(rx, ry, r, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(0,212,170,${0.15 * (1 - r / 100)})`
          ctx.lineWidth = 1
          ctx.stroke()
          r += 2
          if (r > 100) clearInterval(expand)
        }, 16)
      }

      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', overflow:'hidden' }}>
      {/* Canvas for all animations */}
      <canvas ref={canvasRef} style={{ position:'absolute', inset:0, width:'100%', height:'100%' }} />

      {/* Big dark radial vignette so content is readable */}
      <div style={{
        position:'absolute', inset:0,
        background:'radial-gradient(ellipse 70% 70% at 50% 50%, rgba(8,8,8,0) 0%, rgba(8,8,8,0.55) 60%, rgba(8,8,8,0.85) 100%)'
      }} />

      {/* Teal glow blobs */}
      <div style={{
        position:'absolute', top:'-200px', left:'-200px',
        width:'600px', height:'600px',
        background:'radial-gradient(circle, rgba(0,212,170,0.12) 0%, transparent 65%)',
        borderRadius:'50%', filter:'blur(80px)',
        animation:'orb1 14s ease-in-out infinite'
      }} />
      <div style={{
        position:'absolute', bottom:'-200px', right:'-200px',
        width:'700px', height:'700px',
        background:'radial-gradient(circle, rgba(0,160,120,0.09) 0%, transparent 65%)',
        borderRadius:'50%', filter:'blur(90px)',
        animation:'orb2 18s ease-in-out infinite'
      }} />

      {/* Scrolling ticker tape at the very bottom */}
      <div style={{
        position:'absolute', bottom:0, left:0, right:0,
        height:'28px',
        background:'rgba(0,0,0,0.7)',
        borderTop:'1px solid rgba(0,212,170,0.15)',
        overflow:'hidden', display:'flex', alignItems:'center'
      }}>
        <div style={{
          display:'flex', gap:'0',
          animation:'tickerScroll 30s linear infinite',
          whiteSpace:'nowrap'
        }}>
          {[
            'RELIANCE.NS ▲ +2.41%','TCS.NS ▼ -0.82%','BTC-USD ▲ +5.21%','AAPL ▲ +1.34%',
            'NIFTY50 ▲ +0.76%','MSFT ▲ +2.18%','ETH-USD ▼ -1.43%','TSLA ▲ +8.72%',
            'GOOGL ▼ -0.55%','INFY.NS ▲ +1.09%','AMZN ▲ +3.27%','HDFC ▼ -0.38%',
            'RELIANCE.NS ▲ +2.41%','TCS.NS ▼ -0.82%','BTC-USD ▲ +5.21%','AAPL ▲ +1.34%',
          ].map((t, i) => {
            const isUp = t.includes('▲')
            return (
              <span key={i} style={{
                fontSize:'11px', fontWeight:'500', fontFamily:'monospace',
                color: isUp ? '#00d4aa' : '#ff5050',
                padding:'0 20px',
                borderRight:'1px solid rgba(255,255,255,0.06)'
              }}>{t}</span>
            )
          })}
        </div>
      </div>
    </div>
  )
}