import axios from 'axios';
import { useAppStore } from '../store/useAppStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-JARVIS-Client': 'NexusOS-Web'
  }
});

// Automatically inject JWT Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nexus_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Global Error Handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('nexus_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);