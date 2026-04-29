import os
import re
from datetime import datetime, timedelta
from typing import Optional

FINBERT_MODEL = None
FINBERT_TOKENIZER = None

STOCK_KEYWORDS = {
    "RELIANCE.NS": ["Reliance Industries", "Mukesh Ambani", "RIL", "Jio"],
    "TCS.NS": ["TCS", "Tata Consultancy", "Tata Consultancy Services"],
    "BTC-USD": ["Bitcoin", "BTC", "crypto", "cryptocurrency"],
    "INFY.NS": ["Infosys", "Infy"],
    "HDFCBANK.NS": ["HDFC Bank", "HDFC"],
    "TATAMOTORS.NS": ["Tata Motors", "Tata EV"],
    "AAPL": ["Apple", "iPhone", "Tim Cook"],
    "GOOGL": ["Google", "Alphabet", "Sundar Pichai"],
    "MSFT": ["Microsoft", "Azure", "Satya Nadella"],
    "TSLA": ["Tesla", "Elon Musk", "EV"],
    "AMZN": ["Amazon", "AWS", "Jeff Bezos"],
}

def load_finbert():
    global FINBERT_MODEL, FINBERT_TOKENIZER
    if FINBERT_MODEL is None:
        try:
            from transformers import AutoTokenizer, AutoModelForSequenceClassification
            import torch
            print("Loading FinBERT model...")
            FINBERT_TOKENIZER = AutoTokenizer.from_pretrained("ProsusAI/finbert")
            FINBERT_MODEL = AutoModelForSequenceClassification.from_pretrained("ProsusAI/finbert")
            FINBERT_MODEL.eval()
            print("FinBERT loaded successfully!")
        except Exception as e:
            print(f"FinBERT load error: {e}")
            return False
    return True

def analyze_sentiment(text: str) -> dict:
    try:
        import torch
        if not load_finbert():
            return {"label": "neutral", "score": 0.0}

        inputs = FINBERT_TOKENIZER(
            text, return_tensors="pt",
            truncation=True, max_length=512, padding=True
        )

        with torch.no_grad():
            outputs = FINBERT_MODEL(**inputs)
            probs = torch.softmax(outputs.logits, dim=-1)

        labels = ["positive", "negative", "neutral"]
        scores = probs[0].tolist()
        best_idx = scores.index(max(scores))

        return {
            "label": labels[best_idx],
            "score": round(scores[best_idx], 4),
            "positive": round(scores[0], 4),
            "negative": round(scores[1], 4),
            "neutral": round(scores[2], 4)
        }
    except Exception as e:
        return {"label": "neutral", "score": 0.5, "error": str(e)}

def fetch_news(ticker: str, api_key: str) -> list:
    try:
        from newsapi import NewsApiClient
        newsapi = NewsApiClient(api_key=api_key)

        keywords = STOCK_KEYWORDS.get(ticker, [ticker.replace(".NS", "").replace("-USD", "")])
        query = " OR ".join(keywords[:2])

        from_date = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')

        articles = newsapi.get_everything(
            q=query,
            from_param=from_date,
            language='en',
            sort_by='relevancy',
            page_size=10
        )

        headlines = []
        if articles and articles.get('articles'):
            for article in articles['articles']:
                title = article.get('title', '')
                desc = article.get('description', '')
                if title and title != '[Removed]':
                    headlines.append({
                        "title": title,
                        "description": desc or '',
                        "source": article.get('source', {}).get('name', ''),
                        "published_at": article.get('publishedAt', '')
                    })
        return headlines

    except Exception as e:
        print(f"News fetch error: {e}")
        return []

def get_sentiment_analysis(ticker: str, api_key: str) -> dict:
    try:
        headlines = fetch_news(ticker, api_key)

        if not headlines:
            return {
                "ticker": ticker,
                "sentiment": "neutral",
                "sentiment_score": 0.0,
                "signal_impact": "No news found — sentiment neutral",
                "headlines_analysed": 0,
                "headlines": [],
                "recommendation": "No recent news available for this stock"
            }

        results = []
        positive_count = 0
        negative_count = 0
        neutral_count = 0
        total_score = 0.0

        for article in headlines[:5]:
            text = f"{article['title']}. {article['description']}"
            sentiment = analyze_sentiment(text)

            if sentiment['label'] == 'positive':
                positive_count += 1
                total_score += sentiment['score']
            elif sentiment['label'] == 'negative':
                negative_count += 1
                total_score -= sentiment['score']
            else:
                neutral_count += 1

            results.append({
                "title": article['title'][:100],
                "source": article['source'],
                "sentiment": sentiment['label'],
                "confidence": round(sentiment['score'] * 100, 1),
                "published_at": article['published_at'][:10] if article['published_at'] else ''
            })

        avg_score = total_score / len(results) if results else 0
        overall = "positive" if avg_score > 0.1 else "negative" if avg_score < -0.1 else "neutral"

        if overall == "positive":
            signal_impact = "📈 News sentiment is BULLISH — supports BUY signals"
            recommendation = f"Recent news about {ticker} is mostly positive. This reinforces bullish signals from the AI model."
        elif overall == "negative":
            signal_impact = "📉 News sentiment is BEARISH — supports SELL signals"
            recommendation = f"Recent news about {ticker} is mostly negative. Exercise caution with BUY signals."
        else:
            signal_impact = "➡️ News sentiment is NEUTRAL — no strong directional bias"
            recommendation = f"Recent news about {ticker} is mixed. Rely primarily on technical indicators."

        return {
            "ticker": ticker,
            "sentiment": overall,
            "sentiment_score": round(avg_score, 4),
            "positive_news": positive_count,
            "negative_news": negative_count,
            "neutral_news": neutral_count,
            "signal_impact": signal_impact,
            "recommendation": recommendation,
            "headlines_analysed": len(results),
            "headlines": results
        }

    except Exception as e:
        return {"ticker": ticker, "error": str(e), "sentiment": "neutral"}