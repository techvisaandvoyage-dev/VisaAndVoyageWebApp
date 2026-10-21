import { useState, useEffect } from "react";
import { api } from "../../store/authStore";
import { Loader2, X, Clock, ChevronRight } from "lucide-react";

const VisitorDetailDrawer = ({ visitorId, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visitorId) fetchDetails();
  }, [visitorId]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/analytics/admin/visitors/${visitorId}`);
      if (res.data?.success) {
        setData(res.data);
      }
    } catch (e) {
      console.error("Failed to fetch visitor details:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-surface border-l border-border h-full shadow-2xl flex flex-col animate-in slide-in-from-right">
        
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 className="font-bold text-lg text-text-primary">Visitor {visitorId}</h3>
            {data?.visitor?.userId && (
              <p className="text-xs text-text-muted mt-1">
                Linked User: {data.visitor.userId.email || data.visitor.userId}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-2">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-cyan" />
            </div>
          ) : !data?.events?.length ? (
            <div className="text-center py-10 text-text-muted">No events logged.</div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:inset-0 before:ml-[11px] before:w-[2px] before:bg-border">
              {data.events.map((ev, i) => (
                <div key={ev._id || i} className="relative">
                  <div className="absolute -left-6 top-1 w-[10px] h-[10px] rounded-full bg-cyan ring-4 ring-surface" />
                  <div className="bg-surface-2 rounded-xl p-3 border border-border">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-text-primary text-sm capitalize">
                        {ev.eventType.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-text-muted flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    {ev.country && ev.visaType && (
                      <p className="text-xs text-text-muted mt-2 flex items-center gap-1">
                        {ev.country} <ChevronRight size={12} /> {ev.visaType}
                      </p>
                    )}
                    {ev.page && (
                      <p className="text-[11px] text-text-muted mt-1 truncate">
                        Page: {ev.page}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisitorDetailDrawer;
