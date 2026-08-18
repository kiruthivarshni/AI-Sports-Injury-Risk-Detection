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
  { key: "overview", label: "Rehabilitation Overview", icon: "🏥" },
  { key: "athletes", label: "Injury Risk Monitoring", icon: "⚠️" },
  { key: "reports", label: "Recovery Reports", icon: "📋" },
];

const SECTION_TITLES = {
  overview: "Rehabilitation Overview",
  athletes: "Injury Risk Monitoring",
  reports: "Recovery Reports",
};

function RiskBadge({ category }) {
  const map = {
    "Low Risk": { bg: "rgba(22,199,132,0.12)", color: "var(--risk-low)" },
    "Moderate Risk": { bg: "rgba(245,158,11,0.12)", color: "var(--risk-moderate)" },
    "High Risk": { bg: "rgba(249,115,22,0.12)", color: "var(--risk-high)" },
    "Critical Risk": { bg: "rgba(239,68,68,0.12)", color: "var(--risk-critical)" },
  };
  const style = map[category] || map["Low Risk"];
  return (
    <span style={{
      fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 600,
      padding: "3px 9px", borderRadius: "20px",
      background: style.bg, color: style.color
    }}>
      {category || "—"}
    </span>
  );
}

function PhysiotherapistDashboard() {
  const [activeSection, setActiveSection] = useState("overview");
  const [athletes, setAthletes] = useState([]);
  const [allReports, setAllReports] = useState([]);
  const [loadingAthletes, setLoadingAthletes] = useState(true);
  const [loadingReports, setLoadingReports] = useState(true);
  const [search, setSearch] = useState("");
  const [viewingReport, setViewingReport] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState(
    () => localStorage.getItem("athenix_theme") || "light"
  );

  const navigate = useNavigate();
  const { name } = getSession();
  const token = localStorage.getItem("access_token");

  // ── Theme ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("athenix_theme", theme);
  }, [theme]);

  // ── Browser back button ────────────────────────────────────────────────────
  useEffect(() => {
    window.history.replaceState({ section: "overview" }, "", window.location.pathname);
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

  // ── Data loading ───────────────────────────────────────────────────────────
  useEffect(() => {
    loadAthletes();
    loadReports();
  }, []);

  const loadAthletes = async () => {
    setLoadingAthletes(true);
    try {
      const res = await axios.get("http://127.0.0.1:8000/athletes/");
      setAthletes(res.data);
    } catch (err) {
      console.error("Failed to load athletes:", err);
    } finally {
      setLoadingAthletes(false);
    }
  };

  const loadReports = async () => {
    setLoadingReports(true);
    try {
      const res = await axios.get("http://127.0.0.1:8000/api/reports/", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAllReports(res.data);
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      setLoadingReports(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  // ── Derived stats for overview ─────────────────────────────────────────────
  const highRiskCount = allReports.filter(r =>
    r.risk_category === "High Risk" || r.risk_category === "Critical Risk"
  ).length;

  const avgQuality = allReports.length
    ? Math.round(
        allReports.reduce((s, r) => s + (r.movement_quality_score || 0), 0) / allReports.length
      )
    : null;

  const avgRisk = allReports.length
    ? Math.round(
        allReports.reduce((s, r) => s + (r.injury_risk_score || 0), 0) / allReports.length
      )
    : null;

  const filteredAthletes = athletes.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.athlete_id.toLowerCase().includes(search.toLowerCase()) ||
    (a.sport_type || "").toLowerCase().includes(search.toLowerCase())
  );

  // Find each athlete's most recent report risk for the monitoring table
  const athleteRiskMap = {};
  allReports.forEach(r => {
    if (r.athlete_id && !athleteRiskMap[r.athlete_id]) {
      athleteRiskMap[r.athlete_id] = r;
    }
  });

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src={logo} alt="Athenix" />
          <span>ATHENIX</span>
        </div>
        <div className="sidebar-tagline">Physiotherapist Portal</div>

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

        {/* High-risk alert in sidebar */}
        {highRiskCount > 0 && (
          <div style={{
            margin: "12px 16px",
            background: "rgba(239,68,68,0.1)",
            borderRadius: "8px",
            padding: "10px 12px",
            fontSize: "12px",
            color: "var(--risk-critical)",
            cursor: "pointer"
          }}
            onClick={() => handleNavigate("athletes")}
          >
            <div style={{ fontWeight: 600, marginBottom: "2px" }}>
              🚨 {highRiskCount} High-Risk {highRiskCount === 1 ? "Case" : "Cases"}
            </div>
            <div style={{ opacity: 0.8 }}>Click to review →</div>
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

          {/* ── REHABILITATION OVERVIEW ── */}
          {activeSection === "overview" && (
            <>
              {/* Summary stat cards */}
              <div className="stat-grid" style={{ marginBottom: "20px" }}>
                <div className="card">
                  <p style={{ fontSize: "12px", color: "var(--slate-500)", margin: "0 0 6px" }}>
                    Total Athletes Monitored
                  </p>
                  <div className="score-display">
                    <span className="score-number">{athletes.length}</span>
                  </div>
                </div>

                <div className="card">
                  <p style={{ fontSize: "12px", color: "var(--slate-500)", margin: "0 0 6px" }}>
                    Total Assessments
                  </p>
                  <div className="score-display">
                    <span className="score-number">{allReports.length}</span>
                  </div>
                </div>

                <div className="card">
                  <p style={{ fontSize: "12px", color: "var(--slate-500)", margin: "0 0 6px" }}>
                    High / Critical Risk Cases
                  </p>
                  <div className="score-display">
                    <span className="score-number" style={{
                      color: highRiskCount > 0 ? "var(--risk-critical)" : "var(--risk-low)"
                    }}>
                      {highRiskCount}
                    </span>
                  </div>
                  {highRiskCount > 0 && (
                    <p style={{ fontSize: "12px", color: "var(--risk-critical)", margin: "6px 0 0" }}>
                      Immediate review recommended
                    </p>
                  )}
                </div>

                {avgQuality != null && (
                  <div className="card">
                    <p style={{ fontSize: "12px", color: "var(--slate-500)", margin: "0 0 6px" }}>
                      Avg Movement Quality
                    </p>
                    <div className="score-display">
                      <span className="score-number">{avgQuality}</span>
                      <span className="score-max">/ 100</span>
                    </div>
                  </div>
                )}

                {avgRisk != null && (
                  <div className="card">
                    <p style={{ fontSize: "12px", color: "var(--slate-500)", margin: "0 0 6px" }}>
                      Avg Injury Risk Score
                    </p>
                    <div className="score-display">
                      <span className="score-number" style={{
                        color: avgRisk >= 50 ? "var(--risk-high)" : "var(--risk-low)"
                      }}>
                        {avgRisk}
                      </span>
                      <span className="score-max">/ 100</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Movement Correction Analytics */}
              <div className="card" style={{ marginBottom: "20px" }}>
                <h2 className="font-display" style={{ fontSize: "16px", marginTop: 0, marginBottom: "16px" }}>
                  Movement Correction Analytics
                </h2>
                {loadingReports ? (
                  <p style={{ color: "var(--slate-500)", fontSize: "14px" }}>Loading analytics…</p>
                ) : allReports.length === 0 ? (
                  <p style={{ color: "var(--slate-500)", fontSize: "14px", margin: 0 }}>
                    No assessments recorded yet. Analyse athlete videos to see movement data here.
                  </p>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Athlete</th>
                          <th>Video</th>
                          <th>Movement Quality</th>
                          <th>Injury Risk</th>
                          <th>Readiness</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allReports.slice(0, 10).map(r => {
                          const risk = r.injury_risk_score || 0;
                          const readiness =
                            risk < 25 ? "Cleared" :
                            risk < 50 ? "Train with Caution" :
                            risk < 75 ? "Restricted" :
                            "Medical Review";
                          const readinessColor =
                            risk < 25 ? "var(--risk-low)" :
                            risk < 50 ? "var(--risk-moderate)" :
                            "var(--risk-critical)";
                          return (
                            <tr key={r.report_id}>
                              <td className="font-mono" style={{ fontSize: "11px" }}>
                                {new Date(r.created_at).toLocaleDateString()}
                              </td>
                              <td>{r.athlete_name || "—"}</td>
                              <td style={{ fontSize: "12px", color: "var(--slate-500)" }}>
                                {r.video_filename}
                              </td>
                              <td className="font-mono">{r.movement_quality_score ?? "—"}</td>
                              <td><RiskBadge category={r.risk_category} /></td>
                              <td style={{ fontSize: "12px", color: readinessColor, fontWeight: 600 }}>
                                {readiness}
                              </td>
                              <td>
                                <button
                                  className="btn btn-ghost"
                                  style={{ padding: "4px 10px", fontSize: "12px" }}
                                  onClick={() => {
                                    handleNavigate("reports");
                                    // We'll open via ReportHistory's View button
                                  }}
                                >
                                  Reports →
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── INJURY RISK MONITORING ── */}
          {activeSection === "athletes" && (
            <div className="card">
              <div style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px"
              }}>
                <h2 className="font-display" style={{ fontSize: "16px", margin: 0 }}>
                  Athlete Injury Risk Monitor
                  <span style={{
                    fontFamily: "var(--font-mono)", fontSize: "12px",
                    color: "var(--slate-500)", marginLeft: "10px"
                  }}>
                    {filteredAthletes.length} athletes
                  </span>
                </h2>
                <input
                  className="input"
                  placeholder="Search by name, ID, or sport…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ width: "240px" }}
                />
              </div>

              {loadingAthletes ? (
                <p style={{ color: "var(--slate-500)", fontSize: "14px" }}>Loading athletes…</p>
              ) : filteredAthletes.length === 0 ? (
                <p style={{ color: "var(--slate-500)", fontSize: "14px", margin: 0 }}>
                  No athletes found.
                </p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Athlete ID</th>
                        <th>Name</th>
                        <th>Sport</th>
                        <th>Injury History</th>
                        <th>Training Load</th>
                        <th>Last Risk Score</th>
                        <th>Risk Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAthletes.map(a => {
                        const latestReport = athleteRiskMap[a.athlete_id];
                        return (
                          <tr key={a.id} style={
                            latestReport?.risk_category === "Critical Risk" ||
                            latestReport?.risk_category === "High Risk"
                              ? { background: "rgba(239,68,68,0.03)" }
                              : {}
                          }>
                            <td className="font-mono" style={{ fontSize: "12px" }}>
                              {a.athlete_id}
                            </td>
                            <td>{a.name}</td>
                            <td>{a.sport_type || "—"}</td>
                            <td style={{ fontSize: "13px", maxWidth: "180px" }}>
                              {a.injury_history || "None recorded"}
                            </td>
                            <td>{a.training_load || "—"}</td>
                            <td className="font-mono">
                              {latestReport?.injury_risk_score ?? "No data"}
                            </td>
                            <td>
                              {latestReport
                                ? <RiskBadge category={latestReport.risk_category} />
                                : <span style={{ color: "var(--slate-500)", fontSize: "12px" }}>
                                    Not assessed
                                  </span>
                              }
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── RECOVERY REPORTS ── */}
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

      {/* ── Modals ── */}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}

export default PhysiotherapistDashboard;