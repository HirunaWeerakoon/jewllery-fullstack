const API_BASE_URL = "http://localhost:8081/api";

// JavaScript
fetch(`${API_BASE_URL}/cart`, {
  method: "GET",
  credentials: "include", // sends cookies across origins
  headers: {
    "Content-Type": "application/json"
  }
});