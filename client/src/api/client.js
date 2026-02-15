import axios from 'axios';

// Support VITE_API_URL environment variable for deployed environments
// Falls back to relative path for development
const apiUrl = import.meta.env.VITE_API_URL || '/';

const api = axios.create({
  baseURL: apiUrl,
  timeout: 20000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('farmreact:token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
