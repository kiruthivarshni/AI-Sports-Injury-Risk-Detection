import { useState, useEffect, useRef } from "react";
import axios from "axios";

const API = "http://127.0.0.1:8000";

function NotificationBell() {
  const [alerts, setAlerts]   = useState([]);
  const [open,   setOpen]     = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const token = localStorage.getItem("access_token");

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAlerts(res.data);
    } catch {
      // silently fail – notifications are non-critical
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unread = alerts.length;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => { setOpen(o => !o); if (!open) load(); }}
        style={{
          background: "none", border: "1px solid var(--slate-200)",
          borderRadius: "8px", padding: "6px 10px", cursor: "pointer",
          fontSize: "16px", position: "relative", color: "var(--slate-700)"
        }}
        title="Notifications"
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: "absolute", top: "-4px", right: "-4px",
            background: "var(--risk-critical)", color: "#fff",
            borderRadius: "10px", fontSize: "10px", fontWeight: 700,
            padding: "1px 5px", lineHeight: 1.4,
            fontFamily: "var(--font-mono)"
          }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 8px)",
          width: "340px", background: "var(--surface)",
          border: "1px solid var(--slate-200)", borderRadius: "10px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 1000,
          overflow: "hidden"
        }}>
          <div style={{
            padding: "12px 16px", borderBottom: "1px solid var(--slate-200)",
            display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <span style={{ fontWeight: 700, fontSize: "14px" }}>
              Alerts
            </span>
            <button
              onClick={load}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: "12px", color: "var(--blue-600)"
              }}
            >
              {loading ? "…" : "Refresh"}
            </button>
          </div>

          <div style={{ maxHeight: "320px", overflowY: "auto" }}>
            {alerts.length === 0 ? (
              <div style={{
                padding: "24px 16px", textAlign: "center",
                color: "var(--slate-500)", fontSize: "13px"
              }}>
                {loading ? "Loading alerts…" : "No high-risk alerts. All clear! ✅"}
              </div>
            ) : (
              alerts.map(a => (
                <div key={a.id} style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--slate-100)",
                  background: "rgba(239,68,68,0.03)"
                }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                    <span style={{ fontSize: "14px", marginTop: "1px" }}>🚨</span>
                    <div>
                      <div style={{
                        fontSize: "13px", fontWeight: 500,
                        color: "var(--risk-critical)", marginBottom: "3px"
                      }}>
                        High Risk Alert
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--slate-600)", lineHeight: 1.5 }}>
                        {a.message}
                      </div>
                      <div style={{
                        fontSize: "11px", color: "var(--slate-400)",
                        marginTop: "4px", fontFamily: "var(--font-mono)"
                      }}>
                        {new Date(a.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
