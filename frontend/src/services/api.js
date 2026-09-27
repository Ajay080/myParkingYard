// API utility functions
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Helper function to make API calls
const makeApiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const finalOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, finalOptions);
    
    // Handle empty responses (204 No Content)
    if (response.status === 204) {
      return {
        success: true,
        status: response.status,
        data: null,
        response
      };
    }
    
    const data = await response.json();
    
    return {
      success: response.ok,
      status: response.status,
      data,
      response
    };
  } catch (error) {
    return {
      success: false,
      status: 0,
      data: { detail: 'Network error. Please try again.' },
      error
    };
  }
};

// Pricing API calls
export const pricingAPI = {
  // Calculate dynamic pricing
  calculatePrice: async (token, pricingData) => {
    const params = new URLSearchParams(pricingData).toString();
    return makeApiCall(`/api/pricing/calculate?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // Get pricing history for analytics
  getPricingHistory: async (token, zoneId) => {
    return makeApiCall(`/api/pricing/history/${zoneId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // Get peak hours data
  getPeakHours: async (token, zoneId) => {
    return makeApiCall(`/api/pricing/peak-hours/${zoneId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },
};

// Authentication API calls
export const authAPI = {
  // Login user
  login: async (email, password) => {
    const loginResponse = await makeApiCall('/api/users/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    // If login successful, fetch user data
    if (loginResponse.success && loginResponse.data?.access_token) {
      const token = loginResponse.data.access_token;
      
      // Fetch user info
      const userResponse = await makeApiCall('/api/users/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (userResponse.success) {
        return {
          success: true,
          status: loginResponse.status,
          data: {
            token: token,
            user: {
              id: userResponse.data.id,
              name: userResponse.data.name,
              email: userResponse.data.email,
              phone: userResponse.data.phone,
              role: userResponse.data.role
            }
          }
        };
      }
    }
    
    return loginResponse;
  },

  // Register user
  register: async (userData) => {
    return makeApiCall('/api/users/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },
  
  // Get current user info
  getMe: async (token) => {
    return makeApiCall('/api/users/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },
};

// Users API calls
export const usersAPI = {
  // Get all users
  getUsers: async (token, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/api/users${queryString ? `?${queryString}` : ''}`;
    
    return makeApiCall(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // Get user by ID
  getUser: async (token, userId) => {
    return makeApiCall(`/api/users/${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // Get current user profile
  getMyProfile: async (token) => {
    return makeApiCall('/api/users/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // Update user
  updateUser: async (token, userId, userData) => {
    return makeApiCall(`/api/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(userData),
    });
  },

  // Change password
  changePassword: async (token, passwordData) => {
    return makeApiCall('/api/users/me/password', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(passwordData),
    });
  },

  // Delete user
  deleteUser: async (token, userId) => {
    return makeApiCall(`/api/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // Update my profile (current user)
  updateMyProfile: async (token, profileData) => {
    return makeApiCall('/api/users/me/profile', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(profileData),
    });
  },

  // Change my password (current user)
  changeMyPassword: async (token, passwordData) => {
    return makeApiCall('/api/users/me/password', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(passwordData),
    });
  },

  // Change my password (current user)
  changeMyPassword: async (token, passwordData) => {
    return makeApiCall('/api/users/me/password', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(passwordData),
    });
  },
};

// Zones API calls
export const zonesAPI = {
  // Get all zones
  getZones: async (token) => {
    return makeApiCall('/api/zones', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // Get zone by ID
  getZone: async (token, zoneId) => {
    return makeApiCall(`/api/zones/${zoneId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },
};

// Spots API calls
export const spotsAPI = {
  // Get all spots
  getSpots: async (token, params = {}) => {
    // Filter out undefined values
    const filteredParams = Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null) {
        acc[key] = value;
      }
      return acc;
    }, {});
    const queryString = new URLSearchParams(filteredParams).toString();
    const endpoint = `/api/spots${queryString ? `?${queryString}` : ''}`;
    
    return makeApiCall(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // Get spot by ID
  getSpot: async (token, spotId) => {
    return makeApiCall(`/api/spots/${spotId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // Get spot statistics
  getSpotStats: async (token) => {
    return makeApiCall('/api/analytics/spots/stats', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },
};

// Analytics API calls
export const analyticsAPI = {
  // Get dashboard summary
  getDashboardSummary: async (token) => {
    return makeApiCall('/api/analytics/dashboard/summary', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },
  
  // Get bookings report
  getBookingsReport: async (token, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/api/analytics/bookings/report${queryString ? `?${queryString}` : ''}`;
    
    return makeApiCall(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },
  
  // Get spot stats
  getSpotStats: async (token, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/api/analytics/spots/stats${queryString ? `?${queryString}` : ''}`;
    
    return makeApiCall(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },
};

// Bookings API calls
export const bookingsAPI = {
  // Get all bookings
  getBookings: async (token, params = {}) => {
    // Filter out undefined values
    const filteredParams = Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null) {
        acc[key] = value;
      }
      return acc;
    }, {});
    const queryString = new URLSearchParams(filteredParams).toString();
    const endpoint = `/api/bookings${queryString ? `?${queryString}` : ''}`;
    
    return makeApiCall(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // Get booking by ID
  getBooking: async (token, bookingId) => {
    return makeApiCall(`/api/bookings/${bookingId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // Create new booking
  createBooking: async (token, bookingData) => {
    return makeApiCall('/api/bookings/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(bookingData),
    });
  },

  // Update booking
  updateBooking: async (token, bookingId, bookingData) => {
    return makeApiCall(`/api/bookings/${bookingId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(bookingData),
    });
  },

  // Update booking status
  updateBookingStatus: async (token, bookingId, status) => {
    // Use PUT instead of PATCH as FastAPI backend uses PUT for updates
    return makeApiCall(`/api/bookings/${bookingId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ booking_status: status }),
    });
  },

  // Get booking report summary
  getReportSummary: async (token, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/api/analytics/bookings/report${queryString ? `?${queryString}` : ''}`;
    
    return makeApiCall(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },
};

// Vehicles API calls
export const vehiclesAPI = {
  // Get user vehicles
  getUserVehicles: async (token, userId) => {
    return makeApiCall(`/api/vehicles?user_id=${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // Add vehicle (alias for createVehicle)
  addVehicle: async (token, vehicleData) => {
    return makeApiCall('/api/vehicles', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(vehicleData),
    });
  },

  // Create vehicle
  createVehicle: async (token, vehicleData) => {
    return makeApiCall('/api/vehicles', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(vehicleData),
    });
  },

  // Update vehicle
  updateVehicle: async (token, vehicleId, vehicleData) => {
    return makeApiCall(`/api/vehicles/${vehicleId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(vehicleData),
    });
  },

  // Delete vehicle
  deleteVehicle: async (token, vehicleId) => {
    return makeApiCall(`/api/vehicles/${vehicleId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },
};

// Devices API calls
export const devicesAPI = {
  // Get all devices
  getDevices: async (token) => {
    return makeApiCall('/api/devices', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // Get device by ID
  getDevice: async (token, deviceId) => {
    return makeApiCall(`/api/devices/${deviceId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // Create device
  createDevice: async (token, deviceData) => {
    return makeApiCall('/api/devices', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(deviceData),
    });
  },

  // Update device
  updateDevice: async (token, deviceId, deviceData) => {
    return makeApiCall(`/api/devices/${deviceId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(deviceData),
    });
  },

  // Delete device
  deleteDevice: async (token, deviceId) => {
    return makeApiCall(`/api/devices/${deviceId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // Update device stream URLs
  updateDeviceStreamUrls: async (token, urlData) => {
    return makeApiCall('/api/devices/update-demo-urls', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(urlData),
    });
  },
};

// Payments API calls
export const paymentsAPI = {
  // Get all payments
  getPayments: async (token) => {
    return makeApiCall('/api/payments', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // Get payment by ID
  getPayment: async (token, paymentId) => {
    return makeApiCall(`/api/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // Create payment
  createPayment: async (token, paymentData) => {
    return makeApiCall('/api/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(paymentData),
    });
  },

  // Update payment
  updatePayment: async (token, paymentId, paymentData) => {
    return makeApiCall(`/api/payments/${paymentId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(paymentData),
    });
  },

  // Delete payment
  deletePayment: async (token, paymentId) => {
    return makeApiCall(`/api/payments/${paymentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },
};

// Generic API call function for custom endpoints
export const apiCall = makeApiCall;

export default {
  pricingAPI,
  authAPI,
  usersAPI,
  zonesAPI,
  spotsAPI,
  bookingsAPI,
  vehiclesAPI,
  devicesAPI,
  paymentsAPI,
  analyticsAPI,
  apiCall,
};
