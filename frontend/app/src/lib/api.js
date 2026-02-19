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

// Store for the payment modal callback
let paymentModalCallback = null;

export const setPaymentModalCallback = (callback) => {
  paymentModalCallback = callback;
};

// Response interceptor for 402 Payment Required
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Check if it's a 402 error and we haven't retried yet
    if (error.response?.status === 402 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Parse WWW-Authenticate header
      // Format: x402 token="...", network="...", etc. OR JSON body
      // x402 usually returns details in headers or body
      
      // Let's assume the body contains the details for now as parsing headers is tricky in CORS
      // But standard is header.
      // Header: WWW-Authenticate: x402 scheme="exact", price="0.01", token="0x...", network="...", payTo="..."
      
      const authHeader = error.response.headers['www-authenticate'];
      if (!authHeader) return Promise.reject(error);
      
      // Simple parser for key="value" format
      const parseAuthHeader = (header) => {
        const parts = header.replace('x402 ', '').split(',');
        const result = {};
        parts.forEach(part => {
          const [key, value] = part.split('=');
          if (key && value) {
            result[key.trim()] = value.trim().replace(/"/g, '');
          }
        });
        return result;
      };
      
      const paymentDetails = parseAuthHeader(authHeader);
      
      if (paymentModalCallback) {
        try {
          // Trigger the modal and wait for payment success (tx hash)
          const txHash = await paymentModalCallback(paymentDetails);
          
          // Retry with Authorization header
          // Authorization: x402 <tx_hash>
          originalRequest.headers['Authorization'] = `x402 ${txHash}`;
          return api(originalRequest);
        } catch (paymentError) {
          return Promise.reject(paymentError);
        }
      }
    }
    return Promise.reject(error);
  }
);

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