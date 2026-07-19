import axios from "axios";

const API_BASE = "http://127.0.0.1:8000";

export async function registerUser(email, password, role) {
  const response = await axios.post(
    `${API_BASE}/register`,
    null,
    { params: { email, password, role } }
  );
  return response.data;
}

export async function loginUser(email, password) {
  const response = await axios.post(
    `${API_BASE}/login`,
    null,
    { params: { email, password } }
  );
  return response.data; // expected: { access_token, token_type }
}