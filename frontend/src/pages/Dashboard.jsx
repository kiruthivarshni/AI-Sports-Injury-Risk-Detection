import { useNavigate } from "react-router-dom";
import { useState } from "react";
import AthleteForm from "../AthleteForm";
import AthleteList from "../AthleteList";
import VideoUpload from "../components/VideoUpload";
import BiomechanicsReport from "../components/BiomechanicsReport";
import Sidebar from "../components/Sidebar";

function Dashboard() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [report, setReport] = useState(null);
  const [activeSection, setActiveSection] = useState("athletes");
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    navigate("/login");
  };

  const sectionTitles = {
    athletes: "Athlete Management",
    analyze: "Video Analysis",
    reports: "Biomechanics Report",
  };

  return (
    <div className="app-shell">
      <Sidebar activeSection={activeSection} onNavigate={setActiveSection} onLogout={handleLogout} />

      <div>
        <div className="topbar">
          <h1 className="font-display">{sectionTitles[activeSection]}</h1>
          <span className="role-badge">SESSION ACTIVE</span>
        </div>

        <div className="main-content">
          {activeSection === "athletes" && (
            <>
              <AthleteForm onAthleteAdded={() => setRefreshKey(refreshKey + 1)} />
              <AthleteList refreshKey={refreshKey} />
            </>
          )}

          {activeSection === "analyze" && (
            <VideoUpload onReportReady={(r) => { setReport(r); setActiveSection("reports"); }} />
          )}

          {activeSection === "reports" && (
            report
              ? <BiomechanicsReport report={report} />
              : <div className="card">No report generated yet. Run an analysis from the Video Analysis tab.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;