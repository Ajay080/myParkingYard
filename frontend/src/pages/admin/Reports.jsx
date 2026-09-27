import React, { useState, useEffect } from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { bookingsAPI, zonesAPI } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "react-toastify";
import { RefreshCw } from "lucide-react";

const Reports = () => {
  const { token, user } = useAuth();
  
  // Check authentication
  if (!token) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">Please log in to view reports.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Set default date range to last 30 days
  const getDefaultDates = () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    return {
      from: thirtyDaysAgo.toISOString().slice(0, 16),
      to: now.toISOString().slice(0, 16)
    };
  };

  const defaultDates = getDefaultDates();
  const [from, setFrom] = useState(defaultDates.from);
  const [to, setTo] = useState(defaultDates.to);
  const [loading, setLoading] = useState(false);
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState("all");
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({
    totalBookings: 0,
    totalRevenue: 0,
    avgDuration: 0,
    zoneStats: {},
    revenueByDate: {},
    bookingsByDate: {},
    hourStats: {},
    spotStats: {},
    topUsers: [],
  });

  // Fetch zones on mount
  useEffect(() => {
    if (token) {
      fetchZones();
    }
  }, [token]);

  const fetchZones = async () => {
    try {
      const response = await zonesAPI.getZones(token);
      if (response.success) {
        setZones(response.data?.data || response.data || []);
      } else {
        toast.error("Failed to fetch zones");
      }
    } catch (error) {
      console.error("Error fetching zones:", error);
      toast.error("Failed to load zones");
    }
  };

  // Fetch report data when filters change
  useEffect(() => {
    if (token) {
      fetchReportData();
    }
  }, [token, from, to, selectedZone]);

  const fetchReportData = async () => {
    if (!token) {
      return;
    }

    try {
      setLoading(true);
      
      const params = {};

      // Only add zone filter if a specific zone is selected
      if (selectedZone !== "all") {
        params.zone_id = selectedZone;
      }

      // Fetch all bookings (with zone filter if selected)
      const response = await bookingsAPI.getBookings(token, params);
      
      if (response.success) {
        const allBookings = response.data?.data || response.data || [];
        
        // Filter for CONFIRMED bookings only within the date range
        const fromDate = new Date(from);
        const toDate = new Date(to);
        
        const filteredBookings = allBookings.filter(booking => {
          const bookingDate = new Date(booking.created_at || booking.start_time);
          const isConfirmed = (booking.booking_status || '').toLowerCase() === 'confirmed';
          const inDateRange = bookingDate >= fromDate && bookingDate <= toDate;
          
          return isConfirmed && inDateRange;
        });
        
        console.log(`Total bookings: ${allBookings.length}, Confirmed in range: ${filteredBookings.length}`);
        setBookings(filteredBookings);
        calculateStats(filteredBookings);
      } else {
        toast.error("Failed to load bookings");
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast.error("Failed to load report data");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (filteredBookings) => {
    // Calculate all stats from confirmed bookings
    const totalBookings = filteredBookings.length;
    const totalRevenue = filteredBookings.reduce((sum, b) => 
      sum + parseFloat(b.amount || b.total_amount || 0), 0
    );

    // Calculate average duration in minutes
    let totalDuration = 0;
    filteredBookings.forEach(booking => {
      const start = new Date(booking.start_time);
      const end = new Date(booking.end_time);
      const duration = (end - start) / (1000 * 60); // minutes
      totalDuration += duration;
    });
    const avgDuration = totalBookings > 0 ? Math.round(totalDuration / totalBookings) : 0;

    // Zone-wise bookings count
    const zoneStats = {};
    filteredBookings.forEach(booking => {
      const zoneName = booking.zone_name || 'Unknown';
      zoneStats[zoneName] = (zoneStats[zoneName] || 0) + 1;
    });

    // Revenue by date
    const revenueByDate = {};
    filteredBookings.forEach(booking => {
      const date = new Date(booking.created_at || booking.start_time).toISOString().split('T')[0];
      const amount = parseFloat(booking.amount || booking.total_amount || 0);
      revenueByDate[date] = (revenueByDate[date] || 0) + amount;
    });

    // Bookings by date
    const bookingsByDate = {};
    filteredBookings.forEach(booking => {
      const date = new Date(booking.created_at || booking.start_time).toISOString().split('T')[0];
      bookingsByDate[date] = (bookingsByDate[date] || 0) + 1;
    });

    // Bookings by hour of day
    const hourStats = {};
    filteredBookings.forEach(booking => {
      const hour = new Date(booking.start_time).getHours();
      const hourLabel = `${hour.toString().padStart(2, '0')}:00`;
      hourStats[hourLabel] = (hourStats[hourLabel] || 0) + 1;
    });

    // Spot utilization
    const spotStats = {};
    filteredBookings.forEach(booking => {
      const spotName = booking.spot_name || 'Unknown';
      spotStats[spotName] = (spotStats[spotName] || 0) + 1;
    });

    // Top users
    const userCounts = {};
    filteredBookings.forEach(booking => {
      const userName = booking.user_name || booking.user_email || 'Unknown';
      userCounts[userName] = (userCounts[userName] || 0) + 1;
    });
    const topUsers = Object.entries(userCounts)
      .map(([user, count]) => ({ user, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    setStats({
      totalBookings,
      totalRevenue,
      avgDuration,
      zoneStats,
      revenueByDate,
      bookingsByDate,
      hourStats,
      spotStats,
      topUsers,
    });
  };

  // Chart options using calculated stats
  const bookingsByDateOption = {
    title: { 
      text: 'Confirmed Bookings Over Time',
      left: 'center',
      textStyle: { color: '#374151', fontSize: 16, fontWeight: 600 }
    },
    tooltip: { 
      trigger: 'axis',
      formatter: (params) => {
        const data = params[0];
        return `${data.name}<br/>Bookings: ${data.value}`;
      }
    },
    grid: { left: '3%', right: '4%', bottom: '10%', top: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      data: Object.keys(stats.bookingsByDate || {}).sort(),
      axisLabel: { rotate: 45, color: '#6B7280' }
    },
    yAxis: { type: 'value', axisLabel: { color: '#6B7280' } },
    series: [{
      name: 'Bookings',
      type: 'line',
      data: Object.keys(stats.bookingsByDate || {}).sort().map(date => stats.bookingsByDate[date]),
      smooth: true,
      itemStyle: { color: '#3B82F6' },
      areaStyle: { color: 'rgba(59, 130, 246, 0.1)' }
    }]
  };

  const zoneStatsOption = {
    title: { 
      text: 'Zone-wise Confirmed Bookings',
      left: 'center',
      textStyle: { color: '#374151', fontSize: 16, fontWeight: 600 }
    },
    tooltip: { 
      trigger: 'axis',
      formatter: (params) => {
        const data = params[0];
        return `${data.name}<br/>Bookings: ${data.value}`;
      }
    },
    grid: { left: '3%', right: '4%', bottom: '10%', top: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      data: Object.keys(stats.zoneStats || {}),
      axisLabel: { color: '#6B7280' }
    },
    yAxis: { type: 'value', axisLabel: { color: '#6B7280' } },
    series: [{
      data: Object.values(stats.zoneStats || {}),
      type: 'bar',
      itemStyle: { 
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: '#3B82F6' },
            { offset: 1, color: '#60A5FA' }
          ]
        },
        borderRadius: [8, 8, 0, 0]
      }
    }]
  };

  const revenueByDateOption = {
    title: { 
      text: 'Revenue from Confirmed Bookings',
      left: 'center',
      textStyle: { color: '#374151', fontSize: 16, fontWeight: 600 }
    },
    tooltip: { 
      trigger: 'axis',
      formatter: (params) => {
        const data = params[0];
        return `${data.name}<br/>Revenue: ₹${data.value.toLocaleString('en-IN')}`;
      }
    },
    grid: { left: '3%', right: '4%', bottom: '10%', top: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      data: Object.keys(stats.revenueByDate || {}).sort(),
      axisLabel: { rotate: 45, color: '#6B7280' }
    },
    yAxis: { 
      type: 'value',
      axisLabel: { 
        color: '#6B7280',
        formatter: (value) => `₹${value.toLocaleString('en-IN')}`
      }
    },
    series: [{
      name: 'Revenue',
      type: 'bar',
      data: Object.keys(stats.revenueByDate || {}).sort().map(date => stats.revenueByDate[date]),
      itemStyle: { 
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: '#10B981' },
            { offset: 1, color: '#34D399' }
          ]
        },
        borderRadius: [8, 8, 0, 0]
      }
    }]
  };

  const peakHoursOption = {
    title: { 
      text: 'Peak Booking Hours (Confirmed)',
      left: 'center',
      textStyle: { color: '#374151', fontSize: 16, fontWeight: 600 }
    },
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '10%', top: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      data: Object.keys(stats.hourStats || {}).sort(),
      axisLabel: { color: '#6B7280' }
    },
    yAxis: { type: 'value', axisLabel: { color: '#6B7280' } },
    series: [{
      data: Object.keys(stats.hourStats || {}).sort().map(hour => stats.hourStats[hour]),
      type: 'bar',
      itemStyle: { color: '#EF4444', borderRadius: [8, 8, 0, 0] }
    }]
  };

  const spotUtilizationOption = {
    title: { 
      text: 'Spot Utilization (Confirmed)',
      left: 'center',
      textStyle: { color: '#374151', fontSize: 16, fontWeight: 600 }
    },
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '15%', top: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      data: Object.keys(stats.spotStats || {}),
      axisLabel: { rotate: 45, color: '#6B7280' }
    },
    yAxis: { type: 'value', axisLabel: { color: '#6B7280' } },
    series: [{
      data: Object.values(stats.spotStats || {}),
      type: 'bar',
      itemStyle: { color: '#8B5CF6', borderRadius: [8, 8, 0, 0] }
    }]
  };

  const topUsersOption = {
    title: { 
      text: 'Top 10 Users (Confirmed Bookings)',
      left: 'center',
      textStyle: { color: '#374151', fontSize: 16, fontWeight: 600 }
    },
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '15%', top: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      data: (stats.topUsers || []).map(u => u.user),
      axisLabel: { rotate: 45, color: '#6B7280' }
    },
    yAxis: { type: 'value', axisLabel: { color: '#6B7280' } },
    series: [{
      data: (stats.topUsers || []).map(u => u.count),
      type: 'bar',
      itemStyle: { color: '#F59E0B', borderRadius: [8, 8, 0, 0] }
    }]
  };

  // Check if we have any data to display
  const hasData = stats.totalBookings > 0;

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Analytics Report</CardTitle>
            <Button 
              onClick={fetchReportData} 
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="text-sm font-medium">From</label>
              <Input
                type="datetime-local"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">To</label>
              <Input
                type="datetime-local"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Zone Filter</label>
              <Select value={selectedZone} onValueChange={setSelectedZone}>
                <SelectTrigger className="min-w-[200px]">
                  <SelectValue placeholder="Select Zone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Zones</SelectItem>
                  {zones.map(zone => (
                    <SelectItem key={zone._id || zone.id} value={zone._id || zone.id}>
                      {zone.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Summary Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Total Confirmed Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {stats.totalBookings}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  ₹{stats.totalRevenue.toLocaleString('en-IN')}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Avg Booking Duration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  {stats.avgDuration} min
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  ({(stats.avgDuration / 60).toFixed(1)} hours)
                </div>
              </CardContent>
            </Card>
          </div>

          {loading ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading report data...</p>
            </div>
          ) : !hasData ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No data available for the selected period.</p>
              <p className="text-sm text-gray-500 mt-2">Try adjusting your date range or zone selection.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bookings Over Time */}
              <Card>
                <CardContent className="pt-6">
                  <ReactECharts option={bookingsByDateOption} style={{ height: "300px" }} />
                </CardContent>
              </Card>

              {/* Zone-wise Bookings */}
              <Card>
                <CardContent className="pt-6">
                  <ReactECharts option={zoneStatsOption} style={{ height: "300px" }} />
                </CardContent>
              </Card>

              {/* Revenue Over Time */}
              <Card>
                <CardContent className="pt-6">
                  <ReactECharts option={revenueByDateOption} style={{ height: "300px" }} />
                </CardContent>
              </Card>

              {/* Peak Hours */}
              <Card>
                <CardContent className="pt-6">
                  <ReactECharts option={peakHoursOption} style={{ height: "300px" }} />
                </CardContent>
              </Card>

              {/* Spot Utilization */}
              <Card>
                <CardContent className="pt-6">
                  <ReactECharts option={spotUtilizationOption} style={{ height: "300px" }} />
                </CardContent>
              </Card>

              {/* Top Users */}
              <Card>
                <CardContent className="pt-6">
                  <ReactECharts option={topUsersOption} style={{ height: "300px" }} />
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;