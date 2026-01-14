import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitStudentRegistration } from '../services/api';
import './Auth.css';
// MUI Icons
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  CalendarToday as CalendarIcon,
  Home as HomeIcon,
  School as SchoolIcon,
  People as PeopleIcon,
  LocationOn as LocationIcon,
  AccountBalance as AccountBalanceIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  AcUnit as AcUnitIcon,
  Air as AirIcon,
  Print as PrintIcon
} from '@mui/icons-material';

// Get API base URL - always use Render backend unless environment variable is set
const getApiBaseUrl = () => {
  // Check for environment variable first (highest priority)
  const envUrl = process.env.REACT_APP_API_BASE_URL;
  if (envUrl) {
    console.log('🌐 Using API URL from environment variable:', envUrl);
    return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
  }
  
  // Always use Render backend URL (both development and production)
  const renderBackendUrl = 'https://hostel-management-backend-new-1.onrender.com/api';
  console.log('🌐 Using Render backend URL:', renderBackendUrl);
  return renderBackendUrl;
};

// Get API URL - will be evaluated when component loads
const getCurrentApiBaseUrl = () => getApiBaseUrl();

const ROOM_PRICING = {
  '2-sharing-ac': {
    label: '2 Sharing AC',
    monthly: { 1: 23000, 2: 23000, 3: 22000, 4: 22000, 5: 21000 },
    mess: 3000
  },
  '4-sharing': {
    label: '4 Sharing (Non-AC)',
    monthly: { 1: 14000, 2: 14000, 3: 13000, 4: 13000, 5: 12000 },
    mess: 3000
  },
  'single-sharing': {
    label: 'Single Sharing (Non-AC)',
    monthly: { 1: 24000, 2: 24000, 3: 23000, 4: 23000, 5: 22000 },
    mess: 3000
  },
  '2-sharing-non-ac': {
    label: '2 Sharing (Non-AC)',
    monthly: { 1: 19000, 2: 19000, 3: 18000, 4: 18000, 5: 17000 },
    mess: 3000
  }
};

const ROOM_PACKAGES = [
  {
    key: '2-sharing-ac',
    title: '2 Sharing AC',
    badge: 'Premium • AC',
    color: '#1e3a8a',
    rows: [
      { months: '1 Month', rent: 23000, mess: 3000, total: 26000 },
      { months: '2 Months', rent: 46000, mess: 6000, total: 52000 },
      { months: '3 Months', rent: 66000, mess: 9000, total: 75000 },
      { months: '4 Months', rent: 88000, mess: 12000, total: 100000 },
      { months: '5 Months', rent: 105000, mess: 15000, total: 120000 }
    ]
  },
  {
    key: '4-sharing',
    title: '4 Sharing (Non-AC)',
    badge: 'Economy • Non-AC',
    color: '#047857',
    rows: [
      { months: '1 Month', rent: 14000, mess: 3000, total: 17000 },
      { months: '2 Months', rent: 28000, mess: 6000, total: 34000 },
      { months: '3 Months', rent: 39000, mess: 9000, total: 48000 },
      { months: '4 Months', rent: 52000, mess: 12000, total: 64000 },
      { months: '5 Months', rent: 60000, mess: 15000, total: 75000 }
    ]
  },
  {
    key: '2-sharing-non-ac',
    title: '2 Sharing (Non-AC)',
    badge: 'Comfort • Non-AC',
    color: '#92400e',
    rows: [
      { months: '1 Month', rent: 19000, mess: 3000, total: 22000 },
      { months: '2 Months', rent: 38000, mess: 6000, total: 44000 },
      { months: '3 Months', rent: 54000, mess: 9000, total: 63000 },
      { months: '4 Months', rent: 72000, mess: 12000, total: 84000 },
      { months: '5 Months', rent: 85000, mess: 15000, total: 100000 }
    ]
  },
  {
    key: 'single-sharing',
    title: 'Single Sharing (Non-AC)',
    badge: 'Private • Non-AC',
    color: '#b91c1c',
    rows: [
      { months: '1 Month', rent: 24000, mess: 3000, total: 27000 },
      { months: '2 Months', rent: 48000, mess: 6000, total: 54000 },
      { months: '3 Months', rent: 69000, mess: 9000, total: 78000 },
      { months: '4 Months', rent: 92000, mess: 12000, total: 104000 },
      { months: '5 Months', rent: 110000, mess: 15000, total: 125000 }
    ]
  }
];

const MAX_PHOTO_SIZE = 2 * 1024 * 1024; // 2MB limit for image uploads
const PACKAGE_MONTH_OPTIONS = [1, 2, 3, 4, 5];

const calculateAdmissionEndDate = (startDate, months) => {
  if (!startDate || !months) return '';
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return '';
  
  // For month-end calculation
  const result = new Date(start);
  result.setMonth(result.getMonth() + Number(months) - 1); // -1 because we want current month + (months-1)
  
  // Set to last day of that month
  const year = result.getFullYear();
  const month = result.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate(); // Get last day of the month
  result.setDate(lastDay);
  
  return result.toISOString().split('T')[0];
};

// Calculate remaining days in current month cycle
const calculateRemainingDays = (admissionDate) => {
  if (!admissionDate) return 30;
  const admission = new Date(admissionDate);
  const admissionDay = admission.getDate();
  
  // If admission on 1st, full 30 days remaining
  if (admissionDay === 1) return 30;
  
  // Otherwise, calculate remaining days (30-day cycle)
  return 30 - (admissionDay - 1);
};

const calculateFeeBreakdown = (roomType, months, advanceAmount, payAdvance) => {
  const safeMonths = Number(months) || 1;
  const pricing = ROOM_PRICING[roomType] || ROOM_PRICING['2-sharing-ac'];
  const boundedMonths = Math.max(1, Math.min(5, safeMonths));
  const rentPerMonth = pricing.monthly[boundedMonths] || pricing.monthly[5];
  const messPerMonth = pricing.mess;

  const rentTotal = rentPerMonth * safeMonths;
  const messTotal = messPerMonth * safeMonths;
  const deposit = payAdvance ? Number(advanceAmount || 0) : 0;
  const youstelAmount = rentTotal + deposit;
  const hufAmount = messTotal;

  return {
    monthsSelected: safeMonths,
    packageLabel: `${boundedMonths} Month${boundedMonths > 1 ? 's' : ''} Package`,
    rentPerMonth,
    messPerMonth,
    rentTotal,
    messTotal,
    deposit,
    youstelAmount,
    hufAmount,
    total: youstelAmount + hufAmount
  };
};

