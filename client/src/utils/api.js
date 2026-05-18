// Base URL configuration
// When working locally, use localhost. When live, use your Render URL.
const BASE_URL = "https://kasambahay-backend.onrender.com/api";

// Centralized endpoints
export const API_ENDPOINTS = {
  KASAMBAHAY: `${BASE_URL}/kasambahay`,
  AUTH_LOGIN: `${BASE_URL}/auth/login`,
  AUTH_REGISTER: `${BASE_URL}/auth/register`,
  USERS: `${BASE_URL}/users`,
};