// Base URL configuration
// When working locally, use localhost. When live, use your Render URL.

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const BASE_URL = isLocalhost 
  ? "http://localhost:5000/api" 
  : "https://kasambahay-backend.onrender.com/api";

// Centralized endpoints
export const API_ENDPOINTS = {
  KASAMBAHAY: `${BASE_URL}/kasambahay`,
  AUTH_LOGIN: `${BASE_URL}/auth/login`,
  AUTH_VERIFY_OTP: `${BASE_URL}/auth/verify-otp`,
  AUTH_RESEND_OTP: `${BASE_URL}/auth/resend-otp`,
  AUTH_REGISTER: `${BASE_URL}/auth/register`,
  USERS: `${BASE_URL}/users`,
  ACTIVITY_LOGS: `${BASE_URL}/activity-logs`,
  GIP_PROFILES: `${BASE_URL}/gip-profiles`,
  SPES_PROFILES: `${BASE_URL}/spes-profiles`,
};