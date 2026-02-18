import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

// Helper to format error messages
export const getErrorMessage = (error) => {
  if (error.response) {
    return error.response.data.detail || 'Server error occurred';
  }
  return error.message || 'Network error occurred';
};
