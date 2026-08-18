import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { clearSession, getSession } from "../api/auth";
import BiomechanicsReport from "../components/BiomechanicsReport";
import ReportHistory from "../components/ReportHistory";
import ProfileDropdown from "../components/ProfileDropdown";
import ProfileModal from "../components/ProfileModal";
import SettingsModal from "../components/SettingsModal";
import NotificationBell from "../components/NotificationBell";
import logo from "../assets/athenix-logo.jpeg";

const NAV_ITEMS = [
  { key: "analytics", label: "Biomechanical Analytics", icon: "📈" },
  { key: "trends",   label: "Performance Trends",      icon: "📉" },
  { key: "reports",  label: "Research Reports",         icon: "🔬" },
];

const SECTION_TITLES = {
  analytics: "Biomechanical Analytics",
  trends:    "Team Performance Trends",
  reports:   "Research Reports",
};

function StatCard({ label, value, unit = "", color }) {
  return (
    <div className="card">
      <p style={{ fontSize: "12px", color: "var(--slate-500)", margin: "0 0 6px" }}>{label}</p>
      <div className="score-display">
        <span className="score-number" style={color ? { color } : {}}>
          {value ?? "—"}
        </span>
        {unit && <span className="score-max">{unit}</span>}
      </div>
    </div>
  );
}

function RiskBar({ score }) {
  const color =
    score < 25 ? "var(--risk-low)" :
    score < 50 ? "var(--risk-moderate)" :
    score < 75 ? "var(--risk-high)" :
    "var(--risk-critical)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <div style={{
        flex: 1, height: "6px", background: "var(--slate-200)",
        borderRadius: "3px", overflow: "hidden"
      }}>
        <div style={{
          width: `${score}%`, height: "100%",
          background: color, borderRadius: "3px",
          transition: "width 0.4s ease"
        }} />
      </div>
      <span className="font-mono" style={{ fontSize: "12px", minWidth: "28px" }}>
        {Math.round(score)}
      </span>
    </div>
  );
}

