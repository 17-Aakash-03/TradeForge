import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'https://tradeforge-backend.onrender.com'

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const authAPI = {
  register: (email, username, password) =>
    api.post('/auth/register', { email, username, password }),
  login: (email, password) =>
    api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me')
}

export const stockAPI = {
  getStocks: () => api.get('/data/stocks'),
  predict: (ticker, model = 'ensemble') =>
    api.get(`/predict/${ticker}?model=${model}`),
  backtest: (ticker, capital = 100000) =>
    api.get(`/backtest/${ticker}?capital=${capital}`),
  explain: (ticker) =>
    api.get(`/explain/${ticker}`),
  sentiment: (ticker) =>
    api.get(`/sentiment/${ticker}`),
  reportUrl: (ticker, capital, token) =>
    `${API_URL}/report/${ticker}?capital=${capital}&token=${token}`,
  sendAlert: (ticker, email) =>
    api.post('/alert/send', { ticker, to_email: email }),
  testAlert: () =>
    api.post('/alert/test'),
  portfolioBacktest: (tickers, capital) =>
    api.post('/portfolio/backtest', { tickers, capital }),
  paperAutoTrade: (ticker) =>
    api.post(`/paper/auto-trade/${ticker}`),
  paperPortfolio: () =>
    api.get('/paper/portfolio'),
  paperReset: () =>
    api.post('/paper/reset'),
  retrainStatus: () =>
    api.get('/retrain/status'),
  retrainRun: (force = false) =>
    api.post(`/retrain/run?force=${force}`),
  chartData: (ticker, days = 90) =>
    api.get(`/chart/${ticker}?days=${days}`)
}

export default api