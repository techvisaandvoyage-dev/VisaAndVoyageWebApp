import { useState, useEffect } from "react";
import { api } from "../../store/authStore";
import { Loader2, Search, Filter, Eye } from "lucide-react";
import VisitorDetailDrawer from "./VisitorDetailDrawer";

const VisitorTable = ({ period }) => {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedVisitor, setSelectedVisitor] = useState(null);

  useEffect(() => {
    fetchVisitors();
  }, [period, page]);

  const fetchVisitors = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/analytics/admin/visitors?period=${period}&page=${page}`);
      if (res.data?.success) {
        setVisitors(res.data.visitors);
        setTotalPages(res.data.pages);
      }
    } catch (e) {
      console.error("Failed to fetch visitors:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-xl mt-8 overflow-hidden">
      <div className="p-4 border-b border-border flex justify-between items-center">
        <h3 className="font-semibold text-text-primary">Visitor Logs</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-text-muted">
          <thead className="bg-surface-2 border-b border-border text-text-primary font-medium">
            <tr>
              <th className="px-4 py-3">Visitor ID</th>
              <th className="px-4 py-3">First Visit</th>
              <th className="px-4 py-3">Last Active</th>
              <th className="px-4 py-3">Country</th>
              <th className="px-4 py-3">Device/OS</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan="7" className="px-4 py-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan" />
                </td>
              </tr>
            ) : visitors.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-4 py-8 text-center text-text-muted">
                  No visitors found for this period.
                </td>
              </tr>
            ) : (
              visitors.map((v) => (
                <tr key={v.visitorId} className="hover:bg-surface-2/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-text-primary">{v.visitorId}</td>
                  <td className="px-4 py-3">{new Date(v.firstVisitAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{new Date(v.lastActiveAt).toLocaleString()}</td>
                  <td className="px-4 py-3">{v.country}</td>
                  <td className="px-4 py-3">{v.device} / {v.os}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-surface-2">
                      {v.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button 
                      onClick={() => setSelectedVisitor(v.visitorId)}
                      className="p-1 hover:bg-white/5 rounded-lg text-cyan"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-border flex justify-between items-center text-sm">
        <span className="text-text-muted">Page {page} of {totalPages || 1}</span>
        <div className="flex gap-2">
          <button 
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 rounded-lg border border-border disabled:opacity-50"
          >
            Prev
          </button>
          <button 
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1 rounded-lg border border-border disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {selectedVisitor && (
        <VisitorDetailDrawer 
          visitorId={selectedVisitor} 
          onClose={() => setSelectedVisitor(null)} 
        />
      )}
    </div>
  );
};

export default VisitorTable;