function SportsScientistDashboard() {
  const [activeSection, setActiveSection] = useState("analytics");
  const [athletes, setAthletes]           = useState([]);
  const [reports, setReports]             = useState([]);
  const [loadingData, setLoadingData]     = useState(true);
  const [viewingReport, setViewingReport] = useState(null);
  const [showProfile, setShowProfile]     = useState(false);
  const [showSettings, setShowSettings]   = useState(false);
  const [theme, setTheme] = useState(
    () => localStorage.getItem("athenix_theme") || "light"
  );

  const navigate = useNavigate();
  const { name } = getSession();
  const token = localStorage.getItem("access_token");

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("athenix_theme", theme);
  }, [theme]);

  useEffect(() => {
    window.history.replaceState({ section: "analytics" }, "", window.location.pathname);
    const handlePopState = (e) => {
      if (e.state?.section) {
        setActiveSection(e.state.section);
        setViewingReport(null);
        window.history.pushState({ section: e.state.section }, "", window.location.pathname);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleNavigate = useCallback((section) => {
    window.history.pushState({ section }, "", window.location.pathname);
    setActiveSection(section);
    if (section !== "reports") setViewingReport(null);
  }, []);

  const handleLogout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    Promise.all([
      axios.get("http://127.0.0.1:8000/athletes/"),
      axios.get("http://127.0.0.1:8000/api/reports/", {
        headers: { Authorization: `Bearer ${token}` }
      })
    ])
      .then(([athleteRes, reportRes]) => {
        setAthletes(athleteRes.data);
        setReports(reportRes.data);
      })
      .catch(err => console.error("Data load failed:", err))
      .finally(() => setLoadingData(false));
  }, []);

  // ── Derived analytics ──────────────────────────────────────────────────────
  const totalReports  = reports.length;
  const totalAthletes = athletes.length;

  const avgQuality = totalReports
    ? Math.round(
        reports.reduce((s, r) => s + (r.movement_quality_score || 0), 0) / totalReports
      )
    : null;

  const avgRisk = totalReports
    ? Math.round(
        reports.reduce((s, r) => s + (r.injury_risk_score || 0), 0) / totalReports
      )
    : null;

  const riskDistribution = {
    "Low Risk":      reports.filter(r => r.risk_category === "Low Risk").length,
    "Moderate Risk": reports.filter(r => r.risk_category === "Moderate Risk").length,
    "High Risk":     reports.filter(r => r.risk_category === "High Risk").length,
    "Critical Risk": reports.filter(r => r.risk_category === "Critical Risk").length,
  };

  const riskColors = {
    "Low Risk":      "var(--risk-low)",
    "Moderate Risk": "var(--risk-moderate)",
    "High Risk":     "var(--risk-high)",
    "Critical Risk": "var(--risk-critical)",
  };

  // Per-athlete latest metrics for trend table
  const athleteMetrics = athletes.map(a => {
    const athleteReports = reports
      .filter(r => r.athlete_id === a.athlete_id)
      .sort((x, y) => new Date(y.created_at) - new Date(x.created_at));
    const latest   = athleteReports[0] || null;
    const previous = athleteReports[1] || null;
    const qualityTrend = (latest && previous && latest.movement_quality_score != null
      && previous.movement_quality_score != null)
      ? latest.movement_quality_score - previous.movement_quality_score
      : null;
    const riskTrend = (latest && previous && latest.injury_risk_score != null
      && previous.injury_risk_score != null)
      ? latest.injury_risk_score - previous.injury_risk_score
      : null;
    return { ...a, latest, qualityTrend, riskTrend, assessmentCount: athleteReports.length };
  }).filter(a => a.latest);

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src={logo} alt="Athenix" />
          <span>ATHENIX</span>
        </div>
        <div className="sidebar-tagline">Sports Scientist Portal</div>

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

          {/* ── BIOMECHANICAL ANALYTICS ── */}
          {activeSection === "analytics" && (
            <>
              <div className="stat-grid" style={{ marginBottom: "20px" }}>
                <StatCard label="Athletes in System"   value={totalAthletes} />
                <StatCard label="Total Assessments"    value={totalReports} />
                <StatCard label="Avg Movement Quality" value={avgQuality} unit="/ 100" />
                <StatCard
                  label="Avg Injury Risk Score"
                  value={avgRisk}
                  unit="/ 100"
                  color={avgRisk != null && avgRisk >= 50 ? "var(--risk-high)" : "var(--risk-low)"}
                />
              </div>

              {/* Risk Distribution */}
              <div className="card" style={{ marginBottom: "20px" }}>
                <h2 className="font-display" style={{ fontSize: "16px", marginTop: 0, marginBottom: "18px" }}>
                  Injury Risk Distribution
                </h2>
                {loadingData ? (
                  <p style={{ color: "var(--slate-500)", fontSize: "14px" }}>Loading…</p>
                ) : totalReports === 0 ? (
                  <p style={{ color: "var(--slate-500)", fontSize: "14px", margin: 0 }}>
                    No assessment data yet.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {Object.entries(riskDistribution).map(([category, count]) => (
                      <div key={category}>
                        <div style={{
                          display: "flex", justifyContent: "space-between",
                          fontSize: "13px", marginBottom: "6px"
                        }}>
                          <span style={{ fontWeight: 500 }}>{category}</span>
                          <span className="font-mono" style={{ color: riskColors[category] }}>
                            {count} assessment{count !== 1 ? "s" : ""}{" "}
                            ({totalReports > 0
                              ? Math.round((count / totalReports) * 100)
                              : 0}%)
                          </span>
                        </div>
                        <div style={{
                          height: "8px", background: "var(--slate-200)",
                          borderRadius: "4px", overflow: "hidden"
                        }}>
                          <div style={{
                            width: `${totalReports > 0 ? (count / totalReports) * 100 : 0}%`,
                            height: "100%",
                            background: riskColors[category],
                            borderRadius: "4px",
                            transition: "width 0.4s ease"
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Injury Prediction Insights */}
              <div className="card">
                <h2 className="font-display" style={{ fontSize: "16px", marginTop: 0, marginBottom: "16px" }}>
                  Injury Prediction Insights
                </h2>
                {loadingData ? (
                  <p style={{ color: "var(--slate-500)", fontSize: "14px" }}>Loading…</p>
                ) : totalReports === 0 ? (
                  <p style={{ color: "var(--slate-500)", fontSize: "14px", margin: 0 }}>
                    No assessment data available yet.
                  </p>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Athlete</th>
                        <th>Sport</th>
                        <th>Assessments</th>
                        <th>Latest Quality</th>
                        <th>Risk Score</th>
                        <th>Risk Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {athleteMetrics.map(a => (
                        <tr key={a.athlete_id}>
                          <td>{a.name}</td>
                          <td>{a.sport_type || "—"}</td>
                          <td className="font-mono">{a.assessmentCount}</td>
                          <td>
                            {a.latest.movement_quality_score != null
                              ? <RiskBar score={a.latest.movement_quality_score} />
                              : "—"
                            }
                          </td>
                          <td>
                            {a.latest.injury_risk_score != null
                              ? <RiskBar score={a.latest.injury_risk_score} />
                              : "—"
                            }
                          </td>
                          <td>
                            <span style={{
                              fontFamily: "var(--font-mono)", fontSize: "11px",
                              fontWeight: 600, padding: "3px 9px", borderRadius: "20px",
                              background:
                                a.latest.risk_category === "Low Risk" ? "rgba(22,199,132,0.12)" :
                                a.latest.risk_category === "Moderate Risk" ? "rgba(245,158,11,0.12)" :
                                "rgba(239,68,68,0.12)",
                              color:
                                a.latest.risk_category === "Low Risk" ? "var(--risk-low)" :
                                a.latest.risk_category === "Moderate Risk" ? "var(--risk-moderate)" :
                                "var(--risk-critical)"
                            }}>
                              {a.latest.risk_category || "—"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {/* ── PERFORMANCE TRENDS ── */}
          {activeSection === "trends" && (
            <div className="card">
              <h2 className="font-display" style={{ fontSize: "16px", marginTop: 0, marginBottom: "16px" }}>
                Team Performance Trends
              </h2>
              {loadingData ? (
                <p style={{ color: "var(--slate-500)", fontSize: "14px" }}>Loading…</p>
              ) : athleteMetrics.length === 0 ? (
                <p style={{ color: "var(--slate-500)", fontSize: "14px", margin: 0 }}>
                  No trend data yet. At least two assessments per athlete are needed to show trends.
                </p>
              ) : (
                <>
                  <p style={{ fontSize: "13px", color: "var(--slate-500)", margin: "0 0 16px" }}>
                    Showing movement quality and injury risk trends per athlete.
                    ↑ = improvement&nbsp;&nbsp;↓ = decline
                  </p>
                  <div style={{ overflowX: "auto" }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Athlete</th>
                          <th>Sport</th>
                          <th>Sessions</th>
                          <th>Latest Quality</th>
                          <th>Quality Trend</th>
                          <th>Latest Risk</th>
                          <th>Risk Trend</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {athleteMetrics.map(a => {
                          const risk = a.latest.injury_risk_score || 0;
                          const status =
                            risk < 25 ? { label: "Cleared", color: "var(--risk-low)" } :
                            risk < 50 ? { label: "Monitor",  color: "var(--risk-moderate)" } :
                            risk < 75 ? { label: "Restricted", color: "var(--risk-high)" } :
                            { label: "Review", color: "var(--risk-critical)" };
                          return (
                            <tr key={a.athlete_id}>
                              <td>{a.name}</td>
                              <td>{a.sport_type || "—"}</td>
                              <td className="font-mono">{a.assessmentCount}</td>
                              <td className="font-mono">
                                {a.latest.movement_quality_score ?? "—"}
                              </td>
                              <td>
                                {a.qualityTrend != null ? (
                                  <span className="font-mono" style={{
                                    color: a.qualityTrend > 0
                                      ? "var(--risk-low)"
                                      : a.qualityTrend < 0
                                      ? "var(--risk-critical)"
                                      : "var(--slate-500)",
                                    fontWeight: 600
                                  }}>
                                    {a.qualityTrend > 0 ? "↑" : a.qualityTrend < 0 ? "↓" : "→"}{" "}
                                    {a.qualityTrend > 0 ? "+" : ""}{a.qualityTrend.toFixed(1)}
                                  </span>
                                ) : (
                                  <span style={{ color: "var(--slate-500)", fontSize: "12px" }}>
                                    Need 2+ sessions
                                  </span>
                                )}
                              </td>
                              <td className="font-mono">
                                {a.latest.injury_risk_score ?? "—"}
                              </td>
                              <td>
                                {a.riskTrend != null ? (
                                  <span className="font-mono" style={{
                                    color: a.riskTrend < 0
                                      ? "var(--risk-low)"
                                      : a.riskTrend > 0
                                      ? "var(--risk-critical)"
                                      : "var(--slate-500)",
                                    fontWeight: 600
                                  }}>
                                    {a.riskTrend < 0 ? "↓" : a.riskTrend > 0 ? "↑" : "→"}{" "}
                                    {a.riskTrend > 0 ? "+" : ""}{a.riskTrend.toFixed(1)}
                                  </span>
                                ) : (
                                  <span style={{ color: "var(--slate-500)", fontSize: "12px" }}>
                                    Need 2+ sessions
                                  </span>
                                )}
                              </td>
                              <td>
                                <span style={{
                                  fontSize: "12px", fontWeight: 600,
                                  color: status.color
                                }}>
                                  {status.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── RESEARCH REPORTS ── */}
          {activeSection === "reports" && (
            viewingReport ? (
              <div>
                <button
                  className="btn btn-ghost"
                  style={{ marginBottom: "16px" }}
                  onClick={() => setViewingReport(null)}
                >
                  ← Back to Report History
                </button>
                <BiomechanicsReport report={viewingReport} />
              </div>
            ) : (
              <ReportHistory onOpenReport={(r) => setViewingReport(r)} />
            )
          )}

        </div>
      </div>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}

export default SportsScientistDashboard;