const StudentRegistration = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: 'female',
    bloodGroup: 'A+',
    religion: '',
    caste: '',
    aadharNumber: '',
    address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India'
    },
    institute: '',
    department: '',
    semester: 1,
    previousEducationDetails: '',
    guardianName: '',
    guardianLocalName: '',
    motherName: '',
    fatherOccupation: '',
    motherOccupation: '',
    guardianPhone: '',
    guardianEmail: '',
    motherEmail: '',
    motherMobileNumber: '',
    fatherMobileNumber: '',
    guardianLocalArea: '',
    preferredRoomType: '2-sharing-ac',
    admissionDate: '',
    admissionMonths: 1,
    admissionUpToDate: '',
    advanceAmount: 10000,
    payAdvance: true,
    profilePhoto: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [qrCodeData, setQrCodeData] = useState(null);
  const [registrationId, setRegistrationId] = useState(null);
  const [submittedFormData, setSubmittedFormData] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [emailError, setEmailError] = useState('');
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    if (!formData.admissionDate) return;
    const computedEndDate = calculateAdmissionEndDate(formData.admissionDate, formData.admissionMonths || 1);
    if (computedEndDate && formData.admissionUpToDate !== computedEndDate) {
      setFormData((prev) => ({ ...prev, admissionUpToDate: computedEndDate }));
    }
  }, [formData.admissionDate, formData.admissionMonths]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData({
        ...formData,
        address: {
          ...formData.address,
          [addressField]: value
        }
      });
    } else if (type === 'checkbox') {
      setFormData({
        ...formData,
        [name]: checked,
        // If payAdvance is checked, set advanceAmount to 10000 if it's 0, otherwise keep current value
        // If payAdvance is unchecked, set advanceAmount to 0
        advanceAmount: name === 'payAdvance' 
          ? (checked ? (formData.advanceAmount === 0 ? 10000 : formData.advanceAmount) : 0)
          : formData.advanceAmount
      });
    } else {
      setFormData({
        ...formData,
        [name]: name === 'semester' || name === 'advanceAmount' || name === 'admissionMonths' ? (value === '' ? (name === 'advanceAmount' ? 0 : 1) : parseInt(value) || (name === 'advanceAmount' ? 0 : 1)) : value
      });
      
      // Real-time email validation
      if (name === 'email' && value) {
        const trimmedEmail = value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (trimmedEmail && !emailRegex.test(trimmedEmail)) {
          if (trimmedEmail.includes(' ')) {
            setEmailError('Email cannot contain spaces');
          } else if (!trimmedEmail.includes('@')) {
            setEmailError('Email must contain @ symbol');
          } else if (trimmedEmail.split('@').length !== 2) {
            setEmailError('Email can only have one @ symbol');
          } else {
            setEmailError('Invalid email format');
          }
        } else {
          setEmailError('');
        }
      } else if (name === 'email' && !value) {
        setEmailError('');
      }
    }
  };

  const breakdown = useMemo(() => (
    calculateFeeBreakdown(
      formData.preferredRoomType,
      formData.admissionMonths,
      formData.advanceAmount,
      formData.payAdvance
    )
  ), [formData.preferredRoomType, formData.admissionMonths, formData.advanceAmount, formData.payAdvance]);

  const handlePhotoUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setPhotoError('Please upload a valid image file.');
      return;
    }

    if (file.size > MAX_PHOTO_SIZE) {
      setPhotoError('File size must be under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result?.toString() || '';
      setFormData((prev) => ({ ...prev, profilePhoto: result }));
      setPhotoPreview(result);
      setPhotoError('');
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setFormData((prev) => ({ ...prev, profilePhoto: '' }));
    setPhotoPreview('');
    setPhotoError('');
  };

  const handleSubmit = useCallback(async (e) => {
    // Prevent default form behavior
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('🔵 Form submit triggered', {
      isSubmittingRef: isSubmittingRef.current,
      loading,
      submitted,
      formData: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        admissionDate: formData.admissionDate,
        admissionMonths: formData.admissionMonths
      }
    });
    
    // Prevent multiple submissions using ref (more reliable than state)
    if (isSubmittingRef.current) {
      console.log('⚠️ Form submission already in progress (ref check)');
      return;
    }
    
    if (loading) {
      console.log('⚠️ Form submission already in progress (loading check)');
      return;
    }
    
    if (submitted) {
      console.log('⚠️ Form already submitted');
      return;
    }
    
    // Set ref immediately to prevent double submission
    isSubmittingRef.current = true;
    
    setError('');
    setSuccess('');

    // Validation
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
      const missing = [];
      if (!formData.firstName) missing.push('First Name');
      if (!formData.lastName) missing.push('Last Name');
      if (!formData.email) missing.push('Email');
      if (!formData.phone) missing.push('Phone');
      setError(`Please fill in all required fields: ${missing.join(', ')}`);
      isSubmittingRef.current = false; // Reset ref on validation error
      return;
    }

    if (!formData.guardianName || !formData.guardianPhone) {
      const missing = [];
      if (!formData.guardianName) missing.push('Guardian Name');
      if (!formData.guardianPhone) missing.push('Local Guardian Phone Number');
      setError(`Please fill in all guardian information: ${missing.join(', ')}`);
      isSubmittingRef.current = false; // Reset ref on validation error
      return;
    }

    if (!formData.institute) {
      setError('Please enter institute name');
      isSubmittingRef.current = false; // Reset ref on validation error
      return;
    }

    if (!formData.admissionDate) {
      setError('Please select admission date');
      isSubmittingRef.current = false; // Reset ref on validation error
      return;
    }

    if (!formData.admissionMonths || formData.admissionMonths < 1 || formData.admissionMonths > 12) {
      setError('Please enter a valid number of months (1-12)');
      isSubmittingRef.current = false; // Reset ref on validation error
      return;
    }

    // Validate profile photo is required
    if (!formData.profilePhoto || !formData.profilePhoto.trim()) {
      setError('Profile photo is required. Please upload a passport photo.');
      isSubmittingRef.current = false; // Reset ref on validation error
      return;
    }

    // Validate email format - trim and check
    const trimmedEmail = formData.email.trim();
    if (!trimmedEmail) {
      setError('Email address is required. Please enter your email.');
      isSubmittingRef.current = false;
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError(`Invalid email format. Please enter a valid email address (e.g., name@example.com). You entered: ${formData.email}`);
      isSubmittingRef.current = false; // Reset ref on validation error
      return;
    }
    
    // Check for common email mistakes
    if (trimmedEmail.includes(' ')) {
      setError('Email address cannot contain spaces. Please remove spaces from your email.');
      isSubmittingRef.current = false;
      return;
    }
    
    if (!trimmedEmail.includes('@')) {
      setError('Email address must contain @ symbol. Please enter a valid email address.');
      isSubmittingRef.current = false;
      return;
    }
    
    if (trimmedEmail.split('@').length !== 2) {
      setError('Email address can only contain one @ symbol. Please check your email.');
      isSubmittingRef.current = false;
      return;
    }

    const phoneRegex = /^[0-9]{10,}$/;
    const cleanedPhone = formData.phone.replace(/[\s\-\(\)]/g, '');
    if (!phoneRegex.test(cleanedPhone)) {
      setError(`Please enter a valid phone number (minimum 10 digits). You entered: ${formData.phone}`);
      isSubmittingRef.current = false; // Reset ref on validation error
      return;
    }
    
    // Validate guardian phone too
    const cleanedGuardianPhone = formData.guardianPhone.replace(/[\s\-\(\)]/g, '');
    if (!phoneRegex.test(cleanedGuardianPhone)) {
      setError(`Please enter a valid local guardian phone number (minimum 10 digits). You entered: ${formData.guardianPhone}`);
      isSubmittingRef.current = false; // Reset ref on validation error
      return;
    }

    setLoading(true);
    // Clear photo error before submission since photo is optional
    setPhotoError('');

    try {
      // Prepare data for submission - convert empty strings to undefined for optional fields
      // Ensure dateOfBirth is set (required by backend)
      // Trim and normalize email
      const submissionData = {
        ...formData,
        email: formData.email.trim().toLowerCase(), // Normalize email: trim and lowercase
        dateOfBirth: formData.dateOfBirth || new Date().toISOString().split('T')[0], // Default to today if not provided
        bloodGroup: formData.bloodGroup || undefined,
        religion: formData.religion || undefined,
        caste: formData.caste || undefined,
        aadharNumber: formData.aadharNumber || undefined,
        guardianEmail: formData.guardianEmail || undefined,
        motherEmail: formData.motherEmail || undefined,
        guardianLocalName: formData.guardianLocalName || undefined,
        motherName: formData.motherName || undefined,
        fatherOccupation: formData.fatherOccupation || undefined,
        motherOccupation: formData.motherOccupation || undefined,
        motherMobileNumber: formData.motherMobileNumber || undefined,
        fatherMobileNumber: formData.fatherMobileNumber || undefined,
        institute: formData.institute || undefined,
        department: formData.department || undefined,
        previousEducationDetails: formData.previousEducationDetails || undefined,
        admissionDate: formData.admissionDate || new Date().toISOString().split('T')[0],
        admissionMonths: formData.admissionMonths || 1,
        admissionUpToDate: formData.admissionUpToDate || undefined,
        advanceAmount: formData.payAdvance ? (formData.advanceAmount || 10000) : 0,
        guardianLocalArea: formData.guardianLocalArea || undefined,
        profilePhoto: formData.profilePhoto, // Always include - now required
        address: {
          ...formData.address,
          street: formData.address.street || undefined,
          city: formData.address.city || undefined,
          state: formData.address.state || undefined,
          pincode: formData.address.pincode || undefined
        }
      };

      // Use API service instead of direct axios call
      console.log('📤 Submitting registration...');
      console.log('Form Data:', submissionData);
      
      let response;
      try {
        // Use API service which handles baseURL and /api prefix automatically
        response = await submitStudentRegistration(submissionData);
      } catch (axiosError) {
        // If axios throws an error (network, timeout, etc.), rethrow it
        console.error('❌ Axios request error:', axiosError);
        console.error('Error details:', {
          message: axiosError.message,
          code: axiosError.code,
          response: axiosError.response?.data,
          status: axiosError.response?.status,
          config: {
            url: axiosError.config?.url,
            method: axiosError.config?.method,
            baseURL: axiosError.config?.baseURL
          }
        });
        throw axiosError;
      }

      console.log('✅ Registration response:', response);
      console.log('Response status:', response.status);
      console.log('Response data:', response.data);

      // Check if response is successful
      if (response.status >= 200 && response.status < 300) {
        if (response.data && response.data.success) {
          setSuccess(response.data.message || 'Registration submitted successfully! Your request is pending admin approval.');
          // Store submitted form data before resetting
          setSubmittedFormData({ ...formData });
          // Store QR code if available
          if (response.data.data && response.data.data.qrCode) {
            setQrCodeData(response.data.data.qrCode);
          }
          // Store Student ID (preferred) or Registration ID as fallback
          if (response.data.data && response.data.data.studentId) {
            setRegistrationId(response.data.data.studentId);
          } else if (response.data.data && response.data.data._id) {
            setRegistrationId(response.data.data._id);
          }
          setSubmitted(true);
          setLoading(false);
          isSubmittingRef.current = false; // Reset ref
          
          // Reset form after 5 seconds
          setTimeout(() => {
            setFormData({
              firstName: '',
              middleName: '',
              lastName: '',
              email: '',
              phone: '',
              dateOfBirth: '',
              gender: 'female',
              bloodGroup: 'A+',
              religion: '',
              caste: '',
              aadharNumber: '',
              address: {
                street: '',
                city: '',
                state: '',
                pincode: '',
                country: 'India'
              },
              institute: '',
              department: '',
              semester: 1,
              guardianName: '',
              guardianLocalName: '',
              motherName: '',
              fatherOccupation: '',
              motherOccupation: '',
              guardianPhone: '',
              guardianEmail: '',
              motherEmail: '',
              motherMobileNumber: '',
              fatherMobileNumber: '',
              guardianLocalArea: '',
              preferredRoomType: '2-sharing-ac',
              admissionDate: '',
              admissionMonths: 1,
              admissionUpToDate: '',
              advanceAmount: 10000,
              payAdvance: true,
              previousEducationDetails: '',
              profilePhoto: ''
            });
            setSubmitted(false);
            setSuccess('');
            setQrCodeData(null);
            setRegistrationId(null);
            setPhotoPreview('');
            setPhotoError('');
          }, 5000);
        } else {
          // Response status is 200-299 but success is false
          const errorMsg = response.data?.message || response.data?.error || `Registration failed. Server returned status ${response.status}`;
          throw new Error(errorMsg);
        }
      } else {
        // Handle non-2xx response status
        console.error('❌ Non-2xx response received');
        console.error('Response status:', response.status);
        console.error('Response headers:', response.headers);
        console.error('Response data type:', typeof response.data);
        console.error('Response data:', response.data);
        
        // Check if response is HTML (404 page)
        if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>')) {
          console.error('⚠️ Received HTML response instead of JSON - route not found');
          const currentApiUrl = getCurrentApiBaseUrl();
          throw new Error(`Route not found (404). Backend server may not be running or route is incorrect. Check: ${currentApiUrl}/student-registration`);
        }
        
        const errorMsg = response.data?.message || response.data?.error || 
          (response.data?.toString().substring(0, 200)) || 
          `Registration failed with status ${response.status}`;
        throw new Error(errorMsg);
      }
    } catch (err) {
      console.error('❌ Registration error:', err);
      console.error('Error type:', err.constructor.name);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      console.error('Error request:', err.request);
      console.error('Error message:', err.message);
      console.error('Error code:', err.code);
      console.error('Full error:', JSON.stringify(err, null, 2));
      
      let errorMessage = 'Registration failed. Please try again.';
      
      // Handle different types of errors
      if (err.response) {
        // Server responded with error status
        const responseData = err.response.data;
        const status = err.response.status;
        
        if (responseData?.message) {
          errorMessage = responseData.message;
          
          // Highlight email-specific errors
          if (errorMessage.toLowerCase().includes('email')) {
            if (errorMessage.toLowerCase().includes('already exists') || errorMessage.toLowerCase().includes('already submitted')) {
              errorMessage = `⚠️ Email Error: ${errorMessage}\n\nThis email is already registered. Please use a different email address or contact admin if you believe this is an error.`;
            } else if (errorMessage.toLowerCase().includes('invalid email') || errorMessage.toLowerCase().includes('email format')) {
              errorMessage = `📧 Email Format Error: ${errorMessage}\n\nPlease check your email address and try again.`;
            } else {
              errorMessage = `📧 Email Error: ${errorMessage}`;
            }
          }
        } else if (responseData?.error) {
          errorMessage = responseData.error;
        } else {
          errorMessage = `Server error (${status}): ${responseData || 'Unknown error'}`;
        }
        
        if (status === 0 || status === 404) {
          const currentApiUrl = getCurrentApiBaseUrl();
          errorMessage = `❌ Server not found (${status}). Please check if the backend server is running at ${currentApiUrl}`;
        } else if (status === 400) {
          // Bad request - show the specific error message with better formatting
          if (!errorMessage.includes('Email Error') && !errorMessage.includes('Email Format Error')) {
            errorMessage = responseData?.message || 'Invalid data. Please check all fields and try again.';
          }
        } else if (status === 500) {
          errorMessage = '❌ Server error (500). Please try again later or contact support.';
        } else if (status >= 400 && status < 500) {
          errorMessage = `❌ Client error (${status}): ${responseData?.message || 'Please check your input and try again.'}`;
        }
      } else if (err.request) {
        // Request was made but no response received (network error, CORS, etc.)
        console.error('❌ Request error details:', {
          code: err.code,
          message: err.message,
          request: err.request,
          config: err.config
        });
        
        if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
          errorMessage = `⏱️ Request timeout. The server took too long to respond. Please try again.`;
        } else if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error') || err.message?.includes('ERR_NETWORK')) {
          const currentApiUrl = getCurrentApiBaseUrl();
          errorMessage = `🌐 Network Error (ERR_NETWORK)\n\nCannot connect to backend server.\n\n🔧 Troubleshooting Steps:\n1. Check if backend server is running on Render\n2. Check browser console (F12) for CORS errors\n3. Try direct URL: ${currentApiUrl}\n4. Check firewall/antivirus settings\n5. Verify backend URL: https://hostel-management-backend-new-1.onrender.com`;
        } else if (err.code === 'ERR_CANCELED') {
          errorMessage = 'Request was cancelled. Please try again.';
        } else if (err.code === 'ECONNREFUSED') {
          errorMessage = `❌ Connection Refused\n\nBackend server is not running or not accessible at port 5001.\n\nPlease start the backend server:\ncd backend && node server.js`;
        } else {
          const currentApiUrl = getCurrentApiBaseUrl();
          errorMessage = `❌ Network Error\n\nCannot connect to server.\n\nError Code: ${err.code || 'UNKNOWN'}\nError Message: ${err.message || 'Network error'}\nAPI URL: ${currentApiUrl}\n\nPlease check:\n1. Backend server is running on Render\n2. No firewall blocking the connection\n3. CORS is properly configured\n4. Verify backend URL: https://hostel-management-backend-new-1.onrender.com`;
        }
      } else if (err.message) {
        // Other errors (syntax errors, etc.)
        errorMessage = `❌ Error: ${err.message}`;
      } else {
        errorMessage = '❌ An unexpected error occurred. Please try again.';
      }
      
      setError(errorMessage);
      setLoading(false);
      isSubmittingRef.current = false; // Reset ref on error
    }
  }, [formData, loading, submitted]);

  // Calculate breakdown for submitted data
  const submittedBreakdown = submittedFormData ? calculateFeeBreakdown(
    submittedFormData.preferredRoomType,
    submittedFormData.admissionMonths,
    submittedFormData.advanceAmount,
    submittedFormData.payAdvance
  ) : null;

  // Print functionality
  const handlePrint = () => {
    if (!submittedFormData) return;

    const printWindow = window.open('', '_blank');
    const roomTypeLabel = ROOM_PRICING[submittedFormData.preferredRoomType]?.label || submittedFormData.preferredRoomType;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Student Registration - ${submittedFormData.firstName} ${submittedFormData.lastName}</title>
          <style>
            @media print {
              @page {
                margin: 1.5cm;
                size: A4;
              }
              .no-print {
                display: none;
              }
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.6;
              color: #333;
              padding: 20px;
              background: #fff;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 3px solid #10b981;
            }
            .header h1 {
              color: #0f766e;
              font-size: 28px;
              margin-bottom: 10px;
            }
            .header .subtitle {
              color: #666;
              font-size: 14px;
            }
            .student-id {
              background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%);
              border: 3px solid #10b981;
              border-radius: 8px;
              padding: 15px;
              text-align: center;
              margin: 20px 0;
            }
            .student-id-label {
              font-size: 14px;
              color: #065f46;
              font-weight: 600;
              margin-bottom: 5px;
            }
            .student-id-value {
              font-size: 24px;
              color: #10b981;
              font-weight: bold;
              font-family: monospace;
              letter-spacing: 2px;
            }
            .section {
              margin-bottom: 25px;
              page-break-inside: avoid;
            }
            .section-title {
              background: linear-gradient(135deg, #0f766e 0%, #059669 100%);
              color: white;
              padding: 10px 15px;
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 15px;
              border-radius: 5px;
            }
            .details-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 15px;
              margin-bottom: 15px;
            }
            .detail-item {
              padding: 10px;
              background: #f9fafb;
              border-left: 3px solid #10b981;
              border-radius: 4px;
            }
            .detail-label {
              font-size: 11px;
              color: #6b7280;
              font-weight: 600;
              text-transform: uppercase;
              margin-bottom: 5px;
            }
            .detail-value {
              font-size: 14px;
              color: #111827;
              font-weight: 500;
            }
            .fee-breakdown {
              background: linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(59,130,246,0.08) 100%);
              border: 2px solid rgba(16,185,129,0.3);
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .fee-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px dashed #ddd;
            }
            .fee-row:last-child {
              border-bottom: none;
            }
            .fee-total {
              font-size: 18px;
              font-weight: bold;
              color: #0f766e;
              margin-top: 10px;
              padding-top: 10px;
              border-top: 2px solid #10b981;
            }
            .account-box {
              display: inline-block;
              padding: 12px 20px;
              margin: 10px 10px 10px 0;
              border-radius: 8px;
              border: 2px solid;
            }
            .account-youstel {
              background: #ecfdf5;
              border-color: rgba(5,150,105,0.3);
            }
            .account-huf {
              background: #fffbeb;
              border-color: rgba(217,119,6,0.3);
            }
            .account-label {
              font-size: 12px;
              font-weight: 600;
              margin-bottom: 5px;
            }
            .account-value {
              font-size: 18px;
              font-weight: bold;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #ddd;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
            .qr-code {
              text-align: center;
              margin: 20px 0;
            }
            .qr-code img {
              max-width: 150px;
              border: 2px solid #ddd;
              padding: 10px;
              background: #fff;
            }
            .note {
              background: #fff3cd;
              border: 1px solid #ffc107;
              border-radius: 4px;
              padding: 10px;
              margin: 15px 0;
              font-size: 12px;
              color: #856404;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Student Registration Form</h1>
            <div class="subtitle">Jain Girl's Luxurious Hostel - Youstel</div>
            <div class="subtitle" style="margin-top: 10px;">Generated on: ${new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</div>
          </div>

          ${registrationId ? `
            <div class="student-id">
              <div class="student-id-label">Student ID</div>
              <div class="student-id-value">${registrationId}</div>
            </div>
          ` : ''}

          ${qrCodeData ? `
            <div class="qr-code">
              <img src="${qrCodeData}" alt="Registration QR Code" />
              <p style="margin-top: 10px; font-size: 12px; color: #666;">Registration QR Code</p>
            </div>
          ` : ''}

          ${submittedFormData.profilePhoto ? `
            <div style="text-align: center; margin: 20px 0; padding: 20px; background: #f9fafb; border-radius: 8px; border: 2px solid #e5e7eb;">
              <img src="${submittedFormData.profilePhoto}" alt="Student Photo" style="width: 150px; height: 150px; object-fit: cover; border-radius: 8px; border: 3px solid #10b981;" />
              <p style="margin-top: 10px; font-size: 12px; color: #666; font-weight: 600;">Passport Photo</p>
            </div>
          ` : ''}

          <div class="section">
            <div class="section-title">Personal Information</div>
            <div class="details-grid">
              <div class="detail-item">
                <div class="detail-label">Full Name</div>
                <div class="detail-value">${submittedFormData.firstName} ${submittedFormData.middleName || ''} ${submittedFormData.lastName}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Email</div>
                <div class="detail-value">${submittedFormData.email}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Phone Number</div>
                <div class="detail-value">${submittedFormData.phone}</div>
              </div>
              ${submittedFormData.dateOfBirth ? `
              <div class="detail-item">
                <div class="detail-label">Date of Birth</div>
                <div class="detail-value">${new Date(submittedFormData.dateOfBirth).toLocaleDateString('en-IN')}</div>
              </div>
              ` : ''}
              <div class="detail-item">
                <div class="detail-label">Gender</div>
                <div class="detail-value">${submittedFormData.gender}</div>
              </div>
              ${submittedFormData.bloodGroup ? `
              <div class="detail-item">
                <div class="detail-label">Blood Group</div>
                <div class="detail-value">${submittedFormData.bloodGroup}</div>
              </div>
              ` : ''}
              ${submittedFormData.religion ? `
              <div class="detail-item">
                <div class="detail-label">Religion</div>
                <div class="detail-value">${submittedFormData.religion}</div>
              </div>
              ` : ''}
              ${submittedFormData.caste ? `
              <div class="detail-item">
                <div class="detail-label">Caste</div>
                <div class="detail-value">${submittedFormData.caste}</div>
              </div>
              ` : ''}
              ${submittedFormData.aadharNumber ? `
              <div class="detail-item">
                <div class="detail-label">Aadhar Number</div>
                <div class="detail-value">${submittedFormData.aadharNumber}</div>
              </div>
              ` : ''}
            </div>
            ${submittedFormData.address?.street || submittedFormData.address?.city ? `
            <div style="margin-top: 15px;">
              <div class="detail-label" style="margin-bottom: 8px;">Address</div>
              <div class="detail-value">
                ${submittedFormData.address.street || ''}<br/>
                ${submittedFormData.address.city || ''}${submittedFormData.address.state ? ', ' + submittedFormData.address.state : ''}${submittedFormData.address.pincode ? ' - ' + submittedFormData.address.pincode : ''}
              </div>
            </div>
            ` : ''}
          </div>

          ${submittedFormData.institute || submittedFormData.department ? `
          <div class="section">
            <div class="section-title">Academic Information</div>
            <div class="details-grid">
              ${submittedFormData.institute ? `
              <div class="detail-item">
                <div class="detail-label">Institute</div>
                <div class="detail-value">${submittedFormData.institute}</div>
              </div>
              ` : ''}
              ${submittedFormData.department ? `
              <div class="detail-item">
                <div class="detail-label">Department</div>
                <div class="detail-value">${submittedFormData.department}</div>
              </div>
              ` : ''}
              <div class="detail-item">
                <div class="detail-label">Semester</div>
                <div class="detail-value">Semester ${submittedFormData.semester}</div>
              </div>
            </div>
          </div>
          ` : ''}

          <div class="section">
            <div class="section-title">Guardian Information</div>
            <div class="details-grid">
              <div class="detail-item">
                <div class="detail-label">Guardian Name</div>
                <div class="detail-value">${submittedFormData.guardianName}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Guardian Phone</div>
                <div class="detail-value">${submittedFormData.guardianPhone}</div>
              </div>
              ${submittedFormData.guardianEmail ? `
              <div class="detail-item">
                <div class="detail-label">Guardian Email</div>
                <div class="detail-value">${submittedFormData.guardianEmail}</div>
              </div>
              ` : ''}
              ${submittedFormData.motherMobileNumber ? `
              <div class="detail-item">
                <div class="detail-label">Mother Mobile</div>
                <div class="detail-value">${submittedFormData.motherMobileNumber}</div>
              </div>
              ` : ''}
              ${submittedFormData.fatherMobileNumber ? `
              <div class="detail-item">
                <div class="detail-label">Father Mobile</div>
                <div class="detail-value">${submittedFormData.fatherMobileNumber}</div>
              </div>
              ` : ''}
            </div>
          </div>

          <div class="section">
            <div class="section-title">Room & Admission Details</div>
            <div class="details-grid">
              <div class="detail-item">
                <div class="detail-label">Preferred Room Type</div>
                <div class="detail-value">${roomTypeLabel}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Package Duration</div>
                <div class="detail-value">${submittedFormData.admissionMonths} Month${submittedFormData.admissionMonths > 1 ? 's' : ''}</div>
              </div>
              ${submittedFormData.admissionDate ? `
              <div class="detail-item">
                <div class="detail-label">Admission Date</div>
                <div class="detail-value">${new Date(submittedFormData.admissionDate).toLocaleDateString('en-IN')}</div>
              </div>
              ` : ''}
              ${submittedFormData.admissionUpToDate ? `
              <div class="detail-item">
                <div class="detail-label">Admission Up To</div>
                <div class="detail-value">${new Date(submittedFormData.admissionUpToDate).toLocaleDateString('en-IN')}</div>
              </div>
              ` : ''}
            </div>
          </div>

          ${submittedBreakdown ? `
          <div class="section">
            <div class="section-title">Fee Breakdown</div>
            <div class="fee-breakdown">
              <div class="fee-row">
                <span>Room Rent (₹${submittedBreakdown.rentPerMonth.toLocaleString()}/month × ${submittedBreakdown.monthsSelected} month${submittedBreakdown.monthsSelected > 1 ? 's' : ''})</span>
                <span><strong>₹${submittedBreakdown.rentTotal.toLocaleString()}</strong></span>
              </div>
              <div class="fee-row">
                <span>Mess Charges (₹${submittedBreakdown.messPerMonth.toLocaleString()}/month × ${submittedBreakdown.monthsSelected} month${submittedBreakdown.monthsSelected > 1 ? 's' : ''})</span>
                <span><strong>₹${submittedBreakdown.messTotal.toLocaleString()}</strong></span>
              </div>
              <div class="fee-row">
                <span>Security Deposit</span>
                <span><strong>₹${submittedBreakdown.deposit.toLocaleString()}</strong></span>
              </div>
              <div class="fee-total">
                <div style="display: flex; justify-content: space-between;">
                  <span>Total Estimated Payment:</span>
                  <span>₹${submittedBreakdown.total.toLocaleString()}</span>
                </div>
              </div>
              <div style="margin-top: 15px;">
                <div class="account-box account-youstel">
                  <div class="account-label" style="color: #047857;">Youstel Account (Rent + Deposit)</div>
                  <div class="account-value" style="color: #065f46;">₹${submittedBreakdown.youstelAmount.toLocaleString()}</div>
                </div>
                <div class="account-box account-huf">
                  <div class="account-label" style="color: #b45309;">HUF Account (Mess)</div>
                  <div class="account-value" style="color: #92400e;">₹${submittedBreakdown.hufAmount.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
          ` : ''}

          <div class="note">
            <strong>Note:</strong> This is a registration confirmation. Your registration is pending admin approval. You will receive an email once your registration is approved. Actual fees may vary and will be confirmed by the admin during approval.
          </div>

          <div class="footer">
            <p><strong>Jain Girl's Luxurious Hostel - Youstel</strong></p>
            <p>This is a system-generated document. Please keep this for your records.</p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  if (submitted && success) {
    return (
      <div className="auth-container">
        <div className="auth-decorations">
          <div className="circle circle-1"></div>
          <div className="circle circle-2"></div>
          <div className="circle circle-3"></div>
        </div>
        
        <div className="auth-card" style={{ maxWidth: '900px', textAlign: 'center' }}>
          <div className="auth-header">
            <div className="logo-small">
              <img src="/logo.png" alt="Youstel" />
            </div>
            <div style={{ fontSize: '64px', color: '#10b981', margin: '20px 0' }}>
              <CheckCircleIcon style={{ fontSize: '64px' }} />
            </div>
            <h2>Registration Submitted Successfully!</h2>
            <p style={{ color: '#10b981', fontSize: '18px', marginTop: '10px' }}>{success}</p>
            
            {registrationId && (
              <div style={{ 
                margin: '20px 0', 
                padding: '20px', 
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)', 
                border: '3px solid #10b981', 
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <p style={{ color: '#065f46', fontSize: '16px', marginBottom: '10px', fontWeight: '700' }}>
                  🎓 Your Student ID:
                </p>
                <p style={{ 
                  color: '#10b981', 
                  fontSize: '32px', 
                  fontWeight: 'bold', 
                  fontFamily: 'monospace',
                  letterSpacing: '3px',
                  margin: '10px 0',
                  textShadow: '0 2px 4px rgba(16, 185, 129, 0.3)'
                }}>
                  {registrationId}
                </p>
                <p style={{ color: '#047857', fontSize: '13px', marginTop: '10px', fontStyle: 'italic' }}>
                  ✅ Please save this ID for future reference
                </p>
              </div>
            )}

            {qrCodeData && (
              <div style={{ margin: '20px 0' }}>
                <p style={{ color: '#666', fontSize: '14px', marginBottom: '10px', fontWeight: '600' }}>Your Registration QR Code:</p>
                <img 
                  src={qrCodeData} 
                  alt="Registration QR Code" 
                  style={{ 
                    maxWidth: '200px', 
                    height: 'auto', 
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    padding: '10px',
                    background: '#fff'
                  }} 
                />
              </div>
            )}

            {/* Complete Registration Details */}
            {submittedFormData && (
              <div style={{ 
                marginTop: '30px', 
                textAlign: 'left',
                background: '#f9fafb',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid #e5e7eb'
              }}>
                <h3 style={{ 
                  color: '#0f766e', 
                  fontSize: '20px', 
                  fontWeight: '700', 
                  marginBottom: '20px',
                  borderBottom: '2px solid #10b981',
                  paddingBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <PersonIcon /> Complete Registration Details
                </h3>

                {/* Personal Information */}
                <div style={{ marginBottom: '24px', padding: '16px', background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                  <h4 style={{ color: '#667eea', fontSize: '16px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <PersonIcon style={{ fontSize: '18px' }} /> Personal Information
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div>
                      <p style={{ margin: '0', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Full Name</p>
                      <p style={{ margin: '4px 0', fontSize: '14px', color: '#111827', fontWeight: '500' }}>
                        {submittedFormData.firstName} {submittedFormData.middleName || ''} {submittedFormData.lastName}
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: '0', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Email</p>
                      <p style={{ margin: '4px 0', fontSize: '14px', color: '#111827', fontWeight: '500' }}>{submittedFormData.email}</p>
                    </div>
                    <div>
                      <p style={{ margin: '0', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Phone</p>
                      <p style={{ margin: '4px 0', fontSize: '14px', color: '#111827', fontWeight: '500' }}>{submittedFormData.phone}</p>
                    </div>
                    {submittedFormData.dateOfBirth && (
                      <div>
                        <p style={{ margin: '0', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Date of Birth</p>
                        <p style={{ margin: '4px 0', fontSize: '14px', color: '#111827', fontWeight: '500' }}>
                          {new Date(submittedFormData.dateOfBirth).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                    )}
                    <div>
                      <p style={{ margin: '0', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Gender</p>
                      <p style={{ margin: '4px 0', fontSize: '14px', color: '#111827', fontWeight: '500' }}>{submittedFormData.gender}</p>
                    </div>
                    {submittedFormData.bloodGroup && (
                      <div>
                        <p style={{ margin: '0', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Blood Group</p>
                        <p style={{ margin: '4px 0', fontSize: '14px', color: '#111827', fontWeight: '500' }}>{submittedFormData.bloodGroup}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Academic Information */}
                {(submittedFormData.institute || submittedFormData.department) && (
                  <div style={{ marginBottom: '24px', padding: '16px', background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <h4 style={{ color: '#f59e0b', fontSize: '16px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <SchoolIcon style={{ fontSize: '18px' }} /> Academic Information
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                      {submittedFormData.institute && (
                        <div>
                          <p style={{ margin: '0', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Institute</p>
                          <p style={{ margin: '4px 0', fontSize: '14px', color: '#111827', fontWeight: '500' }}>{submittedFormData.institute}</p>
                        </div>
                      )}
                      {submittedFormData.department && (
                        <div>
                          <p style={{ margin: '0', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Department</p>
                          <p style={{ margin: '4px 0', fontSize: '14px', color: '#111827', fontWeight: '500' }}>{submittedFormData.department}</p>
                        </div>
                      )}
                      <div>
                        <p style={{ margin: '0', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Semester</p>
                        <p style={{ margin: '4px 0', fontSize: '14px', color: '#111827', fontWeight: '500' }}>Semester {submittedFormData.semester}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Guardian Information */}
                <div style={{ marginBottom: '24px', padding: '16px', background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                  <h4 style={{ color: '#ef4444', fontSize: '16px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <PeopleIcon style={{ fontSize: '18px' }} /> Guardian Information
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div>
                      <p style={{ margin: '0', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Guardian Name</p>
                      <p style={{ margin: '4px 0', fontSize: '14px', color: '#111827', fontWeight: '500' }}>{submittedFormData.guardianName}</p>
                    </div>
                    <div>
                      <p style={{ margin: '0', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Guardian Phone</p>
                      <p style={{ margin: '4px 0', fontSize: '14px', color: '#111827', fontWeight: '500' }}>{submittedFormData.guardianPhone}</p>
                    </div>
                    {submittedFormData.guardianEmail && (
                      <div>
                        <p style={{ margin: '0', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Guardian Email</p>
                        <p style={{ margin: '4px 0', fontSize: '14px', color: '#111827', fontWeight: '500' }}>{submittedFormData.guardianEmail}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Room & Admission Details */}
                <div style={{ marginBottom: '24px', padding: '16px', background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                  <h4 style={{ color: '#10b981', fontSize: '16px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <HomeIcon style={{ fontSize: '18px' }} /> Room & Admission Details
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div>
                      <p style={{ margin: '0', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Preferred Room Type</p>
                      <p style={{ margin: '4px 0', fontSize: '14px', color: '#111827', fontWeight: '500' }}>
                        {ROOM_PRICING[submittedFormData.preferredRoomType]?.label || submittedFormData.preferredRoomType}
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: '0', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Package Duration</p>
                      <p style={{ margin: '4px 0', fontSize: '14px', color: '#111827', fontWeight: '500' }}>
                        {submittedFormData.admissionMonths} Month{submittedFormData.admissionMonths > 1 ? 's' : ''}
                      </p>
                    </div>
                    {submittedFormData.admissionDate && (
                      <div>
                        <p style={{ margin: '0', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Admission Date</p>
                        <p style={{ margin: '4px 0', fontSize: '14px', color: '#111827', fontWeight: '500' }}>
                          {new Date(submittedFormData.admissionDate).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                    )}
                    {submittedFormData.admissionUpToDate && (
                      <div>
                        <p style={{ margin: '0', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Admission Up To</p>
                        <p style={{ margin: '4px 0', fontSize: '14px', color: '#111827', fontWeight: '500' }}>
                          {new Date(submittedFormData.admissionUpToDate).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Fee Breakdown */}
                {submittedBreakdown && (
                  <div style={{ marginBottom: '24px', padding: '16px', background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(59,130,246,0.08) 100%)', borderRadius: '8px', border: '2px solid rgba(16,185,129,0.3)' }}>
                    <h4 style={{ color: '#0f766e', fontSize: '16px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AccountBalanceIcon style={{ fontSize: '18px' }} /> Fee Breakdown
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <p style={{ margin: '0', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Room Rent</p>
                        <p style={{ margin: '4px 0', fontSize: '16px', color: '#111827', fontWeight: '700' }}>
                          ₹{submittedBreakdown.rentTotal.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p style={{ margin: '0', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Mess Charges</p>
                        <p style={{ margin: '4px 0', fontSize: '16px', color: '#b45309', fontWeight: '700' }}>
                          ₹{submittedBreakdown.messTotal.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p style={{ margin: '0', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Security Deposit</p>
                        <p style={{ margin: '4px 0', fontSize: '16px', color: '#1d4ed8', fontWeight: '700' }}>
                          ₹{submittedBreakdown.deposit.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ background: '#ecfdf5', padding: '12px', borderRadius: '8px', border: '1px solid rgba(5,150,105,0.2)' }}>
                        <p style={{ margin: '0', fontSize: '12px', color: '#047857', fontWeight: '600' }}>Youstel Account</p>
                        <p style={{ margin: '4px 0', fontSize: '18px', color: '#065f46', fontWeight: '700' }}>
                          ₹{submittedBreakdown.youstelAmount.toLocaleString()}
                        </p>
                      </div>
                      <div style={{ background: '#fffbeb', padding: '12px', borderRadius: '8px', border: '1px solid rgba(217,119,6,0.2)' }}>
                        <p style={{ margin: '0', fontSize: '12px', color: '#b45309', fontWeight: '600' }}>HUF Account</p>
                        <p style={{ margin: '4px 0', fontSize: '18px', color: '#92400e', fontWeight: '700' }}>
                          ₹{submittedBreakdown.hufAmount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div style={{ marginTop: '12px', padding: '12px', background: 'linear-gradient(135deg, #0f766e 0%, #059669 100%)', borderRadius: '8px' }}>
                      <p style={{ margin: '0', fontSize: '14px', color: '#d1fae5', fontWeight: '600', marginBottom: '4px' }}>
                        Total Estimated Payment
                      </p>
                      <p style={{ margin: '0', fontSize: '24px', color: '#fff', fontWeight: '800' }}>
                        ₹{submittedBreakdown.total.toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <p style={{ color: '#666', marginTop: '20px', fontSize: '14px' }}>
              Your registration is pending admin approval. You will receive an email once your registration is approved.
            </p>
            
            <div style={{ 
              display: 'flex', 
              gap: '15px', 
              justifyContent: 'center', 
              flexWrap: 'wrap',
              marginTop: '30px' 
            }}>
              <button
                type="button"
                onClick={handlePrint}
                className="btn"
                style={{ 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#fff',
                  border: 'none',
                  padding: '12px 30px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                }}
              >
                <PrintIcon style={{ fontSize: '18px' }} />
                Print Registration
              </button>
              
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSubmitted(false);
                  setSuccess('');
                  setQrCodeData(null);
                  setRegistrationId(null);
                  setSubmittedFormData(null);
                }}
                className="btn btn-primary"
                style={{ width: 'auto', padding: '12px 30px' }}
              >
                Submit Another Registration
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="auth-container">
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
            <div className="loading-text">Submitting your registration...</div>
          </div>
        </div>
      )}
      
      <div className="auth-decorations">
        <div className="circle circle-1"></div>
        <div className="circle circle-2"></div>
        <div className="circle circle-3"></div>
        <div className="circle circle-4"></div>
      </div>
      
      <div className="auth-card registration-card" style={{ maxWidth: '700px' }}>
        <div className="auth-header">
          <div className="logo-small">
            <img src="/logo.png" alt="Youstel" />
          </div>
          <h2>Student Registration Form</h2>
          <p>Jain Girl's Luxurious Hostel - Youstel</p>
          <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
            Fill in your details below. Your registration will be reviewed by the admin.
          </p>
        </div>

        {error && (
          <div className="alert alert-error animate-shake" style={{ whiteSpace: 'pre-line' }}>
            <span className="alert-icon"><CancelIcon style={{ fontSize: '18px' }} /></span>
            <div style={{ lineHeight: '1.6' }}>{error}</div>
          </div>
        )}
        {success && !submitted && (
          <div className="alert alert-success">
            <span className="alert-icon"><CheckCircleIcon style={{ fontSize: '18px' }} /></span>
            {success}
          </div>
        )}

        <form 
          onSubmit={async (e) => {
            console.log('📝 Form onSubmit event triggered');
            e.preventDefault();
            e.stopPropagation();
            try {
              console.log('📝 Calling handleSubmit...');
              await handleSubmit(e);
            } catch (err) {
              console.error('❌ Form submission error:', err);
              setError('An unexpected error occurred. Please try again.');
              setLoading(false);
              isSubmittingRef.current = false;
            }
          }}
          onKeyDown={(e) => {
            // Allow Enter key to submit form
            if (e.key === 'Enter' && e.target.type !== 'submit' && e.target.tagName !== 'TEXTAREA') {
              // Don't prevent default, let form handle it
            }
          }}
          noValidate
          className="auth-form registration-form" 
          style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '10px' }}
        >
          {/* Personal Information */}
          <div style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '2px solid #e0e0e0' }}>
            <h3 style={{ color: '#667eea', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <PersonIcon style={{ fontSize: '20px' }} /> Personal Information
            </h3>
            <div className="form-row">
              <div className="form-group">
                <label>First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Enter first name"
                  required
                />
              </div>
              <div className="form-group">
                <label>Middle Name</label>
                <input
                  type="text"
                  name="middleName"
                  value={formData.middleName}
                  onChange={handleChange}
                  placeholder="Enter middle name"
                />
              </div>
              <div className="form-group">
                <label>Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Enter last name"
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <EmailIcon style={{ fontSize: '16px' }} /> Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your.email@example.com"
                  required
                  style={{
                    borderColor: emailError ? '#ef4444' : undefined,
                    borderWidth: emailError ? '2px' : undefined
                  }}
                />
                {emailError && (
                  <p style={{ 
                    margin: '4px 0 0', 
                    fontSize: '12px', 
                    color: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <CancelIcon style={{ fontSize: '14px' }} />
                    {emailError}
                  </p>
                )}
                {!emailError && formData.email && formData.email.trim() && (
                  <p style={{ 
                    margin: '4px 0 0', 
                    fontSize: '12px', 
                    color: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <CheckCircleIcon style={{ fontSize: '14px' }} />
                    Valid email format
                  </p>
                )}
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <PhoneIcon style={{ fontSize: '16px' }} /> Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="9876543210"
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <CalendarIcon style={{ fontSize: '16px' }} /> Date of Birth
                </label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>Gender *</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  required
                >
                  <option value="female">Female</option>
                </select>
              </div>
              <div className="form-group">
                <label>Blood Group</label>
                <select
                  name="bloodGroup"
                  value={formData.bloodGroup}
                  onChange={handleChange}
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Religion</label>
                <input
                  type="text"
                  name="religion"
                  value={formData.religion}
                  onChange={handleChange}
                  placeholder="Enter religion"
                />
              </div>
              <div className="form-group">
                <label>Caste</label>
                <input
                  type="text"
                  name="caste"
                  value={formData.caste}
                  onChange={handleChange}
                  placeholder="Enter caste"
                />
              </div>
              <div className="form-group">
                <label>Aadhar Number</label>
                <input
                  type="text"
                  name="aadharNumber"
                  value={formData.aadharNumber}
                  onChange={handleChange}
                  placeholder="Enter Aadhar number"
                  maxLength="12"
                />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Upload Passport Photo <span style={{ color: '#ef4444' }}>*</span></span>
                  <span style={{ fontSize: '11px', color: '#888' }}>Max 2MB (JPG/PNG)</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  required
                  style={{ padding: '6px 0' }}
                />
                {photoError && (
                  <p style={{ color: '#b91c1c', fontSize: '12px', marginTop: '6px' }}>{photoError}</p>
                )}
                {(photoPreview || formData.profilePhoto) && (
                  <div style={{
                    marginTop: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    flexWrap: 'wrap'
                  }}>
                    <img
                      src={photoPreview || formData.profilePhoto}
                      alt="Profile preview"
                      style={{ width: '96px', height: '96px', objectFit: 'cover', borderRadius: '10px', border: '2px solid #e5e5e5' }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '8px 16px' }}
                      onClick={handleRemovePhoto}
                    >
                      Remove Photo
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '2px solid #e0e0e0' }}>
            <h3 style={{ color: '#10b981', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <HomeIcon style={{ fontSize: '20px' }} /> Address Information
            </h3>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <LocationIcon style={{ fontSize: '16px' }} /> Street Address
              </label>
              <input
                type="text"
                name="address.street"
                value={formData.address.street}
                onChange={handleChange}
                placeholder="Street address"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  name="address.city"
                  value={formData.address.city}
                  onChange={handleChange}
                  placeholder="City"
                />
              </div>
              <div className="form-group">
                <label>State</label>
                <input
                  type="text"
                  name="address.state"
                  value={formData.address.state}
                  onChange={handleChange}
                  placeholder="State"
                />
              </div>
              <div className="form-group">
                <label>Pincode</label>
                <input
                  type="text"
                  name="address.pincode"
                  value={formData.address.pincode}
                  onChange={handleChange}
                  placeholder="Pincode"
                />
              </div>
            </div>
          </div>

          {/* Academic Information */}
          <div style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '2px solid #e0e0e0' }}>
            <h3 style={{ color: '#f59e0b', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <SchoolIcon style={{ fontSize: '20px' }} /> Academic Information
            </h3>
            <div className="form-row">
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <SchoolIcon style={{ fontSize: '16px' }} /> Institute *
                </label>
                <input
                  type="text"
                  name="institute"
                  value={formData.institute}
                  onChange={handleChange}
                  placeholder="Enter institute/college name"
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Department</label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  placeholder="e.g., Computer Science"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Previous Education Details</label>
                <textarea
                  name="previousEducationDetails"
                  value={formData.previousEducationDetails}
                  onChange={handleChange}
                  placeholder="Share your last school/college, course, grades etc."
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>
          </div>

          {/* Guardian Information */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ color: '#ef4444', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <PeopleIcon style={{ fontSize: '20px' }} /> Guardian Information *
            </h3>
            <div className="form-row">
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <PersonIcon style={{ fontSize: '16px' }} /> Father Name *
                </label>
                <input
                  type="text"
                  name="guardianName"
                  value={formData.guardianName}
                  onChange={handleChange}
                  placeholder="Enter father's name"
                  required
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <PersonIcon style={{ fontSize: '16px' }} /> Mother Name
                </label>
                <input
                  type="text"
                  name="motherName"
                  value={formData.motherName || ''}
                  onChange={handleChange}
                  placeholder="Enter mother's name"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Father Occupation</label>
                <input
                  type="text"
                  name="fatherOccupation"
                  value={formData.fatherOccupation}
                  onChange={handleChange}
                  placeholder="e.g., Business, Service, Farmer"
                />
              </div>
              <div className="form-group">
                <label>Mother Occupation</label>
                <input
                  type="text"
                  name="motherOccupation"
                  value={formData.motherOccupation}
                  onChange={handleChange}
                  placeholder="e.g., Homemaker, Service, Business"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Local Guardian Name</label>
                <input
                  type="text"
                  name="guardianLocalName"
                  value={formData.guardianLocalName}
                  onChange={handleChange}
                  placeholder="Guardian name in local language"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <PhoneIcon style={{ fontSize: '16px' }} /> Local Guardian Phone Number *
                </label>
                <input
                  type="tel"
                  name="guardianPhone"
                  value={formData.guardianPhone}
                  onChange={handleChange}
                  placeholder="9876543210"
                  required
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <LocationIcon style={{ fontSize: '16px' }} /> Local Guardian Area
                </label>
                <input
                  type="text"
                  name="guardianLocalArea"
                  value={formData.guardianLocalArea}
                  onChange={handleChange}
                  placeholder="Enter local guardian's area/address"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <PhoneIcon style={{ fontSize: '16px' }} /> Mother Mobile Number
                </label>
                <input
                  type="tel"
                  name="motherMobileNumber"
                  value={formData.motherMobileNumber}
                  onChange={handleChange}
                  placeholder="9876543210"
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <PhoneIcon style={{ fontSize: '16px' }} /> Father Mobile Number
                </label>
                <input
                  type="tel"
                  name="fatherMobileNumber"
                  value={formData.fatherMobileNumber}
                  onChange={handleChange}
                  placeholder="9876543210"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <EmailIcon style={{ fontSize: '16px' }} /> Father Email
                </label>
                <input
                  type="email"
                  name="guardianEmail"
                  value={formData.guardianEmail}
                  onChange={handleChange}
                  placeholder="father@example.com"
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <EmailIcon style={{ fontSize: '16px' }} /> Mother Email
                </label>
                <input
                  type="email"
                  name="motherEmail"
                  value={formData.motherEmail}
                  onChange={handleChange}
                  placeholder="mother@example.com"
                />
              </div>
            </div>
          </div>

          {/* Admission Details - Moved before Room Selection */}
          <div style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '2px solid #e0e0e0' }}>
            <h3 style={{ color: '#667eea', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CalendarIcon style={{ fontSize: '20px' }} /> Admission Details
            </h3>
            
            <div className="form-row">
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <CalendarIcon style={{ fontSize: '16px' }} /> Admission Date *
                </label>
                <input
                  type="date"
                  name="admissionDate"
                  value={formData.admissionDate}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <CalendarIcon style={{ fontSize: '16px' }} /> Package Duration *
                </label>
                <select
                  name="admissionMonths"
                  value={formData.admissionMonths}
                  onChange={handleChange}
                  required
                >
                  {PACKAGE_MONTH_OPTIONS.map((months) => (
                    <option key={months} value={months}>
                      {months} Month{months > 1 ? 's' : ''} Package
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <CalendarIcon style={{ fontSize: '16px' }} /> Admission Up To Date
                </label>
                <input
                  type="date"
                  name="admissionUpToDate"
                  value={formData.admissionUpToDate}
                  onChange={handleChange}
                  readOnly
                  style={{ backgroundColor: '#f3f4f6' }}
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <input
                    type="checkbox"
                    name="payAdvance"
                    checked={formData.payAdvance}
                    onChange={handleChange}
                    style={{
                      width: '20px',
                      height: '20px',
                      cursor: 'pointer',
                      accentColor: '#667eea'
                    }}
                  />
                  <span style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <AccountBalanceIcon style={{ fontSize: '16px' }} /> Pay Advance Amount (₹10,000)
                  </span>
                </label>
                {formData.payAdvance && (
                  <input
                    type="number"
                    name="advanceAmount"
                    value={formData.advanceAmount}
                    onChange={handleChange}
                    placeholder="10000"
                    min="0"
                    style={{ marginTop: '8px' }}
                  />
                )}
                {!formData.payAdvance && (
                  <p style={{ color: '#666', fontSize: '12px', marginTop: '8px', fontStyle: 'italic' }}>
                    Advance payment is optional
                  </p>
                )}
              </div>

            </div>

            <div style={{ 
              padding: '15px', 
              background: '#fff3cd', 
              border: '1px solid #ffc107', 
              borderRadius: '4px',
              marginTop: '15px'
            }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#856404' }}>
                <strong>Note:</strong> Fees will be calculated for the full month (1-30 days) regardless of admission date. 
                If you join on 10th or 15th, you will still be charged for the complete month (1-30).
              </p>
            </div>
          </div>

          {/* Room Selection & Admission Details */}
          <div style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '2px solid #e0e0e0' }}>
            <h3 style={{ color: '#10b981', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <HomeIcon style={{ fontSize: '20px' }} /> Room Selection & Admission
            </h3>
            
            {/* Room Selection - Styled Cards */}
            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', marginBottom: '15px', fontWeight: '600', color: '#333', fontSize: '14px' }}>
                Select Preferred Room Type * <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div className="room-selection-grid" style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '15px',
                marginBottom: '10px'
              }}>
                {[
                  { value: '2-sharing-ac', label: '2 Sharing AC', icon: <AcUnitIcon style={{ fontSize: '32px' }} />, color: '#667eea' },
                  { value: '4-sharing', label: '4 Sharing', icon: <PeopleIcon style={{ fontSize: '32px' }} />, color: '#10b981' },
                  { value: 'single-sharing', label: 'Single Sharing', icon: <HomeIcon style={{ fontSize: '32px' }} />, color: '#f59e0b' },
                  { value: '2-sharing-non-ac', label: '2 Sharing Non-AC', icon: <AirIcon style={{ fontSize: '32px' }} />, color: '#ef4444' }
                ].map((room) => (
                  <div
                    key={room.value}
                    onClick={() => setFormData({ ...formData, preferredRoomType: room.value })}
                    style={{
                      padding: '20px',
                      border: formData.preferredRoomType === room.value 
                        ? `3px solid ${room.color}` 
                        : '2px solid #e0e0e0',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: formData.preferredRoomType === room.value 
                        ? `linear-gradient(135deg, ${room.color}15 0%, ${room.color}08 100%)`
                        : '#fff',
                      transition: 'all 0.3s ease',
                      textAlign: 'center',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      if (formData.preferredRoomType !== room.value) {
                        e.currentTarget.style.border = `2px solid ${room.color}`;
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = `0 4px 12px ${room.color}30`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (formData.preferredRoomType !== room.value) {
                        e.currentTarget.style.border = '2px solid #e0e0e0';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }
                    }}
                  >
                    {formData.preferredRoomType === room.value && (
                      <div style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: room.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}>
                        <CheckCircleIcon style={{ fontSize: '20px', color: '#fff' }} />
                      </div>
                    )}
                    <div style={{ fontSize: '32px', marginBottom: '10px', color: room.color, display: 'flex', justifyContent: 'center' }}>
                      {room.icon}
                    </div>
                    <div style={{ 
                      fontWeight: '700', 
                      color: formData.preferredRoomType === room.value ? room.color : '#333',
                      fontSize: '16px',
                      marginBottom: '5px'
                    }}>
                      {room.label}
                    </div>
                    <input
                      type="radio"
                      name="preferredRoomType"
                      value={room.value}
                      checked={formData.preferredRoomType === room.value}
                      onChange={handleChange}
                      required
                      style={{ display: 'none' }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Fee Breakdown - Moved here for better visibility */}
            {formData.preferredRoomType && formData.admissionMonths && (
              <div style={{
                marginBottom: '30px',
                padding: '24px',
                borderRadius: '16px',
                border: '3px solid rgba(16,185,129,0.5)',
                background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(59,130,246,0.12) 100%)',
                boxShadow: '0 8px 24px rgba(16,185,129,0.15)',
                animation: 'fadeIn 0.3s ease-in'
              }}>
                <h3 style={{ 
                  margin: '0 0 16px', 
                  color: '#0f766e', 
                  fontSize: '20px', 
                  fontWeight: '700', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  borderBottom: '2px solid rgba(15,118,110,0.2)',
                  paddingBottom: '12px'
                }}>
                  <AccountBalanceIcon style={{ fontSize: '24px' }} />
                  Fee Breakdown - {breakdown.packageLabel}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <p style={{ margin: '0', fontSize: '13px', color: '#6b7280', fontWeight: '600' }}>Room Rent</p>
                    <p style={{ margin: '6px 0 0', fontWeight: '700', color: '#111827', fontSize: '18px' }}>
                      ₹{breakdown.rentTotal.toLocaleString()}
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#9ca3af' }}>
                      ₹{breakdown.rentPerMonth.toLocaleString()}/month × {breakdown.monthsSelected} month{breakdown.monthsSelected > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div style={{ background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <p style={{ margin: '0', fontSize: '13px', color: '#6b7280', fontWeight: '600' }}>Mess Charges</p>
                    <p style={{ margin: '6px 0 0', fontWeight: '700', color: '#b45309', fontSize: '18px' }}>
                      ₹{breakdown.messTotal.toLocaleString()}
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#9ca3af' }}>
                      ₹{breakdown.messPerMonth.toLocaleString()}/month × {breakdown.monthsSelected} month{breakdown.monthsSelected > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div style={{ background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <p style={{ margin: '0', fontSize: '13px', color: '#6b7280', fontWeight: '600' }}>Security Deposit</p>
                    <p style={{ margin: '6px 0 0', fontWeight: '700', color: '#1d4ed8', fontSize: '18px' }}>
                      ₹{breakdown.deposit.toLocaleString()}
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#9ca3af' }}>
                      {breakdown.deposit > 0 ? 'Advance Payment' : 'Optional'}
                    </p>
                  </div>
                </div>
                <div style={{
                  marginTop: '16px',
                  paddingTop: '16px',
                  borderTop: '2px dashed rgba(15,118,110,0.3)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '16px',
                  marginBottom: '16px'
                }}>
                  <div style={{ 
                    background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', 
                    borderRadius: '12px', 
                    padding: '16px', 
                    border: '2px solid rgba(5,150,105,0.3)',
                    boxShadow: '0 4px 12px rgba(5,150,105,0.1)'
                  }}>
                    <p style={{ margin: '0', fontSize: '13px', color: '#047857', fontWeight: '700', marginBottom: '8px' }}>
                      💳 Youstel Account
                    </p>
                    <p style={{ margin: '0', fontSize: '11px', color: '#065f46', marginBottom: '4px' }}>
                      (Rent + Deposit)
                    </p>
                    <p style={{ margin: '8px 0 0', fontSize: '22px', fontWeight: '800', color: '#065f46' }}>
                      ₹{breakdown.youstelAmount.toLocaleString()}
                    </p>
                  </div>
                  <div style={{ 
                    background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', 
                    borderRadius: '12px', 
                    padding: '16px', 
                    border: '2px solid rgba(217,119,6,0.3)',
                    boxShadow: '0 4px 12px rgba(217,119,6,0.1)'
                  }}>
                    <p style={{ margin: '0', fontSize: '13px', color: '#b45309', fontWeight: '700', marginBottom: '8px' }}>
                      🍽️ HUF Account
                    </p>
                    <p style={{ margin: '0', fontSize: '11px', color: '#92400e', marginBottom: '4px' }}>
                      (Mess Charges)
                    </p>
                    <p style={{ margin: '8px 0 0', fontSize: '22px', fontWeight: '800', color: '#92400e' }}>
                      ₹{breakdown.hufAmount.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div style={{ 
                  marginTop: '16px', 
                  padding: '16px', 
                  background: 'linear-gradient(135deg, #0f766e 0%, #059669 100%)',
                  borderRadius: '12px',
                  border: '3px solid rgba(16,185,129,0.5)',
                  boxShadow: '0 6px 20px rgba(15,118,110,0.3)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <p style={{ margin: 0, fontSize: '13px', color: '#d1fae5', fontWeight: '600', marginBottom: '4px' }}>
                        Total Estimated Payment
                      </p>
                      <p style={{ margin: 0, fontSize: '28px', fontWeight: '900', color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                        ₹{breakdown.total.toLocaleString()}
                      </p>
                    </div>
                    <p style={{ margin: 0, fontSize: '11px', color: '#a7f3d0', fontStyle: 'italic', textAlign: 'right' }}>
                      *Final fees confirmed by admin<br/>during approval process
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Hostel Bank Account Information - Read Only - After Fee Breakdown */}
            <div style={{
              marginTop: '20px',
              padding: '15px',
              background: '#dcfce7',
              border: '2px solid #16a34a',
              borderRadius: '8px'
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AccountBalanceIcon /> Youstel Hostel Bank Account
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666', fontWeight: '600' }}>Bank Name</p>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>ICICI Bank</p>
                </div>
                <div>
                  <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666', fontWeight: '600' }}>Branch</p>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>Sadashiv Peth, Pune</p>
                </div>
                <div>
                  <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666', fontWeight: '600' }}>Account Number</p>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: '500', fontFamily: 'monospace' }}>645105003523</p>
                </div>
                <div>
                  <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#666', fontWeight: '600' }}>IFSC Code</p>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: '500', fontFamily: 'monospace' }}>ICIC0006451</p>
                </div>
              </div>

              {/* QR Code Section */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px', padding: '15px', background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#666', fontWeight: '600' }}>Scan to Pay</p>
                  <img 
                    src="/youstel-qr.png" 
                    alt="Youstel UPI QR Code" 
                    style={{ width: '140px', height: '140px', border: '2px solid #16a34a', borderRadius: '8px', padding: '4px', background: '#fff' }}
                  />
                  <p style={{ margin: '8px 0 0 0', fontSize: '10px', color: '#666' }}>ICICI Bank UPI</p>
                </div>
              </div>

              <p style={{ fontSize: '12px', color: '#666', marginTop: '0', fontStyle: 'italic', padding: '10px', background: '#f0fdf4', borderRadius: '4px' }}>
                📌 Use this account for all hostel fee payments
              </p>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-block"
            disabled={loading || submitted || isSubmittingRef.current}
            onClick={(e) => {
              console.log('🔘 Submit button clicked', {
                loading,
                submitted,
                isSubmittingRef: isSubmittingRef.current,
                disabled: loading || submitted || isSubmittingRef.current
              });
              // Don't prevent default - let form handle it
            }}
          >
            {loading ? (
              <span className="btn-loading">
                <span className="spinner"></span>
                Submitting...
              </span>
            ) : (
              <span>Submit Registration <span className="arrow">→</span></span>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p style={{ fontSize: '12px', color: '#999' }}>
            * Required fields. Your registration will be reviewed by the admin before approval.
          </p>
        </div>
      </div>
      
      <div className="developer-footer">
        <p>Developed by <a href="https://xtendonline.com" target="_blank" rel="noopener noreferrer">Xtendonline</a></p>
      </div>
    </div>
    </>
  );
};

export default StudentRegistration;

