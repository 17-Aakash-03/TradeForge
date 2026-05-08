import requests

base = 'http://127.0.0.1:8000'
r = requests.post(f'{base}/auth/login', json={'email':'admin@tradeforge.com','password':'admin123'})
token = r.json()['access_token']
headers = {'Authorization': f'Bearer {token}'}
print('Logged in!')

TICKERS = [
    'INFY.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'WIPRO.NS',
    'ADANIENT.NS', 'BAJFINANCE.NS', 'ITC.NS',
    'AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN',
    'ETH-USD', '^NSEI', '^GSPC'
]

results = []
total = len(TICKERS) * 2
count = 0

for ticker in TICKERS:
    for model in ['lstm', 'xgboost']:
        count += 1
        print(f'[{count}/{total}] Training {model.upper()} for {ticker}...')
        try:
            r2 = requests.post(
                f'{base}/model/train/{model}/{ticker}',
                headers=headers,
                timeout=300
            )
            result = r2.json()
            if 'error' in result:
                print(f'  ERROR: {result["error"]}')
                results.append({'ticker': ticker, 'model': model, 'status': 'failed', 'reason': result["error"]})
            else:
                acc = result.get('accuracy', 0)
                print(f'  Done! Accuracy: {round(acc*100, 1)}%')
                results.append({'ticker': ticker, 'model': model, 'status': 'success', 'accuracy': acc})
        except Exception as e:
            print(f'  Exception: {e}')
            results.append({'ticker': ticker, 'model': model, 'status': 'error', 'reason': str(e)})

print()
print('=== TRAINING SUMMARY ===')
success = [r for r in results if r['status'] == 'success']
failed = [r for r in results if r['status'] != 'success']
print(f'Success: {len(success)}/{len(results)}')
if failed:
    print('Failed:')
    for f in failed:
        print(f'  {f["ticker"]} {f["model"]} - {f.get("reason","unknown")}')
print('All done!')