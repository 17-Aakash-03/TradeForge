import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

def send_signal_alert(
    to_email: str,
    ticker: str,
    signal: str,
    confidence: float,
    lstm_vote: str,
    xgb_vote: str,
    sender_email: str,
    sender_password: str
) -> dict:
    try:
        signal_emoji = "🟢" if signal == "BUY" else "🔴" if signal == "SELL" else "🟡"
        signal_color = "#00d4aa" if signal == "BUY" else "#ff4444" if signal == "SELL" else "#f0a500"

        subject = f"{signal_emoji} TradeForge Alert: {signal} signal for {ticker}"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                        background: #0a0a0a; color: #ffffff; margin: 0; padding: 0; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 32px 24px; }}
                .header {{ border-bottom: 2px solid #00d4aa; padding-bottom: 16px; margin-bottom: 24px; }}
                .logo {{ color: #00d4aa; font-size: 24px; font-weight: bold; margin: 0; }}
                .subtitle {{ color: #666; font-size: 13px; margin: 4px 0 0; }}
                .signal-box {{ background: #111; border: 2px solid {signal_color};
                               border-radius: 12px; padding: 24px; text-align: center;
                               margin-bottom: 24px; box-shadow: 0 0 30px {signal_color}33; }}
                .signal-label {{ color: #888; font-size: 12px; text-transform: uppercase;
                                  letter-spacing: 0.1em; margin-bottom: 8px; }}
                .signal-value {{ color: {signal_color}; font-size: 48px; font-weight: bold;
                                  letter-spacing: 4px; margin: 0; }}
                .ticker {{ color: #ffffff; font-size: 20px; margin-top: 8px; }}
                .stats {{ background: #111; border-radius: 10px; padding: 20px;
                           margin-bottom: 24px; border: 1px solid #1e1e1e; }}
                .stats-grid {{ display: grid; grid-template-columns: 1fr 1fr;
                                gap: 16px; }}
                .stat {{ text-align: center; }}
                .stat-label {{ color: #555; font-size: 11px; text-transform: uppercase;
                                letter-spacing: 0.05em; margin-bottom: 4px; }}
                .stat-value {{ color: #ffffff; font-size: 16px; font-weight: 600; }}
                .disclaimer {{ color: #444; font-size: 11px; text-align: center;
                                border-top: 1px solid #1e1e1e; padding-top: 16px;
                                margin-top: 24px; line-height: 1.6; }}
                .footer {{ color: #00d4aa; font-size: 11px; text-align: center;
                            margin-top: 8px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <p class="logo">TradeForge</p>
                    <p class="subtitle">AI-Powered Trading Signal Alert</p>
                </div>

                <div class="signal-box">
                    <p class="signal-label">AI Signal</p>
                    <p class="signal-value">{signal}</p>
                    <p class="ticker">{ticker}</p>
                </div>

                <div class="stats">
                    <table width="100%">
                        <tr>
                            <td style="text-align:center; padding:10px;">
                                <div style="color:#555;font-size:11px;text-transform:uppercase;margin-bottom:4px;">LSTM Vote</div>
                                <div style="color:{'#00d4aa' if lstm_vote=='BUY' else '#ff4444' if lstm_vote=='SELL' else '#f0a500'};font-size:16px;font-weight:600;">{lstm_vote}</div>
                            </td>
                            <td style="text-align:center; padding:10px;">
                                <div style="color:#555;font-size:11px;text-transform:uppercase;margin-bottom:4px;">XGBoost Vote</div>
                                <div style="color:{'#00d4aa' if xgb_vote=='BUY' else '#ff4444' if xgb_vote=='SELL' else '#f0a500'};font-size:16px;font-weight:600;">{xgb_vote}</div>
                            </td>
                            <td style="text-align:center; padding:10px;">
                                <div style="color:#555;font-size:11px;text-transform:uppercase;margin-bottom:4px;">Confidence</div>
                                <div style="color:#ffffff;font-size:16px;font-weight:600;">{confidence}%</div>
                            </td>
                            <td style="text-align:center; padding:10px;">
                                <div style="color:#555;font-size:11px;text-transform:uppercase;margin-bottom:4px;">Time</div>
                                <div style="color:#ffffff;font-size:16px;font-weight:600;">{datetime.now().strftime('%H:%M')}</div>
                            </td>
                        </tr>
                    </table>
                </div>

                <p style="color:#888;font-size:13px;line-height:1.6;text-align:center;">
                    The TradeForge AI ensemble (LSTM + XGBoost) has generated a
                    <strong style="color:{signal_color};">{signal}</strong> signal for
                    <strong style="color:#ffffff;">{ticker}</strong> based on technical
                    indicators and price pattern analysis.
                </p>

                <div class="disclaimer">
                    This alert is for educational purposes only and does not constitute
                    financial advice. Past performance does not guarantee future results.
                    Always do your own research before making investment decisions.
                </div>
                <div class="footer">
                    Generated by TradeForge AI · {datetime.now().strftime('%B %d, %Y at %H:%M')}
                </div>
            </div>
        </body>
        </html>
        """

        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"TradeForge <{sender_email}>"
        msg['To'] = to_email

        msg.attach(MIMEText(html_body, 'html'))

        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, to_email, msg.as_string())

        print(f"Email sent to {to_email} for {ticker} {signal} signal")
        return {
            "success": True,
            "message": f"Alert sent to {to_email}",
            "ticker": ticker,
            "signal": signal
        }

    except Exception as e:
        print(f"Email error: {e}")
        return {"success": False, "error": str(e)}

def send_test_email(
    to_email: str,
    sender_email: str,
    sender_password: str
) -> dict:
    return send_signal_alert(
        to_email=to_email,
        ticker="RELIANCE.NS",
        signal="BUY",
        confidence=85.5,
        lstm_vote="BUY",
        xgb_vote="BUY",
        sender_email=sender_email,
        sender_password=sender_password
    )