import requests

base = 'https://tradeforge-backend.onrender.com'
r = requests.post(f'{base}/auth/login', json={
    'email': 'admin@tradeforge.com',
    'password': 'admin123'
})
token = r.json()['access_token']
headers = {'Authorization': f'Bearer {token}'}
print('Logged in to production!')

TICKERS = [
    'RELIANCE.NS','TCS.NS','BTC-USD',
    'INFY.NS','HDFCBANK.NS','ICICIBANK.NS','WIPRO.NS',
    'ADANIENT.NS','BAJFINANCE.NS','ITC.NS',
    'AAPL','GOOGL','MSFT','TSLA','AMZN',
    'ETH-USD','^NSEI','^GSPC'
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
                timeout=600
            )
            if r2.status_code == 200:
                result = r2.json()
                acc = result.get('accuracy', 0)
                print(f'  Done! Accuracy: {round(acc*100,1)}%')
                results.append({'ticker':ticker,'model':model,'status':'success'})
            else:
                print(f'  HTTP {r2.status_code}: {r2.text[:100]}')
                results.append({'ticker':ticker,'model':model,'status':'failed'})
        except Exception as e:
            print(f'  Error: {e}')
            results.append({'ticker':ticker,'model':model,'status':'error'})

success = sum(1 for r in results if r['status']=='success')
print(f'\nDone! {success}/{total} models trained successfully')