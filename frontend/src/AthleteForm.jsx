import { useState } from "react";
import axios from "axios";

function AthleteForm({ onAthleteAdded }) {
  const [form, setForm] = useState({
    athlete_id: "", name: "", sport_type: "", position: "",
    age: "", height: "", weight: "", injury_history: "", training_load: ""
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://127.0.0.1:8000/athletes/", form);
      alert("Athlete added successfully!");
      onAthleteAdded();
    } catch (err) {
      alert("Error: " + err.response?.data?.detail || err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Add Athlete</h2>
      <input name="athlete_id" placeholder="Athlete ID" onChange={handleChange} required />
      <input name="name" placeholder="Name" onChange={handleChange} required />
      <input name="sport_type" placeholder="Sport Type" onChange={handleChange} />
      <input name="position" placeholder="Position" onChange={handleChange} />
      <input name="age" placeholder="Age" type="number" onChange={handleChange} />
      <input name="height" placeholder="Height (cm)" type="number" onChange={handleChange} />
      <input name="weight" placeholder="Weight (kg)" type="number" onChange={handleChange} />
      <input name="injury_history" placeholder="Injury History" onChange={handleChange} />
      <input name="training_load" placeholder="Training Load" onChange={handleChange} />
      <button type="submit">Add Athlete</button>
    </form>
  );
}

export default AthleteForm;