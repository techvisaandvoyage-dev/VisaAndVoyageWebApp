import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Clock, FileText, IndianRupee, Users, CreditCard, Loader2 } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
} from "recharts";
import Card from "../../components/ui/Card";
import { api } from "../../store/authStore";
import VisitorTable from "./VisitorTable";

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

const VisitorAnalyticsPage = () => {
  const [period, setPeriod] = useState("30 Days");
  const [overviewData, setOverviewData] = useState(null);
  const [funnelData, setFunnelData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [overviewRes, funnelRes] = await Promise.all([
        api.get(`/analytics/admin/overview?period=${period}`),
        api.get(`/analytics/admin/funnel?period=${period}`)
      ]);
      
      if (overviewRes.data?.success) setOverviewData(overviewRes.data.data);
      if (funnelRes.data?.success) setFunnelData(funnelRes.data.funnel);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const periodOptions = ["Today", "7 Days", "30 Days", "3 Months", "6 Months", "1 Year"];

  if (loading && !overviewData) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-cyan" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      
      {/* Filters Header */}
      <div className="flex justify-between items-center bg-surface border border-border p-4 rounded-xl">
        <h2 className="font-semibold text-text-primary text-lg">Visitor & Application Analytics</h2>
        <div className="flex bg-surface-2 p-1 rounded-lg">
          {periodOptions.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                period === p ? "bg-cyan text-background" : "text-text-muted hover:text-text-primary"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      {overviewData && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Visitors", value: overviewData.totalVisitors, icon: Users, color: "text-indigo-400", bg: "bg-indigo-500/10" },
            { label: "Total Registrations", value: overviewData.totalRegistrations, icon: FileText, color: "text-violet-400", bg: "bg-violet-500/10" },
            { label: "Total Applications", value: overviewData.totalApplications, icon: FileText, color: "text-fuchsia-400", bg: "bg-fuchsia-500/10" },
            { label: "Total Revenue", value: `₹${overviewData.totalRevenue}`, icon: IndianRupee, color: "text-gold", bg: "bg-gold/10" },
            { label: "Pending Apps", value: overviewData.pendingApplications, icon: Clock, color: "text-orange-400", bg: "bg-orange-500/10" },
            { label: "Approved Apps", value: overviewData.approvedApplications, icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Rejected Apps", value: overviewData.rejectedApplications, icon: TrendingUp, color: "text-red-400", bg: "bg-red-500/10" },
            { label: "Completion Rate", value: overviewData.conversionRate + "%", icon: TrendingUp, color: "text-cyan", bg: "bg-cyan/10" },
          ].map(({ label, value, icon: Icon, color, bg }, index) => (
            <Card key={label} className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon size={22} className={color} />
              </div>
              <div>
                <div className="text-2xl font-bold text-text-primary">{value}</div>
                <div className="text-xs text-text-muted">{label}</div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Funnel Chart */}
      <Card>
        <h3 className="font-semibold text-text-primary mb-6">Visitor Funnel</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 12 }} />
              <YAxis dataKey="label" type="category" tick={{ fill: "#9ca3af", fontSize: 12 }} width={120} />
              <Tooltip cursor={{ fill: "#e5e7eb", opacity: 0.6 }} />
              <Bar
                dataKey="count"
                name="Visitors"
                fill="#0284c7"
                radius={[0, 4, 4, 0]}
                barSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Detailed Visitor Table */}
      <VisitorTable period={period} />
      
    </motion.div>
  );
};

export default VisitorAnalyticsPage;
