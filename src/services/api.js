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
    
    // Log what we're sending
    console.log('📋 Form data object keys:', Object.keys(formDataObj));
    console.log('📋 firstName:', formDataObj.firstName);
    console.log('📋 lastName:', formDataObj.lastName);
    console.log('📋 email:', formDataObj.email);
    console.log('📋 phone:', formDataObj.phone);
    console.log('📋 guardianName:', formDataObj.guardianName);
    console.log('📋 guardianPhone:', formDataObj.guardianPhone);
    
    // Append all fields directly (flat structure for backend)
    Object.keys(formDataObj).forEach(key => {
      const value = formDataObj[key];
      
      if (value === null || value === undefined || value === '') {
        // Skip empty values
        return;
      }
      
      // Handle nested objects (like address)
      if (typeof value === 'object' && !(value instanceof File) && !Array.isArray(value)) {
        // Flatten address fields: address[street], address[city], etc.
        Object.keys(value).forEach(nestedKey => {
          const nestedValue = value[nestedKey];
          if (nestedValue !== null && nestedValue !== undefined && nestedValue !== '') {
            formData.append(`${key}[${nestedKey}]`, nestedValue);
          }
        });
      } else {
        // Append primitive values and files directly
        formData.append(key, value);
      }
    });
    
    console.log('📤 FormData entries being sent:');
    for (let [key, value] of formData.entries()) {
      if (typeof value === 'string') {
        console.log(`  ${key}: "${value}"`);
      } else {
        console.log(`  ${key}: [File/Blob]`);
      }
    }
    
    const response = await axios.post(`${API_BASE_URL}/student-registration`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('❌ API Error:', error);
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
    
    Object.keys(formDataObj).forEach(key => {
      const value = formDataObj[key];
      
      if (value === null || value === undefined || value === '') {
        return;
      }
      
      if (typeof value === 'object' && !(value instanceof File) && !Array.isArray(value)) {
        Object.keys(value).forEach(nestedKey => {
          const nestedValue = value[nestedKey];
          if (nestedValue !== null && nestedValue !== undefined && nestedValue !== '') {
            formData.append(`${key}[${nestedKey}]`, nestedValue);
          }
        });
      } else {
        formData.append(key, value);
      }
    });
    
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
