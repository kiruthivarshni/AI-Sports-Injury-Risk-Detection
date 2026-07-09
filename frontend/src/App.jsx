import { useState } from "react";
import AthleteForm from "./AthleteForm";
import AthleteList from "./AthleteList";

function App() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Sports Injury Risk Detection Platform</h1>
      <AthleteForm onAthleteAdded={() => setRefreshKey(refreshKey + 1)} />
      <AthleteList refreshKey={refreshKey} />
    </div>
  );
}

export default App;