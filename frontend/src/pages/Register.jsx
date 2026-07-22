import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "../api/auth";
import logo from "../assets/athenix-logo.jpeg";

function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Athlete");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await registerUser(email, password, role);
      setSuccess("Registration successful! Redirecting to login…");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--navy-950)",
      position: "relative",
      overflow: "hidden"
    }}>
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "radial-gradient(circle, rgba(56,189,248,0.15) 1px, transparent 1.4px)",
        backgroundSize: "22px 22px",
        opacity: 0.5
      }} />

      <div className="card" style={{ width: "380px", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "24px" }}>
          <img src={logo} alt="Athenix" style={{ width: "48px", marginBottom: "10px" }} />
          <h1 className="font-display" style={{ fontSize: "20px", margin: 0 }}>Create account</h1>
          <p style={{ fontSize: "13px", color: "var(--slate-500)", margin: "4px 0 0" }}>
            Join the Athenix platform
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <input
              className="input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              className="input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="Athlete">Athlete</option>
              <option value="Coach">Coach</option>
              <option value="Physiotherapist">Physiotherapist</option>
              <option value="Sports Scientist">Sports Scientist</option>
              <option value="Administrator">Administrator</option>
            </select>
          </div>

          {error && <p style={{ color: "var(--risk-critical)", fontSize: "13px", marginTop: "12px" }}>{error}</p>}
          {success && <p style={{ color: "var(--risk-low)", fontSize: "13px", marginTop: "12px" }}>{success}</p>}

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", marginTop: "18px" }}>
            {loading ? "Registering…" : "Register"}
          </button>
        </form>

        <p style={{ fontSize: "13px", textAlign: "center", marginTop: "18px", color: "var(--slate-500)" }}>
          Already have an account? <Link to="/login" style={{ color: "var(--blue-600)" }}>Login here</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;