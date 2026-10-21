import { motion } from "framer-motion";
import { TrendingUp, Clock, FileText, IndianRupee } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import Card from "../../components/ui/Card";
import { useMemo, useState } from "react";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-surface border border-border rounded-xl px-4 py-3 shadow-modal">
      <p className="text-xs font-semibold text-text-primary mb-2">{label}</p>
      {payload.map((point) => (
        <p key={point.dataKey} className="text-xs" style={{ color: point.color }}>
          {point.name}: {point.dataKey === "revenue" ? `₹${point.value}` : point.value}
        </p>
      ))}
    </div>
  );
};

const AnalyticsPage = ({ activeChart, setActiveChart, liveAnalytics, bookings = [] }) => {
  const [visitorTimeframe, setVisitorTimeframe] = useState("days");

  const visitorTrendsData = useMemo(() => {
    if (visitorTimeframe === "days") {
      return [
        { name: "Mon", Visitors: 120, Registrations: 45 },
        { name: "Tue", Visitors: 150, Registrations: 52 },
        { name: "Wed", Visitors: 180, Registrations: 61 },
        { name: "Thu", Visitors: 130, Registrations: 40 },
        { name: "Fri", Visitors: 190, Registrations: 70 },
        { name: "Sat", Visitors: 210, Registrations: 85 },
        { name: "Sun", Visitors: 170, Registrations: 50 },
      ];
    } else {
      return [
        { name: "Jun", Visitors: 3200, Registrations: 950 },
        { name: "Jul", Visitors: 4100, Registrations: 1200 },
        { name: "Aug", Visitors: 3800, Registrations: 1100 },
      ];
    }
  }, [visitorTimeframe]);

  const [revenueTimeframe, setRevenueTimeframe] = useState("6months");

  const chartData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const currentMonth = now.getMonth();
    const result = [];
    const count = revenueTimeframe === "12months" ? 11 : 5;
    
    for (let i = count; i >= 0; i--) {
      let m = currentMonth - i;
      while (m < 0) m += 12;
      result.push({ month: months[m], revenue: 0, mOffset: i });
    }

    if (Array.isArray(bookings)) {
      bookings.forEach((b) => {
        if (!b.createdAt) return;
        const d = new Date(b.createdAt);
        const diffMonths = (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth();
        if (diffMonths >= 0 && diffMonths <= count) {
          const bucket = result.find((r) => r.mOffset === diffMonths);
          if (bucket) {
            const isPaid = b?.paymentStatus === "completed" || b?.isPaid === true;
            if (isPaid) {
              bucket.revenue += Number(b?.fee || 0);
            }
          }
        }
      });
    }
    
    return result;
  }, [bookings, revenueTimeframe]);

  const pieData = useMemo(() => {
    return [
      { name: "Pending", value: liveAnalytics?.statusCounts?.pending || 0, color: "#f472b6" },
      { name: "Under Review", value: liveAnalytics?.statusCounts?.review || 0, color: "#60a5fa" },
      { name: "Submitted", value: liveAnalytics?.statusCounts?.submitted || 0, color: "#22d3ee" },
      { name: "Approved", value: liveAnalytics?.statusCounts?.approved || 0, color: "#34d399" },
      { name: "Rejected", value: liveAnalytics?.statusCounts?.rejected || 0, color: "#f87171" },
    ];
  }, [liveAnalytics]);

  const totalPie = liveAnalytics?.total || 0;

  const recentBookings = useMemo(() => {
    if (!Array.isArray(bookings)) return [];
    return [...bookings]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .reverse()
      .slice(0, 5);
  }, [bookings]);

  const dailyApplications = useMemo(() => {
    if (!Array.isArray(bookings)) return [];
    
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return {
        date: d.toLocaleDateString('en-US', { weekday: 'short' }),
        fullDate: d.toDateString(),
        count: 0
      };
    }).reverse();

    bookings.forEach(b => {
      if (!b.createdAt) return;
      const bDate = new Date(b.createdAt).toDateString();
      const dayData = last7Days.find(d => d.fullDate === bDate);
      if (dayData) {
        dayData.count += 1;
      }
    });
    
    return last7Days;
  }, [bookings]);

  const paymentData = useMemo(() => {
    if (!Array.isArray(bookings)) return [];
    let paid = 0;
    let pending = 0;
    bookings.forEach(b => {
      if (b.paymentStatus === 'completed' || b.isPaid) {
        paid += 1;
      } else {
        pending += 1;
      }
    });
    return [
      { name: "Paid", value: paid, color: "#10b981" },
      { name: "Pending", value: pending, color: "#f59e0b" }
    ];
  }, [bookings]);

  const totalPayment = paymentData.reduce((acc, curr) => acc + curr.value, 0);



  return (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[
        { label: "Total Applications", value: bookings.length || 0, icon: FileText, color: "text-cyan", bg: "bg-cyan/10", suffix: "" },
        { label: "Total Revenue", value: `₹${liveAnalytics.revenue}`, icon: IndianRupee, color: "text-gold", bg: "bg-gold/10", suffix: "" },
        { label: "Approval Rate", value: liveAnalytics.approvalRate, icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10", suffix: "%" },
      ].map(({ label, value, icon: Icon, color, bg, suffix }, index) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.08 }}
        >
          <Card className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
              <Icon size={22} className={color} />
            </div>
            <div>
              <div className="text-2xl font-bold text-text-primary">
                {value}
                {suffix}
              </div>
              <div className="text-xs text-text-muted">{label}</div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h2 className="font-semibold text-text-primary">Monthly Overview</h2>
          <div className="flex p-1 bg-surface-2 rounded-xl">
            {[
              { id: "6months", label: "6 Months" },
              { id: "12months", label: "1 Year" },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setRevenueTimeframe(id)}
                className={`relative px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${revenueTimeframe === id ? "text-background" : "text-text-muted hover:text-text-primary"}`}
              >
                {revenueTimeframe === id && (
                  <motion.div
                    layoutId="revenueTogglePill"
                    className="absolute inset-0 bg-cyan rounded-lg"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value) => `₹${value}`} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#e5e7eb", strokeWidth: 1, strokeDasharray: "4 4" }} />
              <Line
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 6, fill: "#3b82f6", stroke: "#ffffff", strokeWidth: 2 }}
                isAnimationActive
                animationDuration={1500}
                animationEasing="ease-in-out"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="flex flex-col">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h2 className="font-semibold text-text-primary">Visitors & Registrations</h2>
          <div className="flex p-1 bg-surface-2 rounded-xl">
            {[
              { id: "days", label: "7 Days" },
              { id: "months", label: "3 Months" },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setVisitorTimeframe(id)}
                className={`relative px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${visitorTimeframe === id ? "text-background" : "text-text-muted hover:text-text-primary"}`}
              >
                {visitorTimeframe === id && (
                  <motion.div
                    layoutId="visitorTogglePill"
                    className="absolute inset-0 bg-cyan rounded-lg"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={visitorTrendsData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />
              <Bar
                dataKey="Visitors"
                fill="#8b5cf6"
                barSize={8}
                radius={[4, 4, 0, 0]}
                isAnimationActive
                animationDuration={1500}
              />
              <Bar
                dataKey="Registrations"
                fill="#ec4899"
                barSize={8}
                radius={[4, 4, 0, 0]}
                isAnimationActive
                animationDuration={1500}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="flex flex-col justify-between">
        <div>
          <h2 className="font-semibold text-text-primary mb-6">Application Status Distribution</h2>
          <div className="flex items-center justify-between gap-6">
            <div className="relative w-36 h-36">
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-text-primary">{totalPie}</span>
                <span className="text-[10px] text-text-muted leading-tight text-center">Total<br/>Travelers</span>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={55}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                    animationDuration={1500}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex-1 flex flex-col gap-3">
              {pieData.map(item => {
                const percentage = totalPie > 0 ? ((item.value / totalPie) * 100).toFixed(1) : 0;
                return (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-text-primary font-medium">{item.name}</span>
                    </div>
                    <div className="font-bold text-text-primary">
                      {item.value} <span className="text-text-muted font-normal ml-1">({percentage}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-8 space-y-4 border-t border-border pt-6">
            {pieData.map(item => {
              const percentage = totalPie > 0 ? ((item.value / totalPie) * 100).toFixed(1) : 0;
              return (
                <div key={item.name}>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-medium text-text-primary">{item.name}</span>
                    <span className="font-semibold text-text-primary">{percentage}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-1000 ease-in-out" 
                      style={{ width: `${percentage}%`, backgroundColor: item.color }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      <Card className="flex flex-col justify-between">
        <div>
          <h2 className="font-semibold text-text-primary mb-6">Payment Status</h2>
          <div className="flex items-center justify-between gap-6">
            <div className="relative w-36 h-36">
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-text-primary">{totalPayment}</span>
                <span className="text-[10px] text-text-muted leading-tight text-center">Total<br/>Applications</span>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentData}
                    innerRadius={55}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                    animationDuration={1500}
                  >
                    {paymentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex-1 flex flex-col gap-3">
              {paymentData.map(item => {
                const percentage = totalPayment > 0 ? ((item.value / totalPayment) * 100).toFixed(1) : 0;
                return (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-text-primary font-medium">{item.name}</span>
                    </div>
                    <div className="font-bold text-text-primary">
                      {item.value} <span className="text-text-muted font-normal ml-1">({percentage}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-8 space-y-4 border-t border-border pt-6">
            {paymentData.map(item => {
              const percentage = totalPayment > 0 ? ((item.value / totalPayment) * 100).toFixed(1) : 0;
              return (
                <div key={item.name}>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-medium text-text-primary">{item.name}</span>
                    <span className="font-semibold text-text-primary">{percentage}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-1000 ease-in-out" 
                      style={{ width: `${percentage}%`, backgroundColor: item.color }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold text-text-primary mb-6">Applications (Last 7 Days)</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyApplications}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: "#e5e7eb", opacity: 0.6 }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-surface border border-border rounded-xl px-4 py-3 shadow-modal">
                      <p className="text-xs font-semibold text-text-primary mb-2">{label}</p>
                      <p className="text-xs" style={{ color: payload[0].fill }}>Applications: {payload[0].value}</p>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="count"
                name="Applications"
                fill="#22d3ee"
                radius={[4, 4, 0, 0]}
                isAnimationActive
                animationDuration={1500}
                animationEasing="ease-in-out"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-10 gap-4">
      {[
        { label: "Visitors", count: liveAnalytics.visitors || 0, color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
        { label: "Registrations", count: liveAnalytics.registrations || 0, color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
        { label: "Start Application", count: bookings.length || 0, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" },
        { label: "Payments", count: paymentData[0]?.value || 0, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
        { label: "Travelers", count: liveAnalytics.total || 0, color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/20" },
        { label: "Document Upload", count: liveAnalytics.statusCounts?.documents_uploaded || 0, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
        { label: "Under Review", count: liveAnalytics.lifetimeUnderReview || 0, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
        { label: "Submitted", count: liveAnalytics.lifetimeSubmitted || 0, color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
        { label: "Approved", count: liveAnalytics.statusCounts?.approved || 0, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
        { label: "Rejected", count: liveAnalytics.statusCounts?.rejected || 0, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
      ].map(({ label, count, color, bg, border }) => (
        <div key={label} className={`${bg} border ${border} rounded-xl p-4 text-center`}>
          <div className={`text-3xl font-bold ${color}`}>{count}</div>
          <div className="text-xs text-text-muted mt-1">{label}</div>
        </div>
      ))}
    </div>
  </motion.div>
  );
};

export default AnalyticsPage;
