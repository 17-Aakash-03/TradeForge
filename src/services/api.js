import axios from 'axios'

const API_URL = 'http://127.0.0.1:8000'

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
    api.get(`/predict/${ticker}?model=${model}`)
}

export default api