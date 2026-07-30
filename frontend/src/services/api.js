import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getPendingReviews = async () => {
  const response = await api.get('/reviews/pending');
  return response.data;
};

export const getAllClients = async () => {
  try {
    const response = await api.get('/onboarding/clients');
    return response.data;
  } catch (err) {
    console.error('Error fetching all clients:', err);
    return [];
  }
};

export const updateClientStatus = async (clientId, status) => {
  const response = await api.post(`/onboarding/clients/${clientId}/status`, { status });
  return response.data;
};

export const updateClientPhone = async (clientId, phoneNumber) => {
  const response = await api.post(`/onboarding/clients/${clientId}/phone`, { phone_number: phoneNumber });
  return response.data;
};

export const approveReview = async (reviewId, customReply = null) => {
  const response = await api.post(`/reviews/${reviewId}/approve`, { custom_reply: customReply });
  return response.data;
};

export const rejectReview = async (reviewId) => {
  const response = await api.post(`/reviews/${reviewId}/reject`);
  return response.data;
};

export const getSessions = async () => {
  const response = await api.get('/sessions');
  return response.data;
};

export const getSessionMessages = async (sessionId) => {
  const response = await api.get(`/sessions/${sessionId}/messages`);
  return response.data;
};

export const sendManualReply = async (sessionId, content) => {
  const response = await api.post(`/sessions/${sessionId}/reply`, {
    sender: 'manager',
    content: content,
  });
  return response.data;
};

export const getBookings = async () => {
  const response = await api.get('/bookings');
  return response.data;
};

export const updateBookingStatus = async (bookingId, status) => {
  const response = await api.post(`/bookings/${bookingId}/status?status=${status}`);
  return response.data;
};

export const getSettings = async () => {
  const response = await api.get('/settings');
  return response.data;
};

export const updateSettings = async (settingsData) => {
  const response = await api.put('/settings', settingsData);
  return response.data;
};

export const getReplyPatterns = async () => {
  const response = await api.get('/reply-library');
  return response.data;
};

export const createReplyPattern = async (payload) => {
  const response = await api.post('/reply-library', payload);
  return response.data;
};

export const deleteReplyPattern = async (patternId) => {
  const response = await api.delete(`/reply-library/${patternId}`);
  return response.data;
};

export const sendSimulatorMessage = async (payload) => {
  const response = await api.post('/webhooks/simulator', payload);
  return response.data;
};

// ─── Onboarding & Phone Number APIs ───

export const getOnboardingStatus = async () => {
  const response = await api.get('/onboarding/status');
  return response.data;
};

export const registerBusiness = async (data) => {
  const response = await api.post('/onboarding/register', data);
  return response.data;
};

export const getWeeklyCharge = async () => {
  const response = await api.get('/onboarding/weekly-charge');
  return response.data;
};

export const completeOnboarding = async (data) => {
  const response = await api.post('/onboarding/complete', data);
  return response.data;
};

export const processCheckout = async (paymentData) => {
  const response = await api.post('/payments/checkout', paymentData);
  return response.data;
};

export const createStripeCheckoutSession = async (paymentData) => {
  const response = await api.post('/payments/create-checkout-session', paymentData);
  return response.data;
};

export const searchPhoneNumbers = async (country = 'GB', areaCode = null, contains = null) => {
  const params = new URLSearchParams({ country });
  if (areaCode) params.append('area_code', areaCode);
  if (contains) params.append('contains', contains);
  const response = await api.get(`/phone-numbers/search?${params.toString()}`);
  return response.data;
};

export const updateWeeklyCharge = async (chargeAmount) => {
  const response = await api.post('/onboarding/weekly-charge', { weekly_charge: chargeAmount });
  return response.data;
};

export const purchasePhoneNumber = async (phoneNumber, countryCode = 'GB') => {
  const response = await api.post('/phone-numbers/purchase', {
    phone_number: phoneNumber,
    country_code: countryCode,
  });
  return response.data;
};

export const uploadVideo = async (file, onProgress = null) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post('/api/uploads/video', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
  });
  return response.data;
};

export default api;
