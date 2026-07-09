import { useEffect, useState } from "react";
import axios from "axios";

function AthleteList({ refreshKey }) {
  const [athletes, setAthletes] = useState([]);

  useEffect(() => {
    axios.get("http://127.0.0.1:8000/athletes/")
      .then(res => setAthletes(res.data))
      .catch(err => console.error(err));
  }, [refreshKey]);

  return (
    <div>
      <h2>Athletes</h2>
      <ul>
        {athletes.map(a => (
          <li key={a.id}>{a.name} — {a.sport_type} — Age {a.age}</li>
        ))}
      </ul>
    </div>
  );
}

export default AthleteList;