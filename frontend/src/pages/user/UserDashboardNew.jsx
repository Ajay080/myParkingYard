import { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { bookingsAPI, zonesAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Calendar,
  Clock,
  IndianRupee,
  Car,
  MapPin,
  TrendingUp,
  Award
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

export default function UserDashboard() {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [allBookings, setAllBookings] = useState([]); // Store all bookings for filtering
  const [zones, setZones] = useState([]);
  const [timeRange, setTimeRange] = useState('all'); // all, week, month, year, custom
  const [selectedZone, setSelectedZone] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [stats, setStats] = useState({
    totalBookings: 0,
    totalSpent: 0,
    activeBookings: 0,
    favoriteZone: ''
  });
  
  const navigate = useNavigate();

  useEffect(() => {
    if (token && user) {
      fetchDashboardData();
    }
  }, [token, user]);

  useEffect(() => {
    if (allBookings.length > 0 && timeRange !== 'custom') {
      applyFilters();
    }
  }, [timeRange, selectedZone, allBookings]);

  useEffect(() => {
    if (timeRange === 'custom' && fromDate && toDate && allBookings.length > 0) {
      applyFilters();
    }
  }, [fromDate, toDate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch user's bookings - filter by current user ID ONLY
      const bookingsResponse = await bookingsAPI.getBookings(token, { user_id: user.id });
      if (bookingsResponse.success) {
        const fetchedBookings = bookingsResponse.data?.data || bookingsResponse.data || [];
        // Double-check to ensure we only get the current user's bookings
        const userBookings = fetchedBookings.filter(booking => 
          (booking.user_id === user.id || booking.userId === user.id)
        );
        setAllBookings(userBookings); // Store all bookings for filtering
      }

      // Fetch zones
      const zonesResponse = await zonesAPI.getZones(token);
      if (zonesResponse.success) {
        const zonesData = zonesResponse.data?.data || zonesResponse.data || [];
        setZones(Array.isArray(zonesData) ? zonesData : []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...allBookings];

    // Apply time range filter
    if (timeRange === 'custom') {
      if (!fromDate || !toDate) return;
      const startDate = new Date(fromDate);
      const endDate = new Date(toDate);
      
      filtered = filtered.filter(booking => {
        const bookingDate = new Date(booking.created_at || booking.start_time);
        return bookingDate >= startDate && bookingDate <= endDate;
      });
    } else if (timeRange !== 'all') {
      const endDate = new Date();
      const startDate = new Date();
      
      if (timeRange === 'week') {
        startDate.setDate(endDate.getDate() - 7);
      } else if (timeRange === 'month') {
        startDate.setMonth(endDate.getMonth() - 1);
      } else if (timeRange === 'year') {
        startDate.setFullYear(endDate.getFullYear() - 1);
      }

      filtered = filtered.filter(booking => {
        const bookingDate = new Date(booking.created_at || booking.start_time);
        return bookingDate >= startDate && bookingDate <= endDate;
      });
    }

    // Apply zone filter
    if (selectedZone !== 'all') {
      filtered = filtered.filter(booking => 
        (booking.zone_id === selectedZone || booking.zoneId === selectedZone)
      );
    }

    setBookings(filtered);

    // Recalculate stats based on filtered data
    const totalSpent = filtered.reduce((sum, booking) => 
      sum + (parseFloat(booking.amount || booking.total_price || booking.total_amount) || 0), 0
    );
    
    const activeBookings = filtered.filter(b => 
      b.booking_status === 'Confirmed' || b.booking_status === 'Pending'
    ).length;
    
    // Find favorite zone from filtered data
    const zoneCounts = {};
    filtered.forEach(booking => {
      const zoneName = booking.zone_name || 'Unknown';
      zoneCounts[zoneName] = (zoneCounts[zoneName] || 0) + 1;
    });
    
    const favoriteZone = Object.keys(zoneCounts).length > 0 
      ? Object.keys(zoneCounts).reduce((a, b) => zoneCounts[a] > zoneCounts[b] ? a : b, 'None')
      : 'None';
    
    setStats({
      totalBookings: filtered.length,
      totalSpent,
      activeBookings,
      favoriteZone
    });
  };

  // Spending Trend Chart
  const getSpendingTrendOption = () => {
    // Group bookings by month
    const monthlySpending = {};
    bookings.forEach(booking => {
      if (booking.created_at) {
        const month = new Date(booking.created_at).toLocaleDateString('en-IN', { 
          year: 'numeric', 
          month: 'short' 
        });
        monthlySpending[month] = (monthlySpending[month] || 0) + (parseFloat(booking.amount || booking.total_price) || 0);
      }
    });

    const sortedMonths = Object.keys(monthlySpending).sort((a, b) => 
      new Date(a) - new Date(b)
    ).slice(-6); // Last 6 months

    return {
      title: {
        text: 'Your Spending Trend',
        left: 'center',
        textStyle: { color: '#374151', fontSize: 18, fontWeight: 600 }
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          const data = params[0];
          return `${data.name}<br/>Spent: ₹${data.value.toLocaleString('en-IN')}`;
        }
      },
      grid: { left: '3%', right: '4%', bottom: '10%', top: '15%', containLabel: true },
      xAxis: {
        type: 'category',
        data: sortedMonths,
        axisLine: { lineStyle: { color: '#E5E7EB' } },
        axisLabel: { color: '#6B7280' }
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#E5E7EB' } },
        axisLabel: { 
          color: '#6B7280',
          formatter: (value) => `₹${value}`
        },
        splitLine: { lineStyle: { color: '#F3F4F6', type: 'dashed' } }
      },
      series: [{
        data: sortedMonths.map(month => monthlySpending[month]),
        type: 'line',
        smooth: true,
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59, 130, 246, 0.4)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.05)' }
            ]
          }
        },
        lineStyle: { color: '#3B82F6', width: 3 },
        itemStyle: { color: '#3B82F6' }
      }]
    };
  };

  // Booking by Zone Chart
  const getZoneBookingsOption = () => {
    const zoneBookings = {};
    bookings.forEach(booking => {
      const zoneName = booking.zone_name || 'Unknown';
      zoneBookings[zoneName] = (zoneBookings[zoneName] || 0) + 1;
    });

    const data = Object.entries(zoneBookings)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const colors = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#22C55E'];

    return {
      title: {
        text: 'Favorite Zones',
        left: 'center',
        textStyle: { color: '#374151', fontSize: 18, fontWeight: 600 }
      },
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} bookings ({d}%)'
      },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          label: {
            show: true,
            formatter: '{b}: {c}'
          },
          emphasis: {
            label: { show: true, fontSize: '14', fontWeight: 'bold' }
          },
          data: data.map((item, index) => ({
            ...item,
            itemStyle: { color: colors[index] }
          }))
        }
      ]
    };
  };

  // Booking Status Distribution
  const getBookingStatusOption = () => {
    const statusCounts = {
      Confirmed: 0,
      Pending: 0,
      Cancelled: 0,
      Completed: 0
    };

    bookings.forEach(booking => {
      const status = booking.booking_status || 'Pending';
      if (statusCounts.hasOwnProperty(status)) {
        statusCounts[status]++;
      }
    });

    return {
      title: {
        text: 'Booking Status',
        left: 'center',
        textStyle: { color: '#374151', fontSize: 18, fontWeight: 600 }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      grid: { left: '3%', right: '4%', bottom: '10%', top: '15%', containLabel: true },
      xAxis: {
        type: 'category',
        data: Object.keys(statusCounts),
        axisLine: { lineStyle: { color: '#E5E7EB' } },
        axisLabel: { color: '#6B7280' }
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#E5E7EB' } },
        axisLabel: { color: '#6B7280' },
        splitLine: { lineStyle: { color: '#F3F4F6', type: 'dashed' } }
      },
      series: [{
        data: Object.values(statusCounts),
        type: 'bar',
        barWidth: '50%',
        itemStyle: {
          color: (params) => {
            const colors = {
              0: '#22C55E', // Confirmed
              1: '#F59E0B', // Pending
              2: '#EF4444', // Cancelled
              3: '#3B82F6'  // Completed
            };
            return colors[params.dataIndex];
          },
          borderRadius: [8, 8, 0, 0]
        }
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
        <h1 className="text-3xl font-bold text-gray-800 mb-2">My Dashboard</h1>
        <p className="text-gray-600">Welcome back, {user?.name}! Here's your personal parking activity</p>
      </div>

      {/* Filters Section */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-start">
            {/* Time Range Filter */}
            <div className="flex-1 min-w-[250px]">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Time Range</label>
              <div className="flex gap-2 flex-wrap">
                {['all', 'week', 'month', 'year', 'custom'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      timeRange === range
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {range === 'all' ? 'All Time' : range.charAt(0).toUpperCase() + range.slice(1)}
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
        {/* Total Bookings */}
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm mb-1">Total Bookings</p>
                <h3 className="text-3xl font-bold">{stats.totalBookings}</h3>
                <p className="text-blue-100 text-xs mt-2">All time</p>
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <Calendar className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Spent */}
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm mb-1">Total Spent</p>
                <h3 className="text-3xl font-bold">₹{stats.totalSpent.toLocaleString('en-IN')}</h3>
                <p className="text-green-100 text-xs mt-2 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  <span>Lifetime</span>
                </p>
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <IndianRupee className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Bookings */}
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm mb-1">Active Bookings</p>
                <h3 className="text-3xl font-bold">{stats.activeBookings}</h3>
                <p className="text-purple-100 text-xs mt-2">Currently active</p>
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <Car className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Favorite Zone */}
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm mb-1">Favorite Zone</p>
                <h3 className="text-2xl font-bold truncate">{stats.favoriteZone}</h3>
                <p className="text-orange-100 text-xs mt-2 flex items-center gap-1">
                  <Award className="h-3 w-3" />
                  <span>Most visited</span>
                </p>
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <MapPin className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Spending Trend */}
        <Card>
          <CardContent className="pt-6">
            <ReactECharts option={getSpendingTrendOption()} style={{ height: '300px' }} />
          </CardContent>
        </Card>

        {/* Favorite Zones */}
        <Card>
          <CardContent className="pt-6">
            <ReactECharts option={getZoneBookingsOption()} style={{ height: '300px' }} />
          </CardContent>
        </Card>
      </div>

      {/* Booking Status Chart */}
      <div className="mb-6">
        <Card>
          <CardContent className="pt-6">
            <ReactECharts option={getBookingStatusOption()} style={{ height: '300px' }} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
