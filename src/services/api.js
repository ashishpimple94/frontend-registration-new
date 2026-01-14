import axios from 'axios';

const getApiBaseUrl = () => {
  const envUrl = process.env.REACT_APP_API_BASE_URL;
  if (envUrl) {
    return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
  }
  return 'https://hostel-management-backend-new-1.onrender.com/api';
};

const API_BASE_URL = getApiBaseUrl();

export const submitStudentRegistration = async (formDataObj) => {
  try {
    // Convert object to FormData for multipart/form-data
    const formData = new FormData();
    
    // Helper function to append nested objects
    const appendFormData = (data, parentKey = '') => {
      Object.keys(data).forEach(key => {
        const value = data[key];
        const fullKey = parentKey ? `${parentKey}[${key}]` : key;
        
        if (value === null || value === undefined) {
          // Skip null/undefined values
          return;
        } else if (typeof value === 'object' && !(value instanceof File) && !Array.isArray(value)) {
          // Recursively handle nested objects (like address)
          appendFormData(value, fullKey);
        } else if (Array.isArray(value)) {
          // Handle arrays
          value.forEach((item, index) => {
            formData.append(`${fullKey}[${index}]`, item);
          });
        } else {
          // Append primitive values and files
          formData.append(fullKey, value);
        }
      });
    };
    
    appendFormData(formDataObj);
    
    const response = await axios.post(`${API_BASE_URL}/student-registration`, formData, {
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

export const updateStudent = async (studentId, formDataObj) => {
  try {
    // Convert object to FormData for multipart/form-data
    const formData = new FormData();
    
    const appendFormData = (data, parentKey = '') => {
      Object.keys(data).forEach(key => {
        const value = data[key];
        const fullKey = parentKey ? `${parentKey}[${key}]` : key;
        
        if (value === null || value === undefined) {
          return;
        } else if (typeof value === 'object' && !(value instanceof File) && !Array.isArray(value)) {
          appendFormData(value, fullKey);
        } else if (Array.isArray(value)) {
          value.forEach((item, index) => {
            formData.append(`${fullKey}[${index}]`, item);
          });
        } else {
          formData.append(fullKey, value);
        }
      });
    };
    
    appendFormData(formDataObj);
    
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
