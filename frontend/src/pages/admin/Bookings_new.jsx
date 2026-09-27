import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "../../styles/datepicker-custom.css";

// API imports
import { bookingsAPI, zonesAPI, spotsAPI, usersAPI, pricingAPI, vehiclesAPI } from '../../services/api';

// UI Components
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';

// Zone Visualization Component
import ZoneVisualization from '../../components/item/ZoneVisualization';

// Icons
import { 
  PlusIcon, 
  SearchIcon, 
  FilterIcon, 
  EyeIcon, 
  EditIcon, 
  MoreHorizontalIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  AlertCircleIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SaveIcon,
  XIcon
} from 'lucide-react';

export default function AdminBookingManagement() {
  const { user, token } = useAuth();
  
  // State management
  const [bookings, setBookings] = useState([]);
  const [zones, setZones] = useState([]);
  const [spots, setSpots] = useState([]);
  const [users, setUsers] = useState([]);
  const [userVehicles, setUserVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Filter and search state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState({ key: 'start_time', direction: 'desc' });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalBookings, setTotalBookings] = useState(0);
  const itemsPerPage = 10;
  
  // Dialog states
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  
  // Zone visualization states
  const [selectedZone, setSelectedZone] = useState(null);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [spotAvailability, setSpotAvailability] = useState({});
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  
  // Form state
  const [bookingForm, setBookingForm] = useState({
    userId: "",
    numberPlate: "",
    zoneId: "",
    spotId: "",
    startTime: null,
    endTime: null,
    status: "Pending"
  });

  // Utility function to check if two time intervals overlap
  const checkTimeOverlap = (start1, end1, start2, end2) => {
    const startTime1 = new Date(start1);
    const endTime1 = new Date(end1);
    const startTime2 = new Date(start2);
    const endTime2 = new Date(end2);
    
    // Two time ranges overlap if: start1 < end2 && start2 < end1
    const hasOverlap = startTime1 < endTime2 && startTime2 < endTime1;
    
    console.log(`Time overlap check:
      Range 1: ${startTime1.toLocaleString()} - ${endTime1.toLocaleString()}
      Range 2: ${startTime2.toLocaleString()} - ${endTime2.toLocaleString()}
      Overlap: ${hasOverlap ? 'YES' : 'NO'}`);
    
    return hasOverlap;
  };

  // Utility function to format booking status for comparison
  const normalizeBookingStatus = (status) => {
    return status ? status.toLowerCase() : '';
  };

  // Utility function to validate booking times
  const validateBookingTimes = (startTime, endTime) => {
    const now = new Date();
    const startDateTime = new Date(startTime);
    const endDateTime = new Date(endTime);

    // Check if start time is in the future (with 5 minute buffer)
    const minimumStartTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now
    if (startDateTime < minimumStartTime) {
      return {
        valid: false,
        message: `Start time must be at least 5 minutes in the future. Current time: ${now.toLocaleString()}`
      };
    }

    // Check if end time is after start time
    if (endDateTime <= startDateTime) {
      return {
        valid: false,
        message: "End time must be after start time"
      };
    }

    // Check if booking duration is reasonable (not more than 24 hours)
    const durationHours = (endDateTime - startDateTime) / (1000 * 60 * 60);
    if (durationHours > 24) {
      return {
        valid: false,
        message: "Booking duration cannot exceed 24 hours"
      };
    }

    // Check if booking duration is at least 30 minutes
    const durationMinutes = (endDateTime - startDateTime) / (1000 * 60);
    if (durationMinutes < 30) {
      return {
        valid: false,
        message: "Booking duration must be at least 30 minutes"
      };
    }

    return { valid: true };
  };

  // Cost calculation state
  const [pricingData, setPricingData] = useState(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [calculatedCost, setCalculatedCost] = useState(0);

  // Statistics state
  const [stats, setStats] = useState({
    total: 0,
    confirmed: 0,
    pending: 0,
    cancelled: 0,
    completed: 0
  });

  useEffect(() => {
    if (token) {
      fetchInitialData();
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchBookings();
    }
  }, [token, currentPage, searchTerm, statusFilter, zoneFilter, dateFilter, sortConfig]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [zonesRes, usersRes] = await Promise.all([
        zonesAPI.getZones(token),
        usersAPI.getUsers(token)
      ]);

      if (zonesRes.success) {
        setZones(zonesRes.data?.data || zonesRes.data || []);
      }

      if (usersRes.success) {
        setUsers(usersRes.data?.data || usersRes.data || []);
      }
    } catch (error) {
      console.error("Error fetching initial data:", error);
      toast.error("Failed to load initial data");
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      const params = {};

      // Helper function to check if a value is valid
      const isValidParam = (value) => {
        return value && 
               value !== "all" && 
               value !== "undefined" && 
               value !== undefined && 
               value !== null && 
               String(value).trim() !== '';
      };

      // Backend only supports zone_id and user_id filtering
      if (isValidParam(zoneFilter)) {
        params.zone_id = zoneFilter;
      }

      console.log('Fetching bookings with params:', params);

      const response = await bookingsAPI.getBookings(token, params);
      
      if (response.success) {
        let bookingsData = response.data?.data || response.data || [];
        bookingsData = Array.isArray(bookingsData) ? bookingsData : [];
        
        // Client-side filtering for status and search
        let filteredBookings = bookingsData;
        
        // Filter by status
        if (isValidParam(statusFilter)) {
          filteredBookings = filteredBookings.filter(b => 
            (b.booking_status || b.status)?.toLowerCase() === statusFilter.toLowerCase()
          );
        }
        
        // Filter by search term (number plate)
        if (isValidParam(searchTerm)) {
          const searchLower = searchTerm.toLowerCase().trim();
          filteredBookings = filteredBookings.filter(b => 
            (b.number_plate || b.numberPlate || '').toLowerCase().includes(searchLower)
          );
        }
        
        // Sort bookings
        if (sortConfig.key) {
          filteredBookings.sort((a, b) => {
            let aValue, bValue;
            
            switch (sortConfig.key) {
              case 'booking_id':
                aValue = (a.id || a._id || '').toString();
                bValue = (b.id || b._id || '').toString();
                break;
              case 'user_name':
                aValue = (a.user_name || '').toLowerCase();
                bValue = (b.user_name || '').toLowerCase();
                break;
              case 'number_plate':
                aValue = (a.number_plate || a.numberPlate || '').toLowerCase();
                bValue = (b.number_plate || b.numberPlate || '').toLowerCase();
                break;
              case 'zone_name':
                aValue = (a.zone_name || '').toLowerCase();
                bValue = (b.zone_name || '').toLowerCase();
                break;
              case 'spot_name':
                aValue = (a.spot_name || '').toLowerCase();
                bValue = (b.spot_name || '').toLowerCase();
                break;
              case 'start_time':
                aValue = new Date(a.start_time || a.startTime);
                bValue = new Date(b.start_time || b.startTime);
                break;
              case 'end_time':
                aValue = new Date(a.end_time || a.endTime);
                bValue = new Date(b.end_time || b.endTime);
                break;
              case 'amount':
                aValue = parseFloat(a.total_amount || a.totalAmount || 0);
                bValue = parseFloat(b.total_amount || b.totalAmount || 0);
                break;
              case 'status':
                aValue = (a.booking_status || a.status || '').toLowerCase();
                bValue = (b.booking_status || b.status || '').toLowerCase();
                break;
              default:
                return 0;
            }
            
            if (aValue < bValue) {
              return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
              return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
          });
        }
        
        // Calculate total before pagination
        setTotalBookings(filteredBookings.length);
        
        // Client-side pagination
        const startIndex = (currentPage - 1) * itemsPerPage;
        const paginatedBookings = filteredBookings.slice(startIndex, startIndex + itemsPerPage);
        
        setBookings(paginatedBookings);
        
        // Calculate statistics from all filtered data (not just current page)
        calculateStats(filteredBookings);
      } else {
        console.error('Failed to fetch bookings:', response);
        toast.error("Failed to fetch bookings");
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast.error("Failed to load bookings");
    }
  };

  const calculateStats = (bookingsData) => {
    const stats = {
      total: bookingsData.length,
      confirmed: bookingsData.filter(b => (b.booking_status || b.status)?.toLowerCase() === 'confirmed').length,
      pending: bookingsData.filter(b => (b.booking_status || b.status)?.toLowerCase() === 'pending').length,
      cancelled: bookingsData.filter(b => (b.booking_status || b.status)?.toLowerCase() === 'cancelled').length,
      completed: bookingsData.filter(b => (b.booking_status || b.status)?.toLowerCase() === 'completed').length
    };
    setStats(stats);
  };

  const fetchSpotsInZone = async (zoneId) => {
    try {
      const response = await spotsAPI.getSpots(token, { zone_id: zoneId });
      if (response.success) {
        const spotsData = response.data?.data || response.data || [];
        setSpots(spotsData);
        
        // If we have time selected, check availability
        if (bookingForm.startTime && bookingForm.endTime) {
          // Pass the booking ID to exclude if we're in edit mode
          const excludeBookingId = editDialogOpen && selectedBooking ? (selectedBooking._id || selectedBooking.id) : null;
          checkMultipleSpotsAvailability(spotsData, bookingForm.startTime, bookingForm.endTime, excludeBookingId);
        }
      }
    } catch (error) {
      console.error("Error fetching spots:", error);
      toast.error("Failed to load spots");
    }
  };

  const checkMultipleSpotsAvailability = async (spotsData, startDateTime, endDateTime, excludeBookingId = null) => {
    setAvailabilityLoading(true);
    
    // Check if we're in edit mode and should exclude the current booking
    const bookingToExclude = excludeBookingId || (editDialogOpen && selectedBooking ? selectedBooking._id || selectedBooking.id : null);
    
    console.log(`🔍 Starting availability check for ${spotsData.length} spots`);
    console.log(`📅 Requested time slot: ${new Date(startDateTime).toLocaleString()} - ${new Date(endDateTime).toLocaleString()}`);
    if (bookingToExclude) {
      console.log(`🚫 Excluding booking ID: ${bookingToExclude} from conflict check (edit mode)`);
    }
    
    try {
      const availabilityChecks = spotsData.map(async (spot) => {
        console.log(`\n🅿️ Checking spot: ${spot.name || spot.number} (ID: ${spot.id})`);
        
        // Get all bookings for this spot
        const response = await bookingsAPI.getBookings(token, {
          spot_id: spot.id
        });

        if (response.success) {
          const allBookings = response.data?.data || response.data || [];
          console.log(`📋 Found ${allBookings.length} total bookings for spot ${spot.name || spot.number}`);
          
          // Filter CONFIRMED bookings only - pending bookings should not block availability
          let activeBookings = allBookings.filter(booking => {
            const status = booking.booking_status || booking.status || '';
            const normalizedStatus = normalizeBookingStatus(status);
            console.log(`  📌 Booking ${booking.id}: booking_status="${booking.booking_status}", status="${booking.status}" → Normalized="${normalizedStatus}"`);
            return normalizedStatus === 'confirmed';
          });
          
          // If we're editing a booking, exclude it from the conflict check
          if (bookingToExclude) {
            const beforeCount = activeBookings.length;
            activeBookings = activeBookings.filter(booking => {
              const bookingId = booking._id || booking.id;
              const shouldExclude = bookingId === bookingToExclude;
              if (shouldExclude) {
                console.log(`🚫 Excluding booking ${bookingId} from conflict check`);
              }
              return !shouldExclude;
            });
            console.log(`📝 Excluded ${beforeCount - activeBookings.length} booking(s) from conflict check`);
          }
          
          console.log(`✅ ${activeBookings.length} confirmed bookings to check for conflicts`);
          
          // Then check for time conflicts with active bookings
          const conflictingBookings = activeBookings.filter(booking => {
            const bookingStartTime = booking.start_time || booking.startTime;
            const bookingEndTime = booking.end_time || booking.endTime;
            
            const hasConflict = checkTimeOverlap(
              startDateTime, endDateTime, 
              bookingStartTime, bookingEndTime
            );
            
            if (hasConflict) {
              console.log(`❌ CONFLICT found with booking ${booking.id || booking._id} (${booking.booking_status || booking.status})`);
            }
            
            return hasConflict;
          });
          
          const isAvailable = conflictingBookings.length === 0;
          
          console.log(`🏁 Spot ${spot.name || spot.number}: ${isAvailable ? 'AVAILABLE' : 'NOT AVAILABLE'} (${conflictingBookings.length} active booking conflicts)`);
          
          // Map conflicting bookings to include time details
          const conflicts = conflictingBookings.map(booking => ({
            id: booking.id || booking._id,
            startTime: new Date(booking.start_time || booking.startTime),
            endTime: new Date(booking.end_time || booking.endTime),
            status: booking.booking_status || booking.status,
            userName: booking.user_name || booking.userName,
            numberPlate: booking.number_plate || booking.numberPlate
          }));
          
          return {
            spotId: spot.id,
            isAvailable,
            conflicts: conflicts,
            conflictCount: conflictingBookings.length,
            totalBookings: allBookings.length,
            activeBookings: activeBookings.length,
            excludedBookings: bookingToExclude ? allBookings.filter(b => (b._id || b.id) === bookingToExclude).length : 0,
            conflictingBookings: conflictingBookings.map(b => ({
              id: b.id || b._id,
              startTime: b.startTime,
              endTime: b.endTime,
              status: b.status
            }))
          };
        } else {
          console.log(`⚠️ Failed to fetch bookings for spot ${spot.name || spot.number}`);
        }
        
        return {
          spotId: spot.id,
          isAvailable: true,
          conflictCount: 0,
          totalBookings: 0,
          confirmedBookings: 0,
          excludedBookings: 0,
          conflictingBookings: []
        };
      });

      const results = await Promise.all(availabilityChecks);
      
      const availabilityMap = {};
      results.forEach(result => {
        availabilityMap[result.spotId] = {
          isAvailable: result.isAvailable,
          conflictCount: result.conflictCount,
          totalBookings: result.totalBookings,
          confirmedBookings: result.confirmedBookings,
          excludedBookings: result.excludedBookings,
          conflictingBookings: result.conflictingBookings
        };
      });
      
      setSpotAvailability(availabilityMap);
      
      // Log summary of availability check
      const availableSpots = results.filter(r => r.isAvailable).length;
      const totalSpots = results.length;
      const totalConflicts = results.reduce((sum, r) => sum + r.conflictCount, 0);
      const totalExcluded = results.reduce((sum, r) => sum + r.excludedBookings, 0);
      
      console.log(`\n📊 AVAILABILITY SUMMARY:`);
      console.log(`✅ Available spots: ${availableSpots}/${totalSpots}`);
      console.log(`❌ Total confirmed conflicts: ${totalConflicts}`);
      console.log(`🚫 Total excluded bookings: ${totalExcluded}`);
      console.log(`📅 Time slot: ${new Date(startDateTime).toLocaleString()} - ${new Date(endDateTime).toLocaleString()}`);
      
    } catch (error) {
      console.error("❌ Error checking multiple spots availability:", error);
      toast.error("Failed to check spot availability");
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const handleZoneChange = (zoneId) => {
    setBookingForm(prev => ({ ...prev, zoneId, spotId: "" }));
    setSelectedSpot(null);
    setSpotAvailability({});
    
    if (zoneId) {
      const zone = zones.find(z => z.id === zoneId);
      setSelectedZone(zone);
      fetchSpotsInZone(zoneId);
      
      // Recalculate cost when zone changes
      if (bookingForm.startTime && bookingForm.endTime) {
        calculateBookingCost(zoneId);
      }
    } else {
      setSpots([]);
      setSelectedZone(null);
      setCalculatedCost(0);
      setPricingData(null);
    }
  };

  const handleSpotSelect = (spot) => {
    // Check if time is selected
    if (!bookingForm.startTime || !bookingForm.endTime) {
      toast.error("Please select booking time first");
      return;
    }

    // Check if spot is available
    const availability = spotAvailability[spot.id];
    if (availability && !availability.isAvailable) {
      toast.error("This spot is not available for the selected time");
      return;
    }

    setSelectedSpot(spot);
    setBookingForm(prev => ({ ...prev, spotId: spot.id }));
    toast.success(`Selected spot: ${spot.name}`);
  };

  // Function to check spot availability for a specific booking (used during status updates)
  const checkSpotAvailabilityForBooking = async (spotId, startDateTime, endDateTime, excludeBookingId = null) => {
    if (!spotId || !startDateTime || !endDateTime) return { isAvailable: false, message: "Missing required parameters", conflicts: [] };
    
    try {
      // Get all bookings for this spot
      const response = await bookingsAPI.getBookings(token, {
        spot_id: spotId
      });

      if (response.success) {
        const allBookings = response.data?.data || response.data || [];
        
        // Filter CONFIRMED bookings only - pending bookings should not block availability
        let activeBookings = allBookings.filter(booking => {
          const status = booking.booking_status || booking.status || '';
          const normalizedStatus = normalizeBookingStatus(status);
          return normalizedStatus === 'confirmed';
        });
        
        // Exclude the current booking if specified (for edits)
        if (excludeBookingId) {
          activeBookings = activeBookings.filter(booking => {
            const bookingId = booking._id || booking.id;
            return bookingId !== excludeBookingId;
          });
        }
        
        // Check for time conflicts with active bookings
        const conflictingBookings = activeBookings.filter(booking => {
          const bookingStartTime = booking.start_time || booking.startTime;
          const bookingEndTime = booking.end_time || booking.endTime;
          return checkTimeOverlap(
            startDateTime, endDateTime, 
            bookingStartTime, bookingEndTime
          );
        });
        
        const isAvailable = conflictingBookings.length === 0;
        
        // Map conflicts with full details
        const conflicts = conflictingBookings.map(b => ({
          id: b.id || b._id,
          startTime: new Date(b.start_time || b.startTime),
          endTime: new Date(b.end_time || b.endTime),
          status: b.booking_status || b.status,
          userName: b.user_name || b.userName,
          numberPlate: b.number_plate || b.numberPlate
        }));
        
        // Build detailed message with conflict times
        let message = isAvailable ? 
          "Spot is available for the selected time" : 
          `Spot has ${conflictingBookings.length} active booking conflict(s):\n` + 
          conflicts.map(c => 
            `• ${c.startTime.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} - ${c.endTime.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} (${c.status})`
          ).join('\n');
        
        return {
          isAvailable,
          conflictCount: conflictingBookings.length,
          message,
          conflicts
        };
      }
      
      return { isAvailable: false, message: "Failed to fetch booking data", conflicts: [] };
    } catch (error) {
      console.error("Error checking spot availability:", error);
      return { isAvailable: false, message: "Error checking availability", conflicts: [] };
    }
  };

  const handleCreateOrUpdateBooking = async () => {
    const { userId, numberPlate, zoneId, startTime, endTime } = bookingForm;
    
    if (!userId || !numberPlate || !zoneId || !selectedSpot || !startTime || !endTime) {
      toast.error("Please fill all required fields and select a spot");
      return;
    }

    // Validate booking times with enhanced validation
    const timeValidation = validateBookingTimes(startTime, endTime);
    if (!timeValidation.valid) {
      toast.error(timeValidation.message);
      return;
    }

    // Check if selected spot is available
    if (selectedSpot && spotAvailability[selectedSpot.id] && !spotAvailability[selectedSpot.id].isAvailable) {
      toast.error("Selected spot is not available for the chosen time slot");
      return;
    }

    try {
      setActionLoading(true);
      
      // Get the final calculated cost
      const finalCost = pricingData && pricingData.totalCost !== undefined ? 
        pricingData.totalCost : 
        calculateBasicCost().cost;

      // Convert to ISO datetime format for backend
      const startTimeISO = new Date(startTime).toISOString();
      const endTimeISO = new Date(endTime).toISOString();

      const bookingData = {
        user_id: userId,
        number_plate: numberPlate.toUpperCase(),
        zone_id: zoneId,
        spot_id: selectedSpot.id,
        start_time: startTimeISO,
        end_time: endTimeISO,
        amount: finalCost,
        vehicle_id: bookingForm.vehicleId || null // Include vehicle_id if selected
      };

      console.log(editDialogOpen ? 'Updating booking with data:' : 'Creating booking with data:', bookingData);

      let response;
      if (editDialogOpen && selectedBooking) {
        // Update existing booking - only send updateable fields
        const bookingId = selectedBooking.id || selectedBooking._id;
        const updateData = {
          start_time: startTimeISO,
          end_time: endTimeISO,
          amount: finalCost,
          booking_status: bookingForm.status || "Pending"
        };
        console.log('Sending update data:', updateData);
        response = await bookingsAPI.updateBooking(token, bookingId, updateData);
      } else {
        // Create new booking - send all fields
        response = await bookingsAPI.createBooking(token, bookingData);
      }
      
      if (response.success) {
        toast.success(editDialogOpen ? "Booking updated successfully!" : "Booking created successfully!");
        setCreateDialogOpen(false);
        setEditDialogOpen(false);
        resetForm();
        fetchBookings();
      } else {
        // Enhanced error handling for backend validation errors
        console.error('Backend validation error:', response);
        
        // Try to extract the specific error message from different response structures
        let errorMessage = editDialogOpen ? "Failed to update booking" : "Failed to create booking";
        
        if (response.data?.error) {
          // Handle validation errors like "Booking validation failed: startTime: ..."
          errorMessage = response.data.error;
        } else if (response.data?.message) {
          errorMessage = response.data.message;
        } else if (response.error) {
          errorMessage = response.error;
        } else if (response.message) {
          errorMessage = response.message;
        }
        
        // Clean up the error message for better user experience
        if (errorMessage.includes("Booking validation failed:")) {
          errorMessage = errorMessage.replace("Booking validation failed: ", "Validation Error: ");
        }
        
        // Make specific error messages more user-friendly
        if (errorMessage.includes("Start time") && errorMessage.includes("must be in the future")) {
          errorMessage = "Start time must be in the future. Please select a later time.";
        }
        
        if (errorMessage.includes("Spot with ID") && errorMessage.includes("is not available")) {
          errorMessage = "Selected spot is currently not available. Please choose a different spot or time.";
        }
        
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error(editDialogOpen ? "Error updating booking:" : "Error creating booking:", error);
      
      // Enhanced error handling for network/API errors
      let errorMessage = editDialogOpen ? "Failed to update booking" : "Failed to create booking";
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Clean up validation error messages
      if (errorMessage.includes("Booking validation failed:")) {
        errorMessage = errorMessage.replace("Booking validation failed: ", "Validation Error: ");
      }
      
      // Make specific error messages more user-friendly
      if (errorMessage.includes("Start time") && errorMessage.includes("must be in the future")) {
        errorMessage = "Start time must be in the future. Please select a later time.";
      }
      
      if (errorMessage.includes("Spot with ID") && errorMessage.includes("is not available")) {
        errorMessage = "Selected spot is currently not available. Please choose a different spot or time.";
      }
      
      toast.error(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateBookingStatus = async (bookingId, newStatus) => {
    try {
      setActionLoading(true);
      
      // If changing status to "Confirmed", check spot availability first
      if (newStatus.toLowerCase() === 'confirmed') {
        // Find the booking being updated
        const booking = bookings.find(b => b.id === bookingId);
        if (!booking) {
          toast.error("Booking not found");
          return;
        }
        
        // Check if the spot is available for this booking's time slot
        const availabilityCheck = await checkSpotAvailabilityForBooking(
          booking.spot_id || booking.spotId,
          booking.start_time || booking.startTime,
          booking.end_time || booking.endTime,
          bookingId // Exclude this booking from conflict check
        );
        
        if (!availabilityCheck.isAvailable) {
          toast.error(
            `❌ Cannot confirm booking - ${availabilityCheck.message}. Please check the conflicting bookings and resolve them first.`,
            {
              duration: 6000,
              style: {
                background: '#fee2e2',
                color: '#dc2626',
                border: '1px solid #fca5a5'
              }
            }
          );
          return;
        }
        
        // Show success message for availability
        toast.success(
          `✅ Spot is available! Confirming booking...`,
          {
            duration: 3000,
            style: {
              background: '#f0fdf4',
              color: '#16a34a',
              border: '1px solid #86efac'
            }
          }
        );
      }
      
      const response = await bookingsAPI.updateBookingStatus(token, bookingId, newStatus);
      
      if (response.success) {
        toast.success(`Booking status updated to ${newStatus} successfully!`);
        fetchBookings();
      } else {
        toast.error(response.data?.message || "Failed to update booking status");
      }
    } catch (error) {
      console.error("Error updating booking status:", error);
      toast.error("Failed to update booking status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewBooking = (booking) => {
    setSelectedBooking(booking);
    setViewDialogOpen(true);
  };

  const handleEditBooking = (booking) => {
    setSelectedBooking(booking);
    const userId = booking.user_id || booking.userId;
    const zoneId = booking.zone_id || booking.zoneId;
    const spotId = booking.spot_id || booking.spotId;
    const startTime = booking.start_time || booking.startTime;
    const endTime = booking.end_time || booking.endTime;
    const numberPlate = booking.number_plate || booking.numberPlate;
    const status = booking.booking_status || booking.status;
    
    setBookingForm({
      userId: userId || "",
      numberPlate: numberPlate || "",
      zoneId: zoneId || "",
      spotId: spotId || "",
      startTime: startTime ? new Date(startTime) : null,
      endTime: endTime ? new Date(endTime) : null,
      status: status || "Pending"
    });
    
    if (zoneId) {
      fetchSpotsInZone(zoneId);
    }
    
    setEditDialogOpen(true);
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const calculateBasicCost = () => {
    if (!bookingForm.startTime || !bookingForm.endTime) {
      return {
        duration: { totalMinutes: 0, hours: 0, minutes: 0, displayHours: 0 },
        cost: 0,
        costPerMinute: 0
      };
    }

    const startDateTime = new Date(bookingForm.startTime);
    const endDateTime = new Date(bookingForm.endTime);
    
    // Calculate duration in minutes
    const durationMinutes = Math.ceil((endDateTime - startDateTime) / (1000 * 60));
    const durationHours = Math.ceil(durationMinutes / 60);
    
    // Store duration for display
    const duration = {
      totalMinutes: durationMinutes,
      hours: Math.floor(durationMinutes / 60),
      minutes: durationMinutes % 60,
      displayHours: durationHours
    };

    // Calculate cost per minute (₹50/hour = ₹0.833/minute)
    const costPerMinute = 50 / 60; // ₹50 per hour default rate
    const totalCost = durationMinutes * costPerMinute;
    
    return {
      duration,
      cost: totalCost,
      costPerMinute: costPerMinute
    };
  };

  const calculateBookingCost = async (zoneId = null) => {
    if (!bookingForm.startTime || !bookingForm.endTime) {
      setCalculatedCost(0);
      setPricingData(null);
      return {
        duration: { totalMinutes: 0, hours: 0, minutes: 0, displayHours: 0 },
        cost: 0,
        costPerMinute: 0
      };
    }

    const startDateTime = new Date(bookingForm.startTime);
    const endDateTime = new Date(bookingForm.endTime);
    
    // Calculate duration in minutes
    const durationMinutes = Math.ceil((endDateTime - startDateTime) / (1000 * 60));
    const durationHours = Math.ceil(durationMinutes / 60);
    
    // Store duration for display
    const duration = {
      totalMinutes: durationMinutes,
      hours: Math.floor(durationMinutes / 60),
      minutes: durationMinutes % 60,
      displayHours: durationHours
    };

    // If we have a zone selected, get dynamic pricing
    if (zoneId && token) {
      try {
        setPricingLoading(true);
        console.log('Calculating pricing for:', {
          zoneId,
          startTime: bookingForm.startTime,
          endTime: bookingForm.endTime
        });
        
        const response = await pricingAPI.calculatePrice(token, {
          zone_id: zoneId,
          start_time: bookingForm.startTime.toISOString(),
          end_time: bookingForm.endTime.toISOString()
        });

        console.log('Pricing API response:', response);

        if (response.success && response.data && response.data.totalCost !== undefined) {
          const pricingInfo = response.data;
          setPricingData(pricingInfo);
          setCalculatedCost(pricingInfo.totalCost);
          console.log('Setting pricing data:', pricingInfo);
          
          return {
            duration,
            cost: pricingInfo.totalCost,
            costPerMinute: parseFloat(pricingInfo.costPerMinute) || 0,
            breakdown: pricingInfo.breakdown,
            demandLevel: pricingInfo.demandLevel,
            savings: pricingInfo.savings
          };
        } else {
          console.warn('Pricing API returned invalid data:', response);
        }
      } catch (error) {
        console.error('Error calculating dynamic pricing:', error);
      } finally {
        setPricingLoading(false);
      }
    }
    
    // Fallback to simple calculation
    const fallbackCost = durationHours * 50; // ₹50 per hour default
    setCalculatedCost(fallbackCost);
    return {
      duration,
      cost: fallbackCost,
      costPerMinute: 50 / 60
    };
  };

  const formatDuration = (durationData) => {
    if (!durationData) return "0 minutes";
    
    const { hours, minutes } = durationData;
    
    if (hours === 0) {
      return `${minutes} minutes`;
    } else if (minutes === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
  };

  const handleTimeChange = (field, value) => {
    const updatedForm = { ...bookingForm, [field]: value };
    setBookingForm(updatedForm);
    
    // Recalculate cost when times change
    if (updatedForm.startTime && updatedForm.endTime && selectedZone) {
      // Use a small delay to avoid too many API calls
      clearTimeout(window.costCalculationTimeout);
      window.costCalculationTimeout = setTimeout(() => {
        calculateBookingCost(selectedZone.id);
      }, 500);
    }
    
    // Also check spot availability if we have time and zone
    if (updatedForm.startTime && updatedForm.endTime && spots.length > 0) {
      // Pass the booking ID to exclude if we're in edit mode
      const excludeBookingId = editDialogOpen && selectedBooking ? (selectedBooking._id || selectedBooking.id) : null;
      checkMultipleSpotsAvailability(spots, updatedForm.startTime, updatedForm.endTime, excludeBookingId);
    }
  };

  const handleZoneSelection = (zone) => {
    setSelectedZone(zone);
    setSelectedSpot(null);
    setBookingForm(prev => ({ ...prev, zoneId: zone.id, spotId: "" }));
    fetchSpotsInZone(zone.id);
    
    // Recalculate cost when zone changes
    if (bookingForm.startTime && bookingForm.endTime) {
      calculateBookingCost(zone.id);
    }
  };

  const fetchUserVehicles = async (userId) => {
    try {
      const response = await vehiclesAPI.getUserVehicles(token, userId);
      if (response.success) {
        const vehiclesData = response.data?.data || response.data || [];
        setUserVehicles(vehiclesData);
        
        // If user has vehicles, auto-select the first one
        if (vehiclesData.length > 0) {
          setBookingForm(prev => ({ 
            ...prev, 
            numberPlate: vehiclesData[0].number_plate || vehiclesData[0].numberPlate || ''
          }));
        } else {
          toast.info("This user has no registered vehicles. Please enter manually.");
        }
      } else {
        setUserVehicles([]);
      }
    } catch (error) {
      console.error("Error fetching user vehicles:", error);
      setUserVehicles([]);
    }
  };

  const handleUserChange = (userId) => {
    setBookingForm(prev => ({ ...prev, userId, numberPlate: "" }));
    setUserVehicles([]);
    
    if (userId) {
      fetchUserVehicles(userId);
    }
  };

  const resetForm = () => {
    setBookingForm({
      userId: "",
      numberPlate: "",
      zoneId: "",
      spotId: "",
      startTime: "",
      endTime: "",
      status: "Pending"
    });
    setSpots([]);
    setSelectedZone(null);
    setSelectedSpot(null);
    setSelectedBooking(null);
    setSpotAvailability({});
    setPricingData(null);
    setCalculatedCost(0);
    setUserVehicles([]);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return "bg-green-100 text-green-800";
      case 'pending':
        return "bg-yellow-100 text-yellow-800";
      case 'cancelled':
        return "bg-red-100 text-red-800";
      case 'completed':
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return <CheckCircleIcon className="h-4 w-4" />;
      case 'pending':
        return <ClockIcon className="h-4 w-4" />;
      case 'cancelled':
        return <XCircleIcon className="h-4 w-4" />;
      case 'completed':
        return <CheckCircleIcon className="h-4 w-4" />;
      default:
        return <AlertCircleIcon className="h-4 w-4" />;
    }
  };

  const formatDateTime = (dateTime) => {
    return new Date(dateTime).toLocaleString('en-US', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Booking Management</h1>
          <p className="text-muted-foreground">
            Manage all parking bookings and reservations
          </p>
        </div>
        <Button onClick={() => {
          resetForm();
          setCreateDialogOpen(true);
        }} className="w-full sm:w-auto">
          <PlusIcon className="h-4 w-4 mr-2" />
          Create Booking
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
            <CheckCircleIcon className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.confirmed}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <ClockIcon className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircleIcon className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
            <XCircleIcon className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by plate number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            {/* Zone Filter */}
            <Select value={zoneFilter} onValueChange={setZoneFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Zones" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Zones</SelectItem>
                {zones.map((zone) => (
                  <SelectItem key={zone.id} value={zone.id}>
                    {zone.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setZoneFilter("all");
                setDateFilter("all");
              }}
            >
              <FilterIcon className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bookings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Bookings ({totalBookings})</CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No bookings found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50" 
                      onClick={() => handleSort('booking_id')}
                    >
                      Booking ID {sortConfig.key === 'booking_id' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50" 
                      onClick={() => handleSort('user_name')}
                    >
                      User {sortConfig.key === 'user_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50" 
                      onClick={() => handleSort('number_plate')}
                    >
                      Vehicle {sortConfig.key === 'number_plate' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50" 
                      onClick={() => handleSort('zone_name')}
                    >
                      Zone/Spot {sortConfig.key === 'zone_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50" 
                      onClick={() => handleSort('start_time')}
                    >
                      Time {sortConfig.key === 'start_time' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50" 
                      onClick={() => handleSort('amount')}
                    >
                      Amount {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer select-none hover:bg-muted/50" 
                      onClick={() => handleSort('status')}
                    >
                      Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => (
                    <TableRow key={booking.id || booking._id}>
                      <TableCell className="font-mono text-xs">
                        {(booking.id || booking._id)?.slice(-8) || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {booking.user_name || 'Unknown User'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {booking.user_email || 'No email'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {booking.number_plate || booking.numberPlate || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {booking.zone_name || 'Unknown Zone'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Spot: {booking.spot_name || 'N/A'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>From: {formatDateTime(booking.start_time || booking.startTime)}</div>
                          <div>To: {formatDateTime(booking.end_time || booking.endTime)}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {formatCurrency(booking.amount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(booking.booking_status || booking.status)}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(booking.booking_status || booking.status)}
                            {booking.booking_status || booking.status || 'Unknown'}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewBooking(booking)}
                          >
                            <EyeIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditBooking(booking)}
                          >
                            <EditIcon className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontalIcon className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Admin Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {(booking.booking_status || booking.status)?.toLowerCase() === 'pending' && (
                                <DropdownMenuItem
                                  onClick={() => handleUpdateBookingStatus(booking.id, 'Confirmed')}
                                  disabled={actionLoading}
                                  className="text-green-600"
                                >
                                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                                  <span>Confirm Booking</span>
                                </DropdownMenuItem>
                              )}
                              {((booking.booking_status || booking.status)?.toLowerCase() === 'pending' || (booking.booking_status || booking.status)?.toLowerCase() === 'confirmed') && (
                                <DropdownMenuItem
                                  onClick={() => handleUpdateBookingStatus(booking.id, 'Cancelled')}
                                  disabled={actionLoading}
                                  className="text-red-600"
                                >
                                  <XCircleIcon className="h-4 w-4 mr-2" />
                                  <span>Cancel Booking</span>
                                </DropdownMenuItem>
                              )}
                              {(booking.booking_status || booking.status)?.toLowerCase() === 'confirmed' && (
                                <DropdownMenuItem
                                  onClick={() => handleUpdateBookingStatus(booking.id, 'Completed')}
                                  disabled={actionLoading}
                                  className="text-blue-600"
                                >
                                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                                  <span>Mark Completed</span>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalBookings > itemsPerPage && (
            <div className="flex items-center justify-between space-x-2 py-4">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, totalBookings)} of {totalBookings} bookings
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={currentPage * itemsPerPage >= totalBookings}
                >
                  Next
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Booking Dialog */}
      <Dialog open={createDialogOpen || editDialogOpen} onOpenChange={(open) => {
        setCreateDialogOpen(open);
        setEditDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editDialogOpen ? "Edit Booking with Zone Visualization" : "Create New Booking with Zone Visualization"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            {/* Edit Mode Notice */}
            {editDialogOpen && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>📝 Edit Mode:</strong> You can only modify the booking time and amount. 
                  User, vehicle, zone, and spot cannot be changed after booking creation.
                </p>
              </div>
            )}

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="user">User * {editDialogOpen && "(Cannot be changed)"}</Label>
                <Select 
                  value={bookingForm.userId} 
                  onValueChange={handleUserChange}
                  disabled={editDialogOpen}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select user first" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user._id || user.id} value={user._id || user.id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="vehicle">Vehicle Number * {editDialogOpen && "(Cannot be changed)"}</Label>
                {bookingForm.userId && userVehicles.length > 0 && !editDialogOpen ? (
                  <Select 
                    value={bookingForm.numberPlate} 
                    onValueChange={(value) => setBookingForm(prev => ({ ...prev, numberPlate: value }))}
                    disabled={editDialogOpen}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {userVehicles.map((vehicle) => (
                        <SelectItem 
                          key={vehicle._id || vehicle.id} 
                          value={vehicle.number_plate || vehicle.numberPlate}
                        >
                          {vehicle.number_plate || vehicle.numberPlate} - {vehicle.type} {vehicle.model ? `(${vehicle.model})` : ''}
                        </SelectItem>
                      ))}
                      <SelectItem value="__manual__">
                        ➕ Enter manually
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="numberPlate"
                    value={bookingForm.numberPlate}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, numberPlate: e.target.value.toUpperCase() }))}
                    placeholder={bookingForm.userId ? "Enter vehicle number" : "Select user first"}
                    disabled={!bookingForm.userId || editDialogOpen}
                  />
                )}
                {bookingForm.numberPlate === "__manual__" && (
                  <Input
                    className="mt-2"
                    value=""
                    onChange={(e) => setBookingForm(prev => ({ ...prev, numberPlate: e.target.value.toUpperCase() }))}
                    placeholder="Enter vehicle number manually"
                    autoFocus
                  />
                )}
              </div>
            </div>

            {/* Time Selection - FIRST STEP */}
            <div className="border rounded-lg p-4 bg-blue-50">
              <h4 className="text-lg font-semibold mb-3 text-blue-800">Step 1: Select Booking Time</h4>
              
              {/* Time Requirements Info */}
              <div className="mb-4 p-3 bg-blue-100 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  📅 <strong>Time Requirements:</strong>
                </p>
                <ul className="text-xs text-blue-700 mt-1 ml-4 list-disc">
                  <li>Start time must be at least 5 minutes in the future</li>
                  <li>Minimum duration: 30 minutes</li>
                  <li>Maximum duration: 24 hours</li>
                  <li>Current time: {new Date().toLocaleString()}</li>
                </ul>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">Start Date & Time</Label>
                  <DatePicker
                    id="startTime"
                    selected={bookingForm.startTime}
                    onChange={(date) => handleTimeChange('startTime', date)}
                    showTimeSelect
                    timeFormat="HH:mm"
                    timeIntervals={15}
                    dateFormat="MMMM d, yyyy h:mm aa"
                    minDate={new Date(Date.now() + 5 * 60 * 1000)}
                    placeholderText="Select start date and time"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    wrapperClassName="w-full"
                  />
                </div>
                
                <div>
                  <Label htmlFor="endTime">End Date & Time</Label>
                  <DatePicker
                    id="endTime"
                    selected={bookingForm.endTime}
                    onChange={(date) => handleTimeChange('endTime', date)}
                    showTimeSelect
                    timeFormat="HH:mm"
                    timeIntervals={15}
                    dateFormat="MMMM d, yyyy h:mm aa"
                    minDate={bookingForm.startTime ? new Date(bookingForm.startTime.getTime() + 30 * 60 * 1000) : new Date()}
                    placeholderText="Select end date and time"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    wrapperClassName="w-full"
                  />
                </div>
              </div>

              {/* Time Validation Feedback */}
              {bookingForm.startTime && bookingForm.endTime && (
                <div className="mt-3">
                  {(() => {
                    const validation = validateBookingTimes(bookingForm.startTime, bookingForm.endTime);
                    return (
                      <div className={`p-2 rounded-lg text-sm ${
                        validation.valid 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {validation.valid ? (
                          <span>✅ Time selection is valid</span>
                        ) : (
                          <span>❌ {validation.message}</span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Zone Selection - SECOND STEP */}
            <div className="border rounded-lg p-4 bg-green-50">
              <h4 className="text-lg font-semibold mb-3 text-green-800">
                Step 2: Select Zone {editDialogOpen && "(View Only - Cannot change)"}
              </h4>
              <div>
                <Label htmlFor="zone">Zone</Label>
                <Select 
                  value={bookingForm.zoneId} 
                  onValueChange={handleZoneChange}
                  disabled={editDialogOpen || !bookingForm.startTime || !bookingForm.endTime}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={!bookingForm.startTime || !bookingForm.endTime ? "Select time first" : "Select zone"} />
                  </SelectTrigger>
                  <SelectContent>
                    {zones.map((zone) => (
                      <SelectItem key={zone.id} value={zone.id}>
                        {zone.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Zone Visualization - THIRD STEP */}
            {selectedZone && (
              <div className="border rounded-lg p-4 bg-purple-50">
                <h4 className="text-lg font-semibold mb-3 text-purple-800">
                  {editDialogOpen ? "Current Spot (View Only - Cannot change)" : "Step 3: Select Spot from Zone Layout"}
                </h4>
                
                {/* Edit Mode Information */}
                {editDialogOpen && selectedBooking && (
                  <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">
                      � <strong>Edit Mode:</strong> Spot cannot be changed after booking creation. 
                      Current booking ID: {(selectedBooking.id || selectedBooking._id)?.slice(-8)}.
                      You can only modify the booking time and amount.
                    </p>
                  </div>
                )}
                
                {availabilityLoading && (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                    <span className="ml-2">Checking spot availability...</span>
                  </div>
                )}

                {selectedSpot && (
                  <div className={`mb-4 p-3 rounded-lg ${
                    spotAvailability[selectedSpot.id]?.isAvailable 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {spotAvailability[selectedSpot.id]?.isAvailable 
                      ? `✅ Spot "${selectedSpot.name}" is available for selected time`
                      : `❌ Spot "${selectedSpot.name}" is not available (${spotAvailability[selectedSpot.id]?.conflictCount} active booking conflicts: Confirmed/Pending)`
                    }
                  </div>
                )}

                {/* Show conflicting bookings details if spot is not available */}
                {selectedSpot && spotAvailability[selectedSpot.id] && !spotAvailability[selectedSpot.id].isAvailable && spotAvailability[selectedSpot.id].conflicts && spotAvailability[selectedSpot.id].conflicts.length > 0 && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <h6 className="text-sm font-semibold text-red-800 mb-2">
                      ❌ Conflicting Time Slots ({spotAvailability[selectedSpot.id].conflicts.length}):
                    </h6>
                    <div className="space-y-2">
                      {spotAvailability[selectedSpot.id].conflicts.map((conflict, index) => (
                        <div key={conflict.id || index} className="text-xs text-red-700 bg-white p-3 rounded border border-red-300">
                          <div className="font-semibold mb-1">
                            📅 {conflict.startTime.toLocaleString('en-US', { 
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })} - {conflict.endTime.toLocaleString('en-US', { 
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </div>
                          <div className="text-xs space-y-0.5 text-red-600">
                            <div>Status: <span className="font-medium">{conflict.status}</span></div>
                            {conflict.userName && <div>Booked by: {conflict.userName}</div>}
                            {conflict.numberPlate && <div>Vehicle: {conflict.numberPlate}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 text-xs text-red-600 italic">
                      💡 Please select a different time slot or spot to avoid conflicts
                    </div>
                  </div>
                )}

                <ZoneVisualization
                  zone={selectedZone}
                  spots={spots}
                  onSpotClick={editDialogOpen ? () => {} : handleSpotSelect}
                  selectedSpot={selectedSpot}
                  spotAvailability={spotAvailability}
                />

                {/* Alternative: Clickable Spot List */}
                {!editDialogOpen && (
                  <div className="mt-4">
                    <h5 className="text-md font-semibold mb-3">Alternative: Click to Select Spot</h5>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                      {spots.map((spot) => {
                        const availability = spotAvailability[spot.id];
                        const isAvailable = availability ? availability.isAvailable : true;
                        const isSelected = selectedSpot && selectedSpot.id === spot.id;
                        
                        return (
                          <button
                            key={spot.id}
                            onClick={() => handleSpotSelect(spot)}
                            disabled={!isAvailable || !bookingForm.startTime || !bookingForm.endTime}
                          className={`p-2 rounded text-sm font-medium transition-colors ${
                            isSelected
                              ? 'bg-purple-600 text-white'
                              : isAvailable
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-red-100 text-red-800 cursor-not-allowed opacity-50'
                          }`}
                        >
                          {spot.name}
                          {availability && !availability.isAvailable && (
                            <div className="text-xs">({availability.conflictCount} confirmed conflicts)</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
                )}
              </div>
            )}

            {/* Additional Details - FINAL STEP */}
            {selectedSpot && (
              <div className="border rounded-lg p-4 bg-orange-50">
                <h4 className="text-lg font-semibold mb-3 text-orange-800">Step 4: Booking Details</h4>
                <div className="grid grid-cols-1 gap-4">
                  {/* Status info - read only */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      <strong>📝 Note:</strong> New bookings will be created with "Pending" status. 
                      Admin can confirm bookings later after availability verification.
                    </p>
                  </div>
                </div>
                
                {/* Cost Display Section */}
                {bookingForm.startTime && bookingForm.endTime && selectedZone && (
                  <div className="mt-4 space-y-3">
                    {/* Enhanced Duration and Cost Display with Per-Minute Breakdown */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-blue-900">Booking Cost</h4>
                          {pricingLoading ? (
                            <div className="flex items-center gap-2 text-blue-700">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              <span className="text-sm">Calculating...</span>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="text-2xl font-bold text-blue-900">
                                ₹{calculatedCost.toFixed(2)}
                              </div>
                              {bookingForm.startTime && bookingForm.endTime && (
                                <div className="text-sm text-blue-700">
                                  Duration: {formatDuration(calculateBasicCost().duration)}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {pricingData && (
                          <div className="text-right">
                            <div className="text-sm text-blue-700">
                              Demand: {pricingData.demandLevel || 'Normal'}
                            </div>
                            {pricingData.savings > 0 && (
                              <div className="text-xs text-green-600">
                                Savings: ₹{pricingData.savings.toFixed(2)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Enhanced Pricing Breakdown with Per-Minute Details */}
                      {(() => {
                        const basicCost = calculateBasicCost();
                        const isUsingDynamicPricing = pricingData && pricingData.totalCost !== undefined;
                        
                        return (
                          <div className="space-y-3 pt-3 border-t border-blue-200">
                            {/* Base Rate Per Minute */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div className="space-y-1">
                                <div className="text-blue-600 font-medium">Base Rate</div>
                                <div className="text-blue-800">
                                  ₹{(50/60).toFixed(2)}/min (₹50/hr)
                                </div>
                              </div>
                              
                              {/* Duration in Minutes */}
                              <div className="space-y-1">
                                <div className="text-blue-600 font-medium">Duration</div>
                                <div className="text-blue-800">
                                  {basicCost.duration.totalMinutes} minutes
                                </div>
                              </div>
                            </div>

                            {/* Dynamic Pricing Details (if available) */}
                            {isUsingDynamicPricing && pricingData.breakdown && (
                              <div className="space-y-2">
                                <div className="text-blue-600 font-medium text-sm">Dynamic Pricing Applied</div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  {pricingData.breakdown.demandMultiplier !== 1 && (
                                    <div className="flex justify-between bg-blue-100 p-2 rounded">
                                      <span>Demand Multiplier:</span>
                                      <span className="font-medium">
                                        {(pricingData.breakdown.demandMultiplier * 100).toFixed(0)}%
                                        {pricingData.breakdown.demandMultiplier > 1 ? ' ↑' : ' ↓'}
                                      </span>
                                    </div>
                                  )}
                                  
                                  {pricingData.isWeekend && (
                                    <div className="flex justify-between bg-orange-100 p-2 rounded">
                                      <span>Weekend Rate:</span>
                                      <span className="font-medium">+20% 📅</span>
                                    </div>
                                  )}
                                  
                                  {pricingData.isPeakHour && (
                                    <div className="flex justify-between bg-red-100 p-2 rounded">
                                      <span>Peak Hours:</span>
                                      <span className="font-medium">+30% ⏰</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Fallback Pricing Display */}
                            {!isUsingDynamicPricing && (
                              <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                                <div className="text-xs text-yellow-800">
                                  <div className="font-medium mb-1">Using Standard Pricing</div>
                                  <div className="space-y-1">
                                    <div>Base: ₹{(50/60).toFixed(2)}/min × {basicCost.duration.totalMinutes} minutes</div>
                                    <div>Total: ₹{basicCost.cost.toFixed(2)}</div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Cost Calculation Summary */}
                            <div className="bg-green-50 border border-green-200 rounded p-2">
                              <div className="text-xs text-green-800">
                                <div className="font-medium">Per-Minute Breakdown:</div>
                                <div className="mt-1">
                                  {isUsingDynamicPricing ? (
                                    <span>Dynamic rate: ₹{(calculatedCost / basicCost.duration.totalMinutes).toFixed(3)}/min</span>
                                  ) : (
                                    <span>Standard rate: ₹{basicCost.costPerMinute.toFixed(3)}/min</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Confirmation Notice */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-sm text-amber-800">
                        <strong>⚠️ Please confirm:</strong> This booking will be charged ₹{calculatedCost.toFixed(2)} for the selected duration.
                      </p>
                    </div>
                  </div>
                )}

                {/* Info Notice for when requirements not met */}
                {(!bookingForm.startTime || !bookingForm.endTime || !selectedZone) && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      <strong>💡 Note:</strong> Select time and zone to see the calculated booking cost.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setCreateDialogOpen(false);
              setEditDialogOpen(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateOrUpdateBooking} 
              disabled={
                actionLoading || 
                !bookingForm.userId || 
                !bookingForm.numberPlate || 
                !selectedSpot ||
                !bookingForm.startTime ||
                !bookingForm.endTime ||
                (selectedSpot && spotAvailability[selectedSpot.id] && !spotAvailability[selectedSpot.id].isAvailable)
              }
            >
              {actionLoading 
                ? (editDialogOpen ? "Updating..." : "Creating...") 
                : (editDialogOpen ? "Update Booking" : "Create Booking")
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Booking Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Booking ID</Label>
                  <p className="text-sm font-mono">{(selectedBooking.id || selectedBooking._id)?.slice(-8)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge className={getStatusColor(selectedBooking.booking_status || selectedBooking.status)}>
                    {selectedBooking.booking_status || selectedBooking.status}
                  </Badge>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium">User</Label>
                <p className="text-sm">
                  {selectedBooking.user_name || 'Unknown User'} 
                  {selectedBooking.user_email && ` (${selectedBooking.user_email})`}
                </p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Vehicle Number</Label>
                <p className="text-sm">{selectedBooking.number_plate || selectedBooking.numberPlate}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Zone</Label>
                  <p className="text-sm">{selectedBooking.zone_name || 'Unknown Zone'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Spot</Label>
                  <p className="text-sm">{selectedBooking.spot_name || 'N/A'}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Start Time</Label>
                  <p className="text-sm">{formatDateTime(selectedBooking.start_time || selectedBooking.startTime)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">End Time</Label>
                  <p className="text-sm">{formatDateTime(selectedBooking.end_time || selectedBooking.endTime)}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Amount</Label>
                <p className="text-lg font-semibold">{formatCurrency(selectedBooking.amount)}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
