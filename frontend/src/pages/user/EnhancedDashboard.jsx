import React, { useEffect, useState, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "react-hot-toast";
import QRCode from "react-qr-code";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { spotsAPI, zonesAPI, bookingsAPI, usersAPI, pricingAPI, vehiclesAPI } from "@/services/api";
import { generateBookingPDF } from "@/utils/pdfGenerator";
import { CalendarIcon, CarIcon, MapPinIcon, ClockIcon, DownloadIcon, ArrowLeftIcon } from "lucide-react";
import ZoneVisualization from "@/components/item/ZoneVisualization";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "../../styles/datepicker-custom.css";

const RATE_NORMAL = 10;
const RATE_OVERDUE = 20;

export default function CreateBooking() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [spotsInZone, setSpotsInZone] = useState([]);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [spotAvailability, setSpotAvailability] = useState({});
  const [pricingData, setPricingData] = useState(null);
  
  const [bookingForm, setBookingForm] = useState({
    numberPlate: "",
    startDateTime: null,
    endDateTime: null,
  });

  const receiptRef = useRef(null);

  useEffect(() => {
    if (token && user) {
      fetchDashboardData();
    }
  }, [token, user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [zonesResponse, userResponse, vehiclesResponse] = await Promise.all([
        zonesAPI.getZones(token),
        usersAPI.getUser(token, user.id),
        vehiclesAPI.getUserVehicles(token, user.id)
      ]);

      if (zonesResponse.success) {
        const zonesData = zonesResponse.data?.data || zonesResponse.data || [];
        console.log('Zones fetched:', zonesData);
        setZones(Array.isArray(zonesData) ? zonesData : []);
      } else {
        console.error('Failed to fetch zones:', zonesResponse);
        toast.error("Failed to fetch parking zones");
        setZones([]);
      }

      if (userResponse.success) {
        setUserProfile(userResponse.data?.data || userResponse.data);
      }

      if (vehiclesResponse.success) {
        const vehiclesData = vehiclesResponse.data?.data || vehiclesResponse.data || [];
        const userVehicles = Array.isArray(vehiclesData) ? vehiclesData : [];
        // Ensure we only show vehicles for the current user
        const filteredVehicles = userVehicles.filter(v => v.user_id === user.id || v.userId === user.id);
        setVehicles(filteredVehicles);
      }

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const fetchSpotsInZone = async (zoneId) => {
    console.log('📍 fetchSpotsInZone called with zoneId:', zoneId);
    
    try {
      const response = await spotsAPI.getSpots(token, { zone_id: zoneId });
      console.log('📋 fetchSpotsInZone API response:', response);
      
      if (response.success) {
        const spotsData = response.data?.data || response.data || [];
        console.log('✅ Spots data received:', spotsData);
        console.log('📍 Number of spots:', spotsData.length);
        
        // Verify that all spots belong to the requested zone
        const verifiedSpots = spotsData.filter(spot => {
          const spotZoneId = spot.zone_id || spot.zoneId;
          const matches = spotZoneId === zoneId;
          if (!matches) {
            console.warn(`⚠️ Filtering out spot ${spot.name} - zone_id ${spotZoneId} doesn't match requested ${zoneId}`);
          }
          return matches;
        });
        
        console.log(`✅ Setting ${verifiedSpots.length} verified spots for zone ${zoneId}`);
        setSpotsInZone(Array.isArray(verifiedSpots) ? verifiedSpots : []);
      } else {
        console.error('❌ Failed to fetch spots:', response);
        toast.error("Failed to fetch spots in this zone");
        setSpotsInZone([]);
      }
    } catch (error) {
      console.error("❌ Error fetching spots:", error);
      toast.error("Failed to load spots");
      setSpotsInZone([]);
    }
  };

  const checkSpotAvailability = async (spotId, startDateTime, endDateTime) => {
    if (!spotId || !startDateTime || !endDateTime) return;
    
    try {
      setAvailabilityLoading(true);
      
      // Get all bookings for this spot
      const response = await bookingsAPI.getBookings(token, {
        spot_id: spotId
      });

      if (response.success) {
        const allBookings = response.data?.data || response.data || [];
        
        // Filter bookings that overlap with the selected time range
        const conflictingBookings = allBookings.filter(booking => {
          const bookingStart = new Date(booking.startTime);
          const bookingEnd = new Date(booking.endTime);
          const selectedStart = new Date(startDateTime);
          const selectedEnd = new Date(endDateTime);
          
          // Check for time overlap
          // Two time ranges overlap if: start1 < end2 && start2 < end1
          return selectedStart < bookingEnd && bookingStart < selectedEnd;
        });
        
        const isAvailable = conflictingBookings.length === 0;
        
        setSpotAvailability(prev => ({
          ...prev,
          [spotId]: {
            isAvailable,
            conflictCount: conflictingBookings.length
          }
        }));

        return isAvailable;
      }
    } catch (error) {
      console.error("Error checking availability:", error);
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const handleZoneSelect = async (zoneId) => {
    console.log('🔍 handleZoneSelect called with zoneId:', zoneId);
    console.log('Available zones:', zones);
    
    const zone = zones.find(z => z._id === zoneId || z.id === zoneId);
    
    if (!zone) {
      console.error('❌ Zone not found for ID:', zoneId);
      toast.error("Selected zone not found");
      return;
    }
    
    console.log('✅ Selected zone:', zone);
    
    setSelectedZone(zone);
    setSelectedSpot(null);
    setPricingData(null);
    setSpotsInZone([]);
    setSpotAvailability({});
    
    // Fetch spots in the zone - use the correct ID field
    const actualZoneId = zone._id || zone.id;
    console.log('🔍 Fetching spots for zone ID:', actualZoneId);
    
    try {
      const response = await spotsAPI.getSpots(token, { zone_id: actualZoneId });
      console.log('📋 Spots API response:', response);
      
      if (response.success) {
        const spots = response.data?.data || response.data || [];
        console.log('✅ Fetched spots:', spots);
        console.log('📍 Number of spots in zone:', spots.length);
        
        // Verify that all spots belong to the selected zone
        const verifiedSpots = spots.filter(spot => {
          const spotZoneId = spot.zone_id || spot.zoneId;
          const matches = spotZoneId === actualZoneId;
          if (!matches) {
            console.warn(`⚠️ Spot ${spot.name} has zone_id ${spotZoneId} but expected ${actualZoneId}`);
          }
          return matches;
        });
        
        console.log(`✅ Verified ${verifiedSpots.length} spots belong to selected zone`);
        setSpotsInZone(verifiedSpots);
        
        // If time is selected, check availability for all spots
        if (bookingForm.startDateTime && bookingForm.endDateTime) {
          console.log('⏰ Time selected, checking availability and pricing');
          
          // Check availability and calculate pricing in parallel
          await Promise.all([
            checkMultipleSpotsAvailability(verifiedSpots, bookingForm.startDateTime.toISOString(), bookingForm.endDateTime.toISOString()),
            calculateBookingCost(actualZoneId)
          ]);
        }
      } else {
        console.error('❌ Failed to fetch spots:', response);
        toast.error("Failed to fetch spots for this zone");
        setSpotsInZone([]);
      }
    } catch (error) {
      console.error('❌ Error in handleZoneSelect:', error);
      toast.error("Failed to load spots for this zone");
      setSpotsInZone([]);
    }
  };

  const checkMultipleSpotsAvailability = async (spots, startDateTime, endDateTime) => {
    setAvailabilityLoading(true);
    
    console.log(`🔍 Starting availability check for ${spots.length} spots`);
    console.log(`📅 Requested time slot: ${new Date(startDateTime).toLocaleString()} - ${new Date(endDateTime).toLocaleString()}`);
    
    try {
      const availabilityChecks = spots.map(async (spot) => {
        const spotId = spot.id || spot._id;
        console.log(`\n🅿️ Checking spot: ${spot.name || spot.number} (ID: ${spotId})`);
        
        // Get all bookings for this spot
        const response = await bookingsAPI.getBookings(token, {
          spot_id: spotId
        });

        if (response.success) {
          const allBookings = response.data?.data || response.data || [];
          console.log(`📋 Found ${allBookings.length} total bookings for spot ${spot.name || spot.number}`);
          
          // Filter CONFIRMED bookings only for conflict check
          // Only confirmed bookings should block availability, not pending ones
          const activeBookings = allBookings.filter(booking => {
            const status = (booking.booking_status || booking.status || '').toLowerCase();
            console.log(`  📌 Booking ${booking.id}: Status="${booking.booking_status || booking.status}" → Normalized="${status}"`);
            return status === 'confirmed';
          });
          
          console.log(`✅ ${activeBookings.length} confirmed bookings to check for conflicts`);
          
          // Check for time conflicts with active bookings
          const conflictingBookings = activeBookings.filter(booking => {
            const bookingStart = new Date(booking.start_time || booking.startTime);
            const bookingEnd = new Date(booking.end_time || booking.endTime);
            const selectedStart = new Date(startDateTime);
            const selectedEnd = new Date(endDateTime);
            
            console.log(`  🔍 Checking booking ${booking.id}:`);
            console.log(`     Existing: ${bookingStart.toISOString()} - ${bookingEnd.toISOString()}`);
            console.log(`     Selected: ${selectedStart.toISOString()} - ${selectedEnd.toISOString()}`);
            
            // Check for time overlap: start1 < end2 && start2 < end1
            const hasConflict = selectedStart < bookingEnd && bookingStart < selectedEnd;
            
            console.log(`     Overlap? selectedStart < bookingEnd: ${selectedStart < bookingEnd}, bookingStart < selectedEnd: ${bookingStart < selectedEnd} → ${hasConflict}`);
            
            if (hasConflict) {
              console.log(`     ❌ CONFLICT found with booking ${booking._id || booking.id} (${booking.booking_status || booking.status})`);
            }
            
            return hasConflict;
          });
          
          const isAvailable = conflictingBookings.length === 0;
          
          console.log(`🏁 Spot ${spot.name || spot.number}: ${isAvailable ? 'AVAILABLE' : 'NOT AVAILABLE'} (${conflictingBookings.length} confirmed booking conflicts)`);
          
          // Map conflicting bookings to include time details
          const conflicts = conflictingBookings.map(booking => ({
            id: booking.id || booking._id,
            startTime: new Date(booking.start_time || booking.startTime),
            endTime: new Date(booking.end_time || booking.endTime),
            status: booking.booking_status || booking.status,
            userName: booking.user_name || booking.userName
          }));
          
          return {
            spotId: spotId,
            isAvailable,
            conflictCount: conflictingBookings.length,
            totalBookings: allBookings.length,
            activeBookings: activeBookings.length,
            conflicts: conflicts
          };
        }
        
        console.log(`⚠️ Failed to fetch bookings for spot ${spot.name || spot.number}`);
        return {
          spotId: spotId,
          isAvailable: true,
          conflictCount: 0,
          totalBookings: 0,
          activeBookings: 0
        };
      });

      const results = await Promise.all(availabilityChecks);
      
      const availabilityMap = {};
      results.forEach(result => {
        availabilityMap[result.spotId] = {
          isAvailable: result.isAvailable,
          conflictCount: result.conflictCount,
          totalBookings: result.totalBookings,
          confirmedBookings: result.confirmedBookings
        };
      });
      
      setSpotAvailability(availabilityMap);
      
      // Log summary
      const availableSpots = results.filter(r => r.isAvailable).length;
      const totalSpots = results.length;
      const totalConflicts = results.reduce((sum, r) => sum + r.conflictCount, 0);
      
      console.log(`\n📊 AVAILABILITY SUMMARY:`);
      console.log(`✅ Available spots: ${availableSpots}/${totalSpots}`);
      console.log(`❌ Total active booking conflicts (Confirmed + Pending): ${totalConflicts}`);
      console.log(`📅 Time slot: ${new Date(startDateTime).toLocaleString()} - ${new Date(endDateTime).toLocaleString()}`);
      
    } catch (error) {
      console.error("❌ Error checking multiple spots availability:", error);
      toast.error("Failed to check spot availability");
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const handleSpotSelect = (spot) => {
    const spotId = spot.id || spot._id;
    console.log('handleSpotSelect called with spot:', spot.name, 'ID:', spotId);
    
    // Check if time is selected
    if (!bookingForm.startDateTime || !bookingForm.endDateTime) {
      toast.error("Please select your parking time first");
      return;
    }

    // Check if spot is available
    const availability = spotAvailability[spotId];
    if (availability && !availability.isAvailable) {
      toast.error("This spot is not available for the selected time");
      return;
    }

    // If spot is available, select it and open booking dialog
    console.log('Setting selected spot to:', spot.name, 'ID:', spotId);
    setSelectedSpot(spot);
  };

  const handleDateTimeChange = async (field, value) => {
    setBookingForm(prev => ({ ...prev, [field]: value }));
    
    // Clear previous spot selection when time changes
    setSelectedSpot(null);
    setPricingData(null);
    
    // Check availability for all spots in selected zone when both start and end times are set
    const updatedForm = { ...bookingForm, [field]: value };
    if (selectedZone && spotsInZone.length > 0 && updatedForm.startDateTime && updatedForm.endDateTime) {
      // Validate that end time is after start time
      if (updatedForm.endDateTime > updatedForm.startDateTime) {
        // Update pricing and availability in parallel
        await Promise.all([
          checkMultipleSpotsAvailability(spotsInZone, updatedForm.startDateTime.toISOString(), updatedForm.endDateTime.toISOString()),
          calculateBookingCost(selectedZone._id)
        ]);
      }
    }
  };

  const calculateBasicCost = () => {
    if (!bookingForm.startDateTime || !bookingForm.endDateTime) {
      return {
        duration: { totalMinutes: 0, hours: 0, minutes: 0, displayHours: 0 },
        cost: 0,
        costPerMinute: 0
      };
    }

    const startDateTime = bookingForm.startDateTime;
    const endDateTime = bookingForm.endDateTime;
    
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

    const fallbackCost = durationHours * RATE_NORMAL;
    return {
      duration,
      cost: fallbackCost,
      costPerMinute: RATE_NORMAL / 60
    };
  };

  const calculateBookingCost = async (zoneId = null) => {
    if (!bookingForm.startDateTime || !bookingForm.endDateTime) {
      return {
        duration: { totalMinutes: 0, hours: 0, minutes: 0, displayHours: 0 },
        cost: 0,
        costPerMinute: 0
      };
    }

    const startDateTime = bookingForm.startDateTime;
    const endDateTime = bookingForm.endDateTime;
    
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
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString()
        });
        
        const response = await pricingAPI.calculatePrice(token, {
          zoneId,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString()
        });

        console.log('Pricing API response:', response);
        console.log('Response data:', response.data);
        console.log('Total cost:', response.data?.totalCost);

        if (response.success && response.data && response.data.totalCost !== undefined) {
          const pricingInfo = response.data;
          setPricingData(pricingInfo);
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
          console.warn('Response.success:', response.success);
          console.warn('Response.data:', response.data);
          console.warn('Response.data.totalCost:', response.data?.totalCost);
        }
      } catch (error) {
        console.error('Error calculating dynamic pricing:', error);
      } finally {
        setPricingLoading(false);
      }
    }
    
    // Fallback to simple calculation
    const fallbackCost = durationHours * RATE_NORMAL;
    return {
      duration,
      cost: fallbackCost,
      costPerMinute: RATE_NORMAL / 60
    };
  };

  const formatDuration = (durationData) => {
    if (!durationData) return "0 minutes";
    
    const { hours, minutes, totalMinutes } = durationData;
    
    if (hours === 0) {
      return `${minutes} minutes`;
    } else if (minutes === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
  };

  // Trigger pricing calculation when zone or time changes
  const updatePricing = async () => {
    if (selectedZone && bookingForm.startDateTime && bookingForm.endDateTime) {
      await calculateBookingCost(selectedZone._id);
    }
  };

  const handleCreateBooking = async () => {
    console.log('handleCreateBooking called');
    const { numberPlate, startDateTime, endDateTime } = bookingForm;
    
    console.log('Booking form values:', { numberPlate, startDateTime, endDateTime });
    console.log('Selected spot:', selectedSpot);
    console.log('Selected zone:', selectedZone);
    console.log('Current user:', user);
    
    if (!numberPlate || !selectedSpot || !startDateTime || !endDateTime) {
      toast.error("Please fill all fields and select a spot");
      return;
    }

    // Check if end time is after start time
    if (endDateTime <= startDateTime) {
      toast.error("End time must be after start time");
      return;
    }

    // Validate that start time is in the future (at least 5 minutes)
    const now = new Date();
    const minimumStartTime = new Date(now.getTime() + 5 * 60 * 1000);
    if (startDateTime < minimumStartTime) {
      toast.error(`Start time must be at least 5 minutes in the future. Current time: ${now.toLocaleString()}`);
      return;
    }

    try {
      setBookingLoading(true);
      console.log('Starting booking creation...');

      // Final availability check - only check confirmed bookings
      const finalSpotId = selectedSpot.id || selectedSpot._id;
      const response = await bookingsAPI.getBookings(token, {
        spot_id: finalSpotId
      });

      if (response.success) {
        const allBookings = response.data?.data || response.data || [];
        
        // Filter ACTIVE bookings (Confirmed and Pending)
        const activeBookings = allBookings.filter(booking => {
          const status = (booking.booking_status || booking.status || '').toLowerCase();
          return status === 'confirmed' || status === 'pending';
        });
        
        // Check for time conflicts with active bookings
        const conflictingBookings = activeBookings.filter(booking => {
          const bookingStart = new Date(booking.start_time || booking.startTime);
          const bookingEnd = new Date(booking.end_time || booking.endTime);
          const selectedStart = new Date(startDateTime);
          const selectedEnd = new Date(endDateTime);
          
          // Check for time overlap
          return selectedStart < bookingEnd && bookingStart < selectedEnd;
        });
        
        if (conflictingBookings.length > 0) {
          toast.error(`This spot has ${conflictingBookings.length} active booking conflict(s) (Confirmed/Pending) for the selected time`);
          return;
        }
      }

      // Convert to ISO datetime format for backend
      const startTimeISO = startDateTime.toISOString();
      const endTimeISO = endDateTime.toISOString();

      // Use the correct ID fields - backend expects 'id' not '_id'
      const spotId = selectedSpot.id || selectedSpot._id;
      const zoneId = selectedZone.id || selectedZone._id;

      console.log('🔍 Spot ID for booking:', spotId, '| Zone ID:', zoneId);

      const bookingData = {
        user_id: user.id,
        number_plate: numberPlate.toUpperCase(),
        spot_id: spotId,
        zone_id: zoneId,
        start_time: startTimeISO,
        end_time: endTimeISO,
        amount: pricingData && pricingData.totalCost !== undefined ? pricingData.totalCost : calculateBasicCost().cost
      };

      console.log('Booking data to submit:', bookingData);
      const bookingResponse = await bookingsAPI.createBooking(token, bookingData);
      console.log('Booking response:', bookingResponse);

      if (bookingResponse.success) {
        toast.success(
          "🎉 Booking submitted successfully! Your booking is pending admin confirmation.",
          {
            duration: 5000,
            style: {
              background: '#f0fdf4',
              color: '#16a34a',
              border: '1px solid #86efac'
            }
          }
        );
        
        // Close the dialog
        setSelectedSpot(null);
        
        // Reset form
        setBookingForm({
          numberPlate: "",
          startDateTime: null,
          endDateTime: null,
        });
        setSelectedZone(null);
        setSpotsInZone([]);
        setPricingData(null);
        setSpotAvailability({});
        
        // Refresh data
        fetchDashboardData();
        
        // Navigate back to dashboard after a short delay
        setTimeout(() => {
          navigate('/user/dashboard');
        }, 2000);
      } else {
        // Enhanced error handling
        let errorMessage = "Failed to create booking";
        
        if (bookingResponse.data?.error) {
          errorMessage = bookingResponse.data.error;
        } else if (bookingResponse.data?.message) {
          errorMessage = bookingResponse.data.message;
        } else if (bookingResponse.error) {
          errorMessage = bookingResponse.error;
        } else if (bookingResponse.message) {
          errorMessage = bookingResponse.message;
        }
        
        // Clean up validation error messages
        if (errorMessage.includes("Booking validation failed:")) {
          errorMessage = errorMessage.replace("Booking validation failed: ", "");
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
      console.error("Error creating booking:", error);
      
      // Enhanced error handling for network/API errors
      let errorMessage = "Failed to create booking";
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Clean up validation error messages
      if (errorMessage.includes("Booking validation failed:")) {
        errorMessage = errorMessage.replace("Booking validation failed: ", "");
      }
      
      toast.error(errorMessage);
    } finally {
      setBookingLoading(false);
    }
  };

  const generateBookingPDFHandler = async (booking) => {
    try {
      await generateBookingPDF(booking, userProfile);
      toast.success("Receipt downloaded successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate receipt");
    }
  };

  const getSpotStatusColor = (spot) => {
    const availability = spotAvailability[spot._id];
    if (availability && !availability.isAvailable) {
      return "bg-red-100 border-red-300 text-red-800";
    }
    
    switch (spot.status?.toLowerCase()) {
      case 'available':
        return "bg-green-100 border-green-300 text-green-800";
      case 'occupied':
        return "bg-red-100 border-red-300 text-red-800";
      case 'reserved':
        return "bg-yellow-100 border-yellow-300 text-yellow-800";
      case 'blocked':
        return "bg-gray-100 border-gray-300 text-gray-800";
      default:
        return "bg-blue-100 border-blue-300 text-blue-800";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate('/user/dashboard')}
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold mb-2">
          Create New Booking
        </h1>
        <p className="opacity-90">
          Select your parking time and choose from available spots
        </p>
      </div>

      {/* Date/Time Selection - Step 1 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClockIcon className="h-5 w-5" />
            Step 1: Select Parking Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 p-3 rounded-lg mb-4">
            <p className="text-sm text-gray-700 font-medium">
              📅 First, select when you need the parking spot - choose date and time together
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium block mb-2">Start Date & Time</label>
              <DatePicker
                selected={bookingForm.startDateTime}
                onChange={(date) => handleDateTimeChange('startDateTime', date)}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat="MMMM d, yyyy h:mm aa"
                minDate={new Date()}
                placeholderText="Select start date and time"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                wrapperClassName="w-full"
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">End Date & Time</label>
              <DatePicker
                selected={bookingForm.endDateTime}
                onChange={(date) => handleDateTimeChange('endDateTime', date)}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat="MMMM d, yyyy h:mm aa"
                minDate={bookingForm.startDateTime || new Date()}
                placeholderText="Select end date and time"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                wrapperClassName="w-full"
              />
            </div>
          </div>

          {bookingForm.startDateTime && bookingForm.endDateTime && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <span className="text-sm font-medium">Duration: </span>
                  <span className="text-sm">{formatDuration(calculateBasicCost().duration)}</span>
                </div>
                <div>
                  <span className="text-sm font-medium">Estimated Cost: </span>
                  {pricingLoading ? (
                    <span className="text-sm text-gray-500">Calculating...</span>
                  ) : pricingData && pricingData.totalCost !== undefined && typeof pricingData.totalCost === 'number' ? (
                    <span className="text-lg font-bold text-blue-600">₹{pricingData.totalCost.toFixed(2)}</span>
                  ) : (
                    <span className="text-lg font-bold text-blue-600">₹{calculateBasicCost().cost}</span>
                  )}
                </div>
              </div>
              
              {/* Dynamic Pricing Details */}
              {pricingData && pricingData.baseRate && pricingData.durationMinutes && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <div className="text-xs text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Base Rate:</span>
                      <span>₹{pricingData.baseRate}/min</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span>{pricingData.durationMinutes} minutes</span>
                    </div>
                    {pricingData.demandMultiplier && pricingData.demandMultiplier > 1 && (
                      <div className="flex justify-between text-orange-600">
                        <span>Peak Time ({Math.round((pricingData.demandMultiplier - 1) * 100)}% higher):</span>
                        <span>High Demand</span>
                      </div>
                    )}
                    {pricingData.demandMultiplier && pricingData.demandMultiplier < 1 && (
                      <div className="flex justify-between text-green-600">
                        <span>Off-Peak ({Math.round((1 - pricingData.demandMultiplier) * 100)}% discount):</span>
                        <span>Low Demand</span>
                      </div>
                    )}
                    {pricingData.isWeekend && (
                      <div className="flex justify-between text-blue-600">
                        <span>Weekend Rate:</span>
                        <span>Applied</span>
                      </div>
                    )}
                    {pricingData.isHoliday && (
                      <div className="flex justify-between text-purple-600">
                        <span>Holiday Rate:</span>
                        <span>Applied</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Zone Selection Dropdown - Step 2 */}
      {bookingForm.startDateTime && bookingForm.endDateTime && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPinIcon className="h-5 w-5" />
              Step 2: Select Parking Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Info Banner */}
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-gray-700 font-medium">
                  🅿️ Select your preferred parking zone from the dropdown below
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Choose a parking zone</label>
                <Select 
                  value={selectedZone?._id || selectedZone?.id || ""} 
                  onValueChange={handleZoneSelect}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a parking zone..." />
                  </SelectTrigger>
                  <SelectContent>
                    {zones.length === 0 ? (
                      <SelectItem value="" disabled>No zones available</SelectItem>
                    ) : (
                      zones.map((zone) => {
                        const zoneId = zone._id || zone.id;
                        return (
                          <SelectItem key={zoneId} value={zoneId}>
                            <div className="flex items-center gap-2">
                              <MapPinIcon className="h-4 w-4" />
                              <span>{zone.name}</span>
                              {zone.description && (
                                <span className="text-gray-500">- {zone.description}</span>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Debug Info - Remove in production */}
              {selectedZone && (
                <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                  <strong>Debug:</strong> Selected Zone ID: {selectedZone._id || selectedZone.id} | Name: {selectedZone.name}
                </div>
              )}

              {/* Selected Zone Info */}
              {selectedZone && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800">
                    ✅ Selected Zone: <strong>{selectedZone.name}</strong>
                    {selectedZone.description && ` - ${selectedZone.description}`}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Zone Layout and Spot Selection - Step 3 */}
      {selectedZone && spotsInZone.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CarIcon className="h-5 w-5" />
              Step 3: Select Your Parking Spot in {selectedZone.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-gray-700 font-medium mb-2">🚗 How to select a parking spot:</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>Visual Map:</strong> Click on green spots in the zone map below</li>
                  <li>• <strong>Grid Selection:</strong> Use the clickable spot buttons</li>
                  <li>• <strong>Table View:</strong> Use the detailed table with select buttons</li>
                  <li>• <strong className="text-green-600">Green = Available</strong>, <strong className="text-red-600">Red = Unavailable</strong></li>
                </ul>
              </div>
              
              {availabilityLoading && (
                <div className="flex items-center justify-center p-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-sm text-gray-600">Checking availability...</span>
                </div>
              )}

              <ZoneVisualization
                zone={selectedZone}
                spots={spotsInZone}
                onSpotClick={handleSpotSelect}
                selectedSpot={selectedSpot}
                spotAvailability={spotAvailability}
                startDateTime={bookingForm.startDateTime?.toISOString()}
                endDateTime={bookingForm.endDateTime?.toISOString()}
              />

              {/* Alternative: Clickable Spot List */}
              <div className="mt-6">
                <h5 className="text-md font-semibold mb-3">Alternative: Click to Select Spot</h5>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {spotsInZone.map((spot) => {
                    const spotId = spot.id || spot._id;
                    const selectedSpotId = selectedSpot ? (selectedSpot.id || selectedSpot._id) : null;
                    const availability = spotAvailability[spotId];
                    const isAvailable = availability ? availability.isAvailable : true;
                    const isSelected = selectedSpot && selectedSpotId === spotId;
                    
                    return (
                      <button
                        key={spotId}
                        onClick={() => handleSpotSelect(spot)}
                        disabled={!isAvailable}
                        className={`p-3 rounded-lg border-2 text-left transition-all duration-200 ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 text-blue-800'
                            : isAvailable
                            ? 'border-green-300 bg-green-50 text-green-800 hover:border-green-400 hover:bg-green-100'
                            : 'border-red-300 bg-red-50 text-red-800 cursor-not-allowed opacity-60'
                        }`}
                      >
                        <div className="font-semibold">{spot.name}</div>
                        <div className="text-xs mt-1">
                          {isAvailable ? 'Available' : 'Unavailable'}
                        </div>
                        {availability && !availability.isAvailable && (
                          <div className="text-xs text-red-600">
                            {availability.conflictCount} conflicts
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Or Table View for Detailed Information */}
              <div className="mt-6">
                <h5 className="text-md font-semibold mb-3">Detailed Spot Information</h5>
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Spot Name</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Status</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Availability</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {spotsInZone.map((spot) => {
                        const spotId = spot.id || spot._id;
                        const selectedSpotId = selectedSpot ? (selectedSpot.id || selectedSpot._id) : null;
                        const availability = spotAvailability[spotId];
                        const isAvailable = availability ? availability.isAvailable : true;
                        const isSelected = selectedSpot && selectedSpotId === spotId;
                        
                        return (
                          <tr key={spotId} className={`border-t ${isSelected ? 'bg-blue-50' : ''}`}>
                            <td className="px-4 py-3 font-medium">{spot.name}</td>
                            <td className="px-4 py-3">
                              <Badge className={`${isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {isAvailable ? 'Available' : 'Unavailable'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {availability && !availability.isAvailable 
                                ? `${availability.conflictCount} conflicts`
                                : 'Ready to book'
                              }
                            </td>
                            <td className="px-4 py-3">
                              <Button
                                size="sm"
                                onClick={() => handleSpotSelect(spot)}
                                disabled={!isAvailable}
                                variant={isSelected ? "default" : "outline"}
                                className="text-xs"
                              >
                                {isSelected ? 'Selected' : isAvailable ? 'Select' : 'Unavailable'}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Spot Status Legend */}
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-200 border border-green-400 rounded"></div>
                  <span>Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-200 border border-red-400 rounded"></div>
                  <span>Unavailable</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-200 border border-blue-400 rounded"></div>
                  <span>Selected</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Booking Form Dialog - Step 4 */}
      <Dialog open={!!selectedSpot} onOpenChange={(open) => {
        if (!open) setSelectedSpot(null);
      }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Step 4: Confirm Your Booking - Spot {selectedSpot?.name}</DialogTitle>
            <DialogDescription>
              Review your booking details and select your vehicle to complete your reservation.
            </DialogDescription>
          </DialogHeader>
          {selectedSpot && (
            <div className="space-y-4">
              {/* Booking Process Info */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>📋 Booking Process:</strong> Your booking will be submitted as "Pending" and requires admin confirmation. 
                  You'll be notified once the admin reviews and confirms your booking.
                </p>
              </div>

              {/* User Info */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-700">
                  <strong>👤 Booking for:</strong> {userProfile?.name || user?.name || 'You'}
                </p>
                {userProfile?.email && (
                  <p className="text-xs text-gray-600">{userProfile.email}</p>
                )}
              </div>
              
              {/* Booking Summary */}
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Zone:</span>
                  <span>{selectedZone.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Spot:</span>
                  <span>{selectedSpot.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Start:</span>
                  <span>{bookingForm.startDateTime?.toLocaleString('en-US', { 
                    year: 'numeric', 
                    month: '2-digit', 
                    day: '2-digit', 
                    hour: '2-digit', 
                    minute: '2-digit',
                    timeZoneName: 'short'
                  })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">End:</span>
                  <span>{bookingForm.endDateTime?.toLocaleString('en-US', { 
                    year: 'numeric', 
                    month: '2-digit', 
                    day: '2-digit', 
                    hour: '2-digit', 
                    minute: '2-digit',
                    timeZoneName: 'short'
                  })}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Cost:</span>
                  {pricingData && pricingData.totalCost !== undefined && typeof pricingData.totalCost === 'number' ? (
                    <span className="text-blue-600">₹{pricingData.totalCost.toFixed(2)}</span>
                  ) : (
                    <span className="text-blue-600">₹{calculateBasicCost().cost}</span>
                  )}
                </div>
                
                {/* Dynamic Pricing Breakdown */}
                {pricingData && pricingData.baseRate && pricingData.durationMinutes && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="text-xs text-gray-600 space-y-1">
                      <div className="flex justify-between">
                        <span>Base Rate:</span>
                        <span>₹{pricingData.baseRate}/min × {pricingData.durationMinutes} min</span>
                      </div>
                      {pricingData.demandMultiplier && pricingData.demandMultiplier !== 1 && (
                        <div className="flex justify-between">
                          <span>Demand Adjustment:</span>
                          <span className={pricingData.demandMultiplier > 1 ? 'text-orange-600' : 'text-green-600'}>
                            {pricingData.demandMultiplier > 1 ? '+' : ''}
                            {Math.round((pricingData.demandMultiplier - 1) * 100)}%
                          </span>
                        </div>
                      )}
                      {pricingData.isWeekend && (
                        <div className="flex justify-between text-blue-600">
                          <span>Weekend Rate:</span>
                          <span>Applied</span>
                        </div>
                      )}
                      {pricingData.isHoliday && (
                        <div className="flex justify-between text-purple-600">
                          <span>Holiday Rate:</span>
                          <span>Applied</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Vehicle Number Plate */}
              <div>
                <label className="text-sm font-medium">Vehicle Number Plate</label>
                {vehicles.length > 0 ? (
                  <Select
                    value={bookingForm.numberPlate}
                    onValueChange={(value) => setBookingForm(prev => ({ ...prev, numberPlate: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((vehicle) => (
                        <SelectItem key={vehicle._id} value={vehicle.number_plate}>
                          {vehicle.number_plate} - {vehicle.vehicle_type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-sm text-gray-500 py-2">
                    No vehicles registered. Please add a vehicle in your account settings.
                  </div>
                )}
              </div>

              {/* Availability Status */}
              {selectedSpot && (() => {
                const spotId = selectedSpot.id || selectedSpot._id;
                const availability = spotAvailability[spotId];
                return availability && (
                  <div className={`p-3 rounded-lg ${
                    availability.isAvailable 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {availability.isAvailable ? (
                      <div>✅ Spot is available for selected time</div>
                    ) : (
                      <div>
                        <div className="font-semibold mb-2">
                          ❌ Spot is not available ({availability.conflictCount} confirmed booking{availability.conflictCount > 1 ? 's' : ''})
                        </div>
                        {availability.conflicts && availability.conflicts.length > 0 && (
                          <div className="text-sm space-y-1 mt-2">
                            <div className="font-medium">Conflicting confirmed bookings:</div>
                            {availability.conflicts.map((conflict, idx) => (
                              <div key={idx} className="pl-2 border-l-2 border-red-400">
                                <div>{conflict.startTime.toLocaleString('en-US', { 
                                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                })} - {conflict.endTime.toLocaleString('en-US', { 
                                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                })}</div>
                                <div className="text-xs opacity-75">Status: {conflict.status}</div>
                              </div>
                            ))}
                            <div className="text-xs mt-2 opacity-75">
                              💡 Please select a different time slot to avoid conflicts
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedSpot(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateBooking} 
                  disabled={(() => {
                    if (bookingLoading || availabilityLoading || !bookingForm.numberPlate) {
                      return true;
                    }
                    if (selectedSpot) {
                      const spotId = selectedSpot.id || selectedSpot._id;
                      const availability = spotAvailability[spotId];
                      if (availability && !availability.isAvailable) {
                        return true;
                      }
                    }
                    return false;
                  })()}
                  className="flex-1"
                >
                  {bookingLoading ? 'Creating...' : 'Confirm Booking'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* My Bookings Section */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            My Bookings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MyBookingsTable token={token} userId={user?.id} />
        </CardContent>
      </Card>

    </div>
  );
}

// My Bookings Table Component
function MyBookingsTable({ token, userId }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: 'start_time', direction: 'desc' });

  useEffect(() => {
    if (token && userId) {
      fetchMyBookings();
    }
  }, [token, userId]);

  const fetchMyBookings = async () => {
    try {
      setLoading(true);
      const response = await bookingsAPI.getBookings(token, { user_id: userId });
      if (response.success) {
        const bookingsData = response.data?.data || response.data || [];
        setBookings(Array.isArray(bookingsData) ? bookingsData : []);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortedAndFilteredBookings = () => {
    let filtered = bookings.filter(booking => {
      const searchLower = searchTerm.toLowerCase();
      return (
        (booking.zone_name || '').toLowerCase().includes(searchLower) ||
        (booking.spot_name || '').toLowerCase().includes(searchLower) ||
        (booking.booking_status || '').toLowerCase().includes(searchLower) ||
        (booking.number_plate || '').toLowerCase().includes(searchLower)
      );
    });

    return filtered.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (sortConfig.key === 'start_time' || sortConfig.key === 'end_time') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Confirmed': return 'bg-green-100 text-green-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      case 'Completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    try {
      const response = await bookingsAPI.updateBooking(token, bookingId, { booking_status: 'Cancelled' });
      if (response.success) {
        toast.success('Booking cancelled successfully');
        fetchMyBookings();
      } else {
        toast.error('Failed to cancel booking');
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error('Failed to cancel booking');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading bookings...</div>;
  }

  const sortedFilteredBookings = getSortedAndFilteredBookings();

  return (
    <div>
      {/* Search Bar */}
      <div className="mb-4">
        <Input
          type="text"
          placeholder="Search by zone, spot, status, or vehicle..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('zone_name')}
              >
                Zone {sortConfig.key === 'zone_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('spot_name')}
              >
                Spot {sortConfig.key === 'spot_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('start_time')}
              >
                Start Time {sortConfig.key === 'start_time' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('end_time')}
              >
                End Time {sortConfig.key === 'end_time' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Vehicle</th>
              <th 
                className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('amount')}
              >
                Amount {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('booking_status')}
              >
                Status {sortConfig.key === 'booking_status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedFilteredBookings.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-8 text-gray-500">
                  {searchTerm ? 'No bookings found matching your search' : 'No bookings yet. Create your first booking above!'}
                </td>
              </tr>
            ) : (
              sortedFilteredBookings.map((booking) => (
                <tr key={booking.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{booking.zone_name || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm">{booking.spot_name || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm">
                    {new Date(booking.start_time).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {new Date(booking.end_time).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="px-4 py-3 text-sm">{booking.number_plate || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm font-semibold">
                    ₹{parseFloat(booking.amount || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={getStatusBadgeClass(booking.booking_status)}>
                      {booking.booking_status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {(booking.booking_status === 'Pending' || booking.booking_status === 'Confirmed') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelBooking(booking.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Cancel
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      {sortedFilteredBookings.length > 0 && (
        <div className="mt-4 text-sm text-gray-600">
          Showing {sortedFilteredBookings.length} of {bookings.length} booking{bookings.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
