import { useState, useEffect } from "react";
import { Search, Filter, Loader2, AlertCircle } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { api } from "../../store/authStore";
import Card from "../ui/Card";
import { useNavigate } from "react-router-dom";
import ApplicationDetailsDrawer from "./ApplicationDetailsDrawer";

const ApplicationsTable = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [selectedAppId, setSelectedAppId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/analytics/admin/applications-unified?page=${page}&limit=50&search=${search}&status=${status}`);
      if (res.data?.success) {
        setData(res.data.data);
        setTotalPages(res.data.pages);
      }
    } catch (err) {
      console.error("Failed to fetch unified applications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, search, status]);

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "");

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h2 className="font-semibold text-text-primary flex-1">All Applications (Unified)</h2>

        <div className="flex items-center gap-2 bg-surface-2 border border-border rounded-xl px-3 py-2">
          <Search size={14} className="text-text-muted" />
          <input
            type="text"
            placeholder="Search by name, ID, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm text-text-primary placeholder-text-muted focus:outline-none w-48"
          />
        </div>

        <div className="flex items-center gap-2 bg-surface-2 border border-border rounded-xl px-3 py-2">
          <Filter size={14} className="text-text-muted" />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-transparent text-sm text-text-secondary focus:outline-none cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="submitted">Submitted</option>
            <option value="review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2/50 text-left text-xs font-semibold text-text-muted">
              <th className="py-3 px-4 whitespace-nowrap">Visitor ID</th>
              <th className="py-3 pr-4 whitespace-nowrap">App ID</th>
              <th className="py-3 pr-4 whitespace-nowrap">Applicant</th>
              <th className="py-3 pr-4 whitespace-nowrap">Travel Dates</th>
              <th className="py-3 pr-4 whitespace-nowrap">Country</th>
              <th className="py-3 pr-4 whitespace-nowrap">Fee / Status</th>
              <th className="py-3 pr-4 whitespace-nowrap">Overall Status</th>
              <th className="py-3 pr-4 whitespace-nowrap">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {loading ? (
              <tr>
                <td colSpan="8" className="py-8 text-center text-text-muted">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan" />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan="8" className="py-12 text-center text-text-muted">
                  <AlertCircle size={32} className="mx-auto mb-3 opacity-50" />
                  <p>No applications match your search.</p>
                </td>
              </tr>
            ) : (
              data.map((row, idx) => {
                const v = row.visitor || {};
                const a = row.application || {};
                const u = row.user || {};
                const t = row.transaction || {};
                const hasApp = !!a.applicationId;
                
                const nameEntered = [a.firstName, a.lastName].filter(Boolean).join(" ");
                const email = a.email || u.email || "";
                const phone = u.phone || a.phone || "";
                const paymentStatus = a.paymentStatus || t.status || "";

                return (
                  <tr key={`${v.visitorId || idx}-${a.applicationId || idx}`} className="hover:bg-surface-3/50 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-text-muted whitespace-nowrap">
                      {v.visitorId || "-"}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-text-muted whitespace-nowrap">
                      {a.applicationId || "-"}
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <div>
                        <p className="font-medium text-text-primary">
                          {nameEntered || u.name || "Unknown"}
                        </p>
                        <p className="text-xs text-text-muted">{email}</p>
                        {phone && <p className="text-xs text-text-muted mt-0.5">{phone}</p>}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-xs text-text-secondary whitespace-nowrap">
                      {hasApp ? (
                        <>
                          <span className="block text-emerald-400">{fmtDate(a.travelDate)}</span>
                          <span className="block text-red-400">{fmtDate(a.returnDate)}</span>
                        </>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <p className="font-medium text-text-primary">{a.countryName || v.country || "-"}</p>
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      {hasApp ? (
                        <div>
                          <p className="font-medium text-text-primary">₹{a.fee || 0}</p>
                          <p className={`text-xs font-medium ${
                            paymentStatus === "completed" || paymentStatus === "success"
                              ? "text-emerald-400"
                              : paymentStatus === "failed"
                                ? "text-red-400"
                                : "text-amber-400"
                          }`}>
                            {paymentStatus ? paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1) : "Pending"}
                          </p>
                        </div>
                      ) : "-"}
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <span className="px-2 py-1 bg-surface-2 rounded-full text-xs font-medium text-text-primary border border-border">
                        {a.status || v.status || "Active"}
                      </span>
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      {hasApp ? (
                        <button
                          onClick={() => setSelectedAppId(a.applicationId || a._id)}
                          className="px-3 py-1.5 bg-cyan/10 text-cyan hover:bg-cyan/20 text-xs font-medium rounded-lg transition-colors"
                        >
                          View App
                        </button>
                      ) : (
                        <span className="text-xs text-text-muted italic">No App</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
        <p className="text-xs text-text-muted">
          Page {page} of {totalPages}
        </p>
        <div className="flex gap-2">
          <button 
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="px-3 py-1.5 text-xs rounded-lg bg-surface-3 text-text-muted hover:text-text-primary transition-colors disabled:opacity-50"
          >
            Prev
          </button>
          <button 
            className="px-3 py-1.5 text-xs rounded-lg bg-cyan text-background font-medium"
          >
            {page}
          </button>
          <button 
            disabled={page >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            className="px-3 py-1.5 text-xs rounded-lg bg-surface-3 text-text-muted hover:text-text-primary transition-colors disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      <ApplicationDetailsDrawer
        appId={selectedAppId}
        onClose={() => setSelectedAppId(null)}
      />
    </Card>
  );
};

export default ApplicationsTable;
