import axios from 'axios';

const getApiBaseUrl = () => {
  const envUrl = process.env.REACT_APP_API_BASE_URL;
  if (envUrl) {
    return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
  }
  return 'https://hostel-management-backend-new-1.onrender.com/api';
};

const API_BASE_URL = getApiBaseUrl();

// Create axios instance with proper config - MATCHING ADMIN PANEL
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'  // ✅ JSON, not FormData
  }
});

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      error.message = 'Network error. Please check your internet connection.';
    }
    return Promise.reject(error);
  }
);

// ✅ Send as JSON with nested objects preserved
export const submitStudentRegistration = (data) => 
  apiClient.post('/student-registration', data);

export const getStudentById = async (studentId) => {
  try {
    const response = await apiClient.get(`/students/${studentId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const updateStudent = async (studentId, data) => 
  apiClient.put(`/students/${studentId}`, data);
