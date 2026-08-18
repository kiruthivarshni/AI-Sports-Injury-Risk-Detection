import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { clearSession, getSession } from "../api/auth";
import ProfileDropdown from "../components/ProfileDropdown";
import ProfileModal from "../components/ProfileModal";
import SettingsModal from "../components/SettingsModal";
import NotificationBell from "../components/NotificationBell";
import logo from "../assets/athenix-logo.jpeg";

const API = "http://127.0.0.1:8000";

const NAV_ITEMS = [
  { key: "overview",  label: "Platform Overview",  icon: "📊" },
  { key: "users",     label: "User Management",     icon: "👥" },
];

const SECTION_TITLES = {
  overview: "Platform Overview",
  users:    "User Management",
};

const ROLE_COLORS = {
  "Athlete":         { bg: "rgba(56,189,248,0.12)",  color: "var(--blue-600)" },
  "Coach":           { bg: "rgba(22,199,132,0.12)",  color: "var(--risk-low)" },
  "Physiotherapist": { bg: "rgba(245,158,11,0.12)",  color: "var(--risk-moderate)" },
  "Sports Scientist":{ bg: "rgba(139,92,246,0.12)",  color: "#7c3aed" },
  "Administrator":   { bg: "rgba(239,68,68,0.12)",   color: "var(--risk-critical)" },
};

function RoleBadge({ role }) {
  const s = ROLE_COLORS[role] || { bg: "var(--slate-100)", color: "var(--slate-600)" };
  return (
    <span style={{
      fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 600,
      padding: "3px 9px", borderRadius: "20px",
      background: s.bg, color: s.color
    }}>
      {role}
    </span>
  );
}

