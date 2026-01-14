import axios from 'axios';

const getApiBaseUrl = () => {
  const envUrl = process.env.REACT_APP_API_BASE_URL;
  if (envUrl) {
    return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
  }
  return 'https://hostel-management-backend-new-1.onrender.com/api';
};

const API_BASE_URL = getApiBaseUrl();

export const submitStudentRegistration = async (formData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/students/register`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getStudentById = async (studentId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/students/${studentId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const updateStudent = async (studentId, formData) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/students/${studentId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};
