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
    
    // Flatten the object and append to FormData
    const flattenObject = (obj, prefix = '') => {
      Object.keys(obj).forEach(key => {
        const value = obj[key];
        const fullKey = prefix ? `${prefix}.${key}` : key;
        
        if (value === null || value === undefined || value === '') {
          // Skip empty values
          return;
        } else if (typeof value === 'object' && !(value instanceof File) && !Array.isArray(value)) {
          // Recursively flatten nested objects
          flattenObject(value, fullKey);
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
    
    flattenObject(formDataObj);
    
    console.log('📤 Sending FormData with fields:');
    for (let [key, value] of formData.entries()) {
      console.log(`  ${key}: ${typeof value === 'string' ? value.substring(0, 50) : '[File]'}`);
    }
    
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
    
    const flattenObject = (obj, prefix = '') => {
      Object.keys(obj).forEach(key => {
        const value = obj[key];
        const fullKey = prefix ? `${prefix}.${key}` : key;
        
        if (value === null || value === undefined || value === '') {
          return;
        } else if (typeof value === 'object' && !(value instanceof File) && !Array.isArray(value)) {
          flattenObject(value, fullKey);
        } else if (Array.isArray(value)) {
          value.forEach((item, index) => {
            formData.append(`${fullKey}[${index}]`, item);
          });
        } else {
          formData.append(fullKey, value);
        }
      });
    };
    
    flattenObject(formDataObj);
    
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
