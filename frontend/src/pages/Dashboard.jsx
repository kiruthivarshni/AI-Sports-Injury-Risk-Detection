import { useNavigate } from "react-router-dom";
import { useState } from "react";
import AthleteForm from "../AthleteForm";
import AthleteList from "../AthleteList";

function Dashboard() {
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    navigate("/login");
  };

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Sports Injury Risk Detection Platform</h1>
        <button onClick={handleLogout}>Logout</button>
      </div>

      <AthleteForm onAthleteAdded={() => setRefreshKey(refreshKey + 1)} />
      <AthleteList refreshKey={refreshKey} />
    </div>
  );
}

export default Dashboard;