function AdminDashboard() {
  const [activeSection, setActiveSection] = useState("overview");
  const [stats,    setStats]    = useState(null);
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [deletingId, setDeletingId] = useState(null);
  const [showProfile,  setShowProfile]  = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState(
    () => localStorage.getItem("athenix_theme") || "light"
  );

  const navigate = useNavigate();
  const { name } = getSession();
  const token = localStorage.getItem("access_token");
  const authHeader = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("athenix_theme", theme);
  }, [theme]);

  useEffect(() => {
    window.history.replaceState({ section: "overview" }, "", window.location.pathname);
    const handlePop = (e) => {
      if (e.state?.section) {
        setActiveSection(e.state.section);
        window.history.pushState({ section: e.state.section }, "", window.location.pathname);
      }
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  const handleNavigate = useCallback((section) => {
    window.history.pushState({ section }, "", window.location.pathname);
    setActiveSection(section);
  }, []);

  const handleLogout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes] = await Promise.all([
        axios.get(`${API}/admin/stats`,  { headers: authHeader }),
        axios.get(`${API}/admin/users`,  { headers: authHeader }),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
    } catch (err) {
      console.error("Admin data load failed:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Permanently delete user "${userName}" (ID: ${userId})?\nThis cannot be undone.`)) return;
    setDeletingId(userId);
    try {
      await axios.delete(`${API}/admin/users/${userId}`, { headers: authHeader });
      setUsers(prev => prev.filter(u => u.id !== userId));
      // refresh stats
      const statsRes = await axios.get(`${API}/admin/stats`, { headers: authHeader });
      setStats(statsRes.data);
    } catch (err) {
      alert("Delete failed: " + (err.response?.data?.detail || err.message));
    } finally {
      setDeletingId(null);
    }
  };

  const roles = ["All", "Athlete", "Coach", "Physiotherapist", "Sports Scientist", "Administrator"];

  const filteredUsers = users.filter(u => {
    const matchSearch =
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "All" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src={logo} alt="Athenix" />
          <span>ATHENIX</span>
        </div>
        <div className="sidebar-tagline">Administrator Portal</div>

        {NAV_ITEMS.map(item => (
          <div
            key={item.key}
            className={`nav-item ${activeSection === item.key ? "active" : ""}`}
            onClick={() => handleNavigate(item.key)}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}

        {stats && (
          <div style={{
            margin: "12px 16px", background: "rgba(56,189,248,0.08)",
            borderRadius: "8px", padding: "10px 12px", fontSize: "12px"
          }}>
            <div style={{ fontWeight: 600, color: "var(--blue-600)", marginBottom: "6px" }}>
              Platform Stats
            </div>
            <div style={{ color: "var(--slate-600)", lineHeight: 1.8 }}>
              {stats.total_users} users · {stats.total_reports} reports
            </div>
          </div>
        )}

        <div className="sidebar-footer">
          <button
            className="btn btn-ghost"
            style={{ width: "100%", color: "#93A3C2", borderColor: "rgba(255,255,255,0.15)" }}
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="topbar">
          <h1 className="font-display">{SECTION_TITLES[activeSection]}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              className="theme-toggle"
              onClick={() => setTheme(t => t === "light" ? "dark" : "light")}
            >
              {theme === "light" ? "🌙 Dark" : "☀️ Light"}
            </button>
            <NotificationBell />
            <ProfileDropdown
              name={name}
              onProfile={() => setShowProfile(true)}
              onSettings={() => setShowSettings(true)}
              onLogout={handleLogout}
            />
          </div>
        </div>

        <div className="main-content">

          {/* ── OVERVIEW ── */}
          {activeSection === "overview" && (
            <>
              {loading ? (
                <div className="card">
                  <p style={{ color: "var(--slate-500)", fontSize: "14px", margin: 0 }}>
                    Loading platform data…
                  </p>
                </div>
              ) : stats ? (
                <>
                  {/* Stat cards */}
                  <div className="stat-grid" style={{ marginBottom: "20px" }}>
                    {[
                      { label: "Total Users",    value: stats.total_users },
                      { label: "Total Athletes", value: stats.total_athletes },
                      { label: "Total Reports",  value: stats.total_reports },
                    ].map(({ label, value }) => (
                      <div className="card" key={label}>
                        <p style={{ fontSize: "12px", color: "var(--slate-500)", margin: "0 0 6px" }}>
                          {label}
                        </p>
                        <div className="score-display">
                          <span className="score-number">{value}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Role breakdown */}
                  <div className="card" style={{ marginBottom: "20px" }}>
                    <h2 className="font-display" style={{ fontSize: "16px", marginTop: 0, marginBottom: "18px" }}>
                      Users by Role
                    </h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {Object.entries(stats.by_role).map(([role, count]) => {
                        const pct = stats.total_users > 0
                          ? Math.round((count / stats.total_users) * 100) : 0;
                        const color = ROLE_COLORS[role]?.color || "var(--blue-600)";
                        return (
                          <div key={role}>
                            <div style={{
                              display: "flex", justifyContent: "space-between",
                              fontSize: "13px", marginBottom: "5px"
                            }}>
                              <span style={{ fontWeight: 500 }}>{role}</span>
                              <span className="font-mono" style={{ color }}>
                                {count} user{count !== 1 ? "s" : ""} ({pct}%)
                              </span>
                            </div>
                            <div style={{
                              height: "7px", background: "var(--slate-200)",
                              borderRadius: "4px", overflow: "hidden"
                            }}>
                              <div style={{
                                width: `${pct}%`, height: "100%",
                                background: color, borderRadius: "4px",
                                transition: "width 0.4s ease"
                              }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quick actions */}
                  <div className="card">
                    <h2 className="font-display" style={{ fontSize: "16px", marginTop: 0, marginBottom: "12px" }}>
                      Quick Actions
                    </h2>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <button
                        className="btn btn-primary"
                        onClick={() => handleNavigate("users")}
                      >
                        👥 Manage Users
                      </button>
                      <button
                        className="btn btn-ghost"
                        onClick={loadData}
                      >
                        🔄 Refresh Stats
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="card">
                  <p style={{ color: "var(--risk-critical)", fontSize: "14px", margin: 0 }}>
                    Failed to load platform data. Check your connection and try refreshing.
                  </p>
                </div>
              )}
            </>
          )}

          {/* ── USER MANAGEMENT ── */}
          {activeSection === "users" && (
            <div className="card">
              <div style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", marginBottom: "16px",
                flexWrap: "wrap", gap: "12px"
              }}>
                <h2 className="font-display" style={{ fontSize: "16px", margin: 0 }}>
                  All Users
                  <span style={{
                    fontFamily: "var(--font-mono)", fontSize: "12px",
                    color: "var(--slate-500)", marginLeft: "10px"
                  }}>
                    {filteredUsers.length} shown
                  </span>
                </h2>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <input
                    className="input"
                    placeholder="Search name or email…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ width: "220px" }}
                  />
                  <select
                    className="input"
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                    style={{ width: "180px" }}
                  >
                    {roles.map(r => (
                      <option key={r} value={r}>{r === "All" ? "All Roles" : r}</option>
                    ))}
                  </select>
                  <button className="btn btn-ghost" onClick={loadData}>
                    🔄 Refresh
                  </button>
                </div>
              </div>

              {loading ? (
                <p style={{ color: "var(--slate-500)", fontSize: "14px" }}>Loading users…</p>
              ) : filteredUsers.length === 0 ? (
                <p style={{ color: "var(--slate-500)", fontSize: "14px", margin: 0 }}>
                  No users found.
                </p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Full Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Profile</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(u => (
                        <tr key={u.id}>
                          <td className="font-mono" style={{ fontSize: "12px" }}>{u.id}</td>
                          <td style={{ fontWeight: 500 }}>{u.full_name}</td>
                          <td style={{ fontSize: "13px", color: "var(--slate-500)" }}>{u.email}</td>
                          <td><RoleBadge role={u.role} /></td>
                          <td>
                            <span style={{
                              fontSize: "12px",
                              color: u.profile_completed ? "var(--risk-low)" : "var(--slate-400)"
                            }}>
                              {u.profile_completed ? "✓ Complete" : "Incomplete"}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn btn-ghost"
                              style={{
                                padding: "4px 10px", fontSize: "12px",
                                color: "var(--risk-critical)",
                                borderColor: "var(--risk-critical)"
                              }}
                              disabled={deletingId === u.id}
                              onClick={() => handleDeleteUser(u.id, u.full_name)}
                            >
                              {deletingId === u.id ? "Deleting…" : "Delete"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {showProfile  && <ProfileModal  onClose={() => setShowProfile(false)}  />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}

export default AdminDashboard;
