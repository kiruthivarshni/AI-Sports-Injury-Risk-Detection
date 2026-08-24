import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "../api/auth";
import AthleteDashboard from "./AthleteDashboard";
import CoachDashboard from "./CoachDashboard";
import PhysiotherapistDashboard from "./PhysiotherapistDashboard";
import SportsScientistDashboard from "./SportsScientistDashboard";
import AdminDashboard from "./AdminDashboard";

function Dashboard() {
  const navigate = useNavigate();
  const { role, profileCompleted } = getSession();

  useEffect(() => {
    if (role === "Athlete" && !profileCompleted) {
      navigate("/complete-profile", { replace: true });
    }
  }, []);

  if (role === "Athlete") return <AthleteDashboard />;
if (role === "Coach") return <CoachDashboard />;
if (role === "Physiotherapist") return <PhysiotherapistDashboard />;
if (role === "Sports Scientist") return <SportsScientistDashboard />;
if (role === "Administrator") return <AdminDashboard />;

return <CoachDashboard />;
}

export default Dashboard;