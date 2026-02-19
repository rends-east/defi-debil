import axios from 'axios';

// Dynamically determine the API base URL
// In development (localhost), use localhost:8000
// In production (docker/traefik), use https://api.debil.capital
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:8000' 
  : 'https://api.debil.capital';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for cookies (JWT)
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getNonce = async (address) => {
  const response = await api.post('/auth/nonce', { address });
  return response.data;
};

export const verifySignature = async (address, signature) => {
  const response = await api.post('/auth/verify', { address, signature });
  return response.data;
};

export const logout = async () => {
  const response = await api.post('/auth/logout');
  return response.data;
};

export const getMe = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

export const getHistory = async () => {
  const response = await api.get('/history');
  return response.data;
};

export const getHistoryDetail = async (id) => {
  const response = await api.get(`/history/${id}`);
  return response.data;
};

export const runLendingBacktest = async (data) => {
  const response = await api.post('/backtest/lending', data);
  return response.data;
};

export const runPerpBacktest = async (data) => {
  const response = await api.post('/backtest/perp', data);
  return response.data;
};

export const runClmmBacktest = async (data) => {
  const response = await api.post('/backtest/clmm', data);
  return response.data;
};

export const runBatchBacktest = async (items) => {
  const response = await api.post('/backtest/batch', { items });
  return response.data;
};

export const getLendingPositionHealth = async ({ supply_amount, borrow_amount, is_bnb_supply }) => {
  const response = await api.post('/lending/position-health', { supply_amount, borrow_amount, is_bnb_supply });
  return response.data;
};

export default api;