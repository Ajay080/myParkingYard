import { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { analyticsAPI, zonesAPI, bookingsAPI } from '../../services/api';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Car, 
  IndianRupee, 
  Calendar,
  Clock,
  ParkingCircle,
  BarChart3,
  Activity
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function DashboardNew() {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [bookingData, setBookingData] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [timeRange, setTimeRange] = useState('week'); // week, month, year, custom
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    fetchZones();
  }, []);

  useEffect(() => {
    if (timeRange !== 'custom') {
      fetchDashboardData();
    }
  }, [timeRange, selectedZone]);

  useEffect(() => {
    if (timeRange === 'custom' && fromDate && toDate) {
      fetchDashboardData();
    }
  }, [fromDate, toDate]);

  const fetchZones = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await zonesAPI.getZones(token);
      if (response.success) {
        const zonesData = response.data?.data || response.data || [];
        setZones(Array.isArray(zonesData) ? zonesData : []);
      }
    } catch (error) {
      console.error('Error fetching zones:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Get date range based on selection
      let startDate, endDate;
      
      if (timeRange === 'custom') {
        if (!fromDate || !toDate) return;
        startDate = new Date(fromDate);
        endDate = new Date(toDate);
      } else {
        endDate = new Date();
        startDate = new Date();
        
        if (timeRange === 'week') {
          startDate.setDate(endDate.getDate() - 7);
        } else if (timeRange === 'month') {
          startDate.setMonth(endDate.getMonth() - 1);
        } else {
          startDate.setFullYear(endDate.getFullYear() - 1);
        }
      }

      // Fetch dashboard summary (system-wide)
      const summaryResponse = await analyticsAPI.getDashboardSummary(token);
      console.log('Dashboard Summary Response:', summaryResponse);
      if (summaryResponse.success && summaryResponse.data) {
        setDashboardData(summaryResponse.data);
      }

      // Fetch bookings for chart data (with zone filter if selected)
      const bookingParams = {};
      if (selectedZone !== 'all') {
        bookingParams.zone_id = selectedZone;
      }
      
      const bookingsResponse = await bookingsAPI.getBookings(token, bookingParams);
      console.log('Bookings Response:', bookingsResponse);
      
      if (bookingsResponse.success) {
        const allBookings = bookingsResponse.data?.data || bookingsResponse.data || [];
        
        // Filter bookings by date range
        const filteredBookings = allBookings.filter(booking => {
          const bookingDate = new Date(booking.created_at || booking.start_time);
          return bookingDate >= startDate && bookingDate <= endDate;
        });

        // Store all bookings for additional visualizations
        setAllBookings(filteredBookings);

        // Calculate revenue by date
        const revenueByDate = {};
        const bookingsByDate = {};
        
        filteredBookings.forEach(booking => {
          const date = new Date(booking.created_at || booking.start_time).toISOString().split('T')[0];
          // Fix: Use 'amount' field as shown in the API response
          const amount = parseFloat(booking.amount || booking.total_amount || booking.totalAmount || 0);
          
          console.log(`Booking ${booking.id}: amount=${amount}`); // Debug log
          
          revenueByDate[date] = (revenueByDate[date] || 0) + amount;
          bookingsByDate[date] = (bookingsByDate[date] || 0) + 1;
        });
        
        console.log('Revenue by date:', revenueByDate); // Debug log

        const report = {
          revenue_by_date: revenueByDate,
          bookings_by_date: bookingsByDate
        };
        
        // Process revenue data
        if (report.revenue_by_date && Object.keys(report.revenue_by_date).length > 0) {
          const revenueChart = Object.entries(report.revenue_by_date).map(([date, revenue]) => ({
            date,
            revenue: parseFloat(revenue) || 0
          })).sort((a, b) => new Date(a.date) - new Date(b.date));
          setRevenueData(revenueChart);
        } else {
          setRevenueData([]);
        }

        // Process booking data
        if (report.bookings_by_date && Object.keys(report.bookings_by_date).length > 0) {
          const bookingChart = Object.entries(report.bookings_by_date).map(([date, count]) => ({
            date,
            count: parseInt(count) || 0
          })).sort((a, b) => new Date(a.date) - new Date(b.date));
          setBookingData(bookingChart);
        } else {
          setBookingData([]);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Revenue Trend Chart
  const getRevenueChartOption = () => ({
    title: {
      text: 'Revenue Trend',
      left: 'center',
      textStyle: { color: '#374151', fontSize: 18, fontWeight: 600 }
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
      data: revenueData.map(d => new Date(d.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })),
      axisLine: { lineStyle: { color: '#E5E7EB' } },
      axisLabel: { color: '#6B7280', rotate: 45 }
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#E5E7EB' } },
      axisLabel: { 
        color: '#6B7280',
        formatter: (value) => `₹${(value / 1000).toFixed(0)}K`
      },
      splitLine: { lineStyle: { color: '#F3F4F6', type: 'dashed' } }
    },
    series: [{
      data: revenueData.map(d => d.revenue),
      type: 'line',
      smooth: true,
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(34, 197, 94, 0.4)' },
            { offset: 1, color: 'rgba(34, 197, 94, 0.05)' }
          ]
        }
      },
      lineStyle: { color: '#22C55E', width: 3 },
      itemStyle: { color: '#22C55E' },
      emphasis: { focus: 'series' }
    }]
  });

  // Booking Trend Chart
  const getBookingChartOption = () => ({
    title: {
      text: 'Booking Trend',
      left: 'center',
      textStyle: { color: '#374151', fontSize: 18, fontWeight: 600 }
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
      data: bookingData.map(d => new Date(d.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })),
      axisLine: { lineStyle: { color: '#E5E7EB' } },
      axisLabel: { color: '#6B7280', rotate: 45 }
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#E5E7EB' } },
      axisLabel: { color: '#6B7280' },
      splitLine: { lineStyle: { color: '#F3F4F6', type: 'dashed' } }
    },
    series: [{
      data: bookingData.map(d => d.count),
      type: 'bar',
      barWidth: '60%',
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
      },
      emphasis: { itemStyle: { color: '#2563EB' } }
    }]
  });

  // Zone Performance Chart
  const getZonePerformanceOption = () => {
    if (!dashboardData?.zone_stats) return {};
    
    const zones = Object.keys(dashboardData.zone_stats);
    const bookings = zones.map(zone => dashboardData.zone_stats[zone].total_bookings || 0);
    const revenue = zones.map(zone => parseFloat(dashboardData.zone_stats[zone].total_revenue) || 0);

    return {
      title: {
        text: 'Zone Performance',
        left: 'center',
        textStyle: { color: '#374151', fontSize: 18, fontWeight: 600 }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      legend: {
        data: ['Bookings', 'Revenue (₹)'],
        bottom: 0,
        textStyle: { color: '#6B7280' }
      },
      grid: { left: '3%', right: '4%', bottom: '15%', top: '15%', containLabel: true },
      xAxis: {
        type: 'category',
        data: zones,
        axisLine: { lineStyle: { color: '#E5E7EB' } },
        axisLabel: { color: '#6B7280' }
      },
      yAxis: [
        {
          type: 'value',
          name: 'Bookings',
          axisLine: { lineStyle: { color: '#E5E7EB' } },
          axisLabel: { color: '#6B7280' },
          splitLine: { lineStyle: { color: '#F3F4F6', type: 'dashed' } }
        },
        {
          type: 'value',
          name: 'Revenue (₹)',
          axisLine: { lineStyle: { color: '#E5E7EB' } },
          axisLabel: { 
            color: '#6B7280',
            formatter: (value) => `₹${(value / 1000).toFixed(0)}K`
          },
          splitLine: { show: false }
        }
      ],
      series: [
        {
          name: 'Bookings',
          type: 'bar',
          data: bookings,
          itemStyle: { color: '#8B5CF6', borderRadius: [8, 8, 0, 0] }
        },
        {
          name: 'Revenue (₹)',
          type: 'line',
          yAxisIndex: 1,
          data: revenue,
          smooth: true,
          lineStyle: { color: '#EC4899', width: 3 },
          itemStyle: { color: '#EC4899' }
        }
      ]
    };
  };

  // Booking Status Pie Chart
  const getBookingStatusOption = () => {
    if (!dashboardData) return {};

    const data = [
      { value: dashboardData.total_confirmed || 0, name: 'Confirmed', itemStyle: { color: '#22C55E' } },
      { value: dashboardData.total_pending || 0, name: 'Pending', itemStyle: { color: '#F59E0B' } },
      { value: dashboardData.total_cancelled || 0, name: 'Cancelled', itemStyle: { color: '#EF4444' } },
      { value: dashboardData.total_completed || 0, name: 'Completed', itemStyle: { color: '#3B82F6' } }
    ];

    return {
      title: {
        text: 'Booking Status Distribution',
        left: 'center',
        textStyle: { color: '#374151', fontSize: 18, fontWeight: 600 }
      },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        right: '10%',
        top: 'center',
        textStyle: { color: '#6B7280' }
      },
      series: [
        {
          name: 'Bookings',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['40%', '50%'],
          avoidLabelOverlap: false,
          label: {
            show: true,
            formatter: '{b}: {c}'
          },
          emphasis: {
            label: { show: true, fontSize: '16', fontWeight: 'bold' }
          },
          data: data
        }
      ]
    };
  };

  // Occupancy Gauge
  const getOccupancyGaugeOption = () => {
    if (!dashboardData) return {};
    
    const occupancyRate = ((dashboardData.occupied_spots / dashboardData.total_spots) * 100) || 0;

    return {
      series: [
        {
          type: 'gauge',
          startAngle: 180,
          endAngle: 0,
          min: 0,
          max: 100,
          splitNumber: 10,
          itemStyle: {
            color: occupancyRate > 80 ? '#EF4444' : occupancyRate > 50 ? '#F59E0B' : '#22C55E'
          },
          progress: { show: true, width: 18 },
          pointer: {
            length: '60%',
            width: 6,
            offsetCenter: [0, '5%']
          },
          axisLine: {
            lineStyle: { width: 18, color: [[1, '#E5E7EB']] }
          },
          axisTick: { distance: -25, splitNumber: 5, lineStyle: { width: 2, color: '#999' } },
          splitLine: { distance: -30, length: 14, lineStyle: { width: 3, color: '#999' } },
          axisLabel: {
            distance: -15,
            color: '#999',
            fontSize: 14,
            formatter: (value) => value + '%'
          },
          title: {
            offsetCenter: [0, '80%'],
            fontSize: 18,
            color: '#374151',
            fontWeight: 600
          },
          detail: {
            fontSize: 32,
            offsetCenter: [0, '40%'],
            valueAnimation: true,
            formatter: (value) => Math.round(value) + '%',
            color: 'inherit'
          },
          data: [{ value: occupancyRate, name: 'Occupancy Rate' }]
        }
      ]
    };
  };

  // Booking Status Distribution (Pie Chart from actual bookings)
  const getBookingStatusPieOption = () => {
    const statusCounts = {
      'Confirmed': 0,
      'Pending': 0,
      'Cancelled': 0,
      'Completed': 0
    };

    allBookings.forEach(booking => {
      const status = booking.booking_status || 'Pending';
      if (statusCounts[status] !== undefined) {
        statusCounts[status]++;
      }
    });

    const data = [
      { value: statusCounts.Confirmed, name: 'Confirmed', itemStyle: { color: '#22C55E' } },
      { value: statusCounts.Pending, name: 'Pending', itemStyle: { color: '#F59E0B' } },
      { value: statusCounts.Cancelled, name: 'Cancelled', itemStyle: { color: '#EF4444' } },
      { value: statusCounts.Completed, name: 'Completed', itemStyle: { color: '#3B82F6' } }
    ].filter(item => item.value > 0);

    return {
      title: {
        text: 'Booking Status Distribution',
        left: 'center',
        textStyle: { color: '#374151', fontSize: 18, fontWeight: 600 }
      },
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        left: 'left',
        textStyle: { color: '#6B7280' }
      },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: true,
          formatter: '{b}: {c}'
        },
        emphasis: {
          label: { show: true, fontSize: '16', fontWeight: 'bold' }
        },
        data: data
      }]
    };
  };

  // Revenue by Zone (Bar Chart)
  const getRevenueByZoneOption = () => {
    const zoneRevenue = {};
    
    allBookings.forEach(booking => {
      const zoneName = booking.zone_name || 'Unknown';
      const amount = parseFloat(booking.amount || 0);
      zoneRevenue[zoneName] = (zoneRevenue[zoneName] || 0) + amount;
    });

    const zones = Object.keys(zoneRevenue);
    const revenues = Object.values(zoneRevenue);

    return {
      title: {
        text: 'Revenue by Zone',
        left: 'center',
        textStyle: { color: '#374151', fontSize: 18, fontWeight: 600 }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          const data = params[0];
          return `${data.name}<br/>Revenue: ₹${data.value.toLocaleString('en-IN')}`;
        }
      },
      grid: { left: '3%', right: '4%', bottom: '10%', top: '15%', containLabel: true },
      xAxis: {
        type: 'category',
        data: zones,
        axisLine: { lineStyle: { color: '#E5E7EB' } },
        axisLabel: { color: '#6B7280' }
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#E5E7EB' } },
        axisLabel: { 
          color: '#6B7280',
          formatter: (value) => `₹${value.toLocaleString('en-IN')}`
        },
        splitLine: { lineStyle: { color: '#F3F4F6', type: 'dashed' } }
      },
      series: [{
        data: revenues,
        type: 'bar',
        barWidth: '50%',
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
  };

  // Bookings by Zone (Doughnut Chart)
  const getBookingsByZoneOption = () => {
    const zoneCounts = {};
    
    allBookings.forEach(booking => {
      const zoneName = booking.zone_name || 'Unknown';
      zoneCounts[zoneName] = (zoneCounts[zoneName] || 0) + 1;
    });

    const data = Object.entries(zoneCounts).map(([name, value], index) => ({
      value,
      name,
      itemStyle: {
        color: ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981'][index % 5]
      }
    }));

    return {
      title: {
        text: 'Bookings by Zone',
        left: 'center',
        textStyle: { color: '#374151', fontSize: 18, fontWeight: 600 }
      },
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} bookings ({d}%)'
      },
      legend: {
        orient: 'vertical',
        right: 'right',
        textStyle: { color: '#6B7280' }
      },
      series: [{
        type: 'pie',
        radius: ['50%', '70%'],
        center: ['40%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: true,
          formatter: '{b}: {c}'
        },
        emphasis: {
          label: { show: true, fontSize: '16', fontWeight: 'bold' }
        },
        data: data
      }]
    };
  };

  // Average Revenue per Booking
  const getAvgRevenueOption = () => {
    const totalRevenue = allBookings.reduce((sum, b) => sum + parseFloat(b.amount || 0), 0);
    const avgRevenue = allBookings.length > 0 ? totalRevenue / allBookings.length : 0;

    return {
      title: {
        text: 'Total & Average Revenue',
        left: 'center',
        textStyle: { color: '#374151', fontSize: 18, fontWeight: 600 }
      },
      tooltip: {
        formatter: '{b}: ₹{c}'
      },
      series: [{
        type: 'gauge',
        progress: {
          show: true,
          width: 18
        },
        axisLine: {
          lineStyle: {
            width: 18,
            color: [[1, '#E5E7EB']]
          }
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        anchor: { show: false },
        title: { show: false },
        detail: {
          valueAnimation: true,
          fontSize: 20,
          offsetCenter: [0, '0%'],
          formatter: (value) => {
            return `₹${totalRevenue.toLocaleString('en-IN')}\n\nTotal Revenue\n\n₹${avgRevenue.toFixed(2)}\nAverage/Booking`;
          },
          color: '#374151'
        },
        data: [{ value: 100 }]
      }]
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Admin Dashboard Overview</h1>
        <p className="text-gray-600">System-wide analytics and insights for all bookings and zones</p>
      </div>

      {/* Filters Section */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-start">
            {/* Time Range Filter */}
            <div className="flex-1 min-w-[250px]">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Time Range</label>
              <div className="flex gap-2 flex-wrap">
                {['week', 'month', 'year', 'custom'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      timeRange === range
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {range.charAt(0).toUpperCase() + range.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date Range */}
            {timeRange === 'custom' && (
              <>
                <div className="flex-1 min-w-[150px]">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">From Date</label>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">To Date</label>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full"
                  />
                </div>
              </>
            )}

            {/* Zone Filter */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Filter by Zone</label>
              <Select value={selectedZone} onValueChange={setSelectedZone}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select zone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Zones</SelectItem>
                  {zones.map((zone) => (
                    <SelectItem key={zone._id || zone.id} value={zone._id || zone.id}>
                      {zone.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Total Zones */}
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm mb-1">Total Zones</p>
                <h3 className="text-3xl font-bold">
                  {dashboardData?.totalZones || 0}
                </h3>
                <p className="text-green-100 text-xs mt-2 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  <span>Parking zones</span>
                </p>
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <ParkingCircle className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Spots */}
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm mb-1">Total Spots</p>
                <h3 className="text-3xl font-bold">{dashboardData?.totalSpots || 0}</h3>
                <p className="text-blue-100 text-xs mt-2 flex items-center gap-1">
                  <Car className="h-3 w-3" />
                  <span>Parking spots</span>
                </p>
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <Car className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Available Spots */}
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm mb-1">Available Spots</p>
                <h3 className="text-3xl font-bold">{dashboardData?.availableSpots || 0}</h3>
                <p className="text-purple-100 text-xs mt-2 flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  <span>Ready to book</span>
                </p>
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <BarChart3 className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Bookings */}
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm mb-1">Pending Bookings</p>
                <h3 className="text-3xl font-bold">
                  {dashboardData?.pendingBookings || 0}
                </h3>
                <p className="text-orange-100 text-xs mt-2 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>Need approval</span>
                </p>
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <Calendar className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts Grid - Revenue & Bookings Trend */}
      {(revenueData.length > 0 || bookingData.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Revenue Trend */}
          {revenueData.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <ReactECharts option={getRevenueChartOption()} style={{ height: '350px' }} />
              </CardContent>
            </Card>
          )}

          {/* Booking Trend */}
          {bookingData.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <ReactECharts option={getBookingChartOption()} style={{ height: '350px' }} />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Additional Visualizations Grid */}
      {allBookings.length > 0 && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Booking Status Distribution */}
            <Card>
              <CardContent className="pt-6">
                <ReactECharts option={getBookingStatusPieOption()} style={{ height: '350px' }} />
              </CardContent>
            </Card>

            {/* Bookings by Zone */}
            <Card>
              <CardContent className="pt-6">
                <ReactECharts option={getBookingsByZoneOption()} style={{ height: '350px' }} />
              </CardContent>
            </Card>

            {/* Revenue Summary */}
            <Card>
              <CardContent className="pt-6">
                <ReactECharts option={getAvgRevenueOption()} style={{ height: '350px' }} />
              </CardContent>
            </Card>
          </div>

          {/* Revenue by Zone - Full Width */}
          <div className="mb-6">
            <Card>
              <CardContent className="pt-6">
                <ReactECharts option={getRevenueByZoneOption()} style={{ height: '400px' }} />
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Info message when no booking data */}
      {allBookings.length === 0 && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Booking Data Yet</h3>
              <p className="text-gray-500">Charts will appear once bookings are created in the selected time range</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
