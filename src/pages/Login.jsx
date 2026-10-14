import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin(event) {
    event.preventDefault();

    if (!email || !password) {
      setMessage("Please enter your email and password.");
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:5000/api/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email,
            password
          })
        }
      );

      const result = await response.json();

      if (result.success) {
        localStorage.setItem("quakealertLoggedIn", "true");
        localStorage.setItem("quakealertUserId", result.userId);
        localStorage.setItem("quakealertUserName", result.name);
        localStorage.setItem("quakealertUserEmail", result.email);
        localStorage.setItem("quakealertPlan", result.plan);

        window.dispatchEvent(
          new Event("quakealertPlanChanged")
        );

        navigate("/dashboard");
      } else {
        setMessage(result.message);
      }
    } catch (error) {
      console.error("Login error:", error);

      setMessage("Unable to connect to the QuakeAlert server.");
    }
  }

  return (
    <div className="login-page">

      <div className="login-box">

        <h1>QuakeAlert</h1>

        <p className="subtitle">
          Earthquake & Structural Vibration Monitoring
        </p>

        <form onSubmit={handleLogin}>

          <label htmlFor="login-email">Email</label>

          <input
            type="email"
            id="login-email"
            name="email"
            placeholder="Enter your email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            autoComplete="email"
          />

          <label htmlFor="login-password">Password</label>

          <div className="password-field">
            <input
              type={showPassword ? "text" : "password"}
              id="login-password"
              name="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              autoComplete="current-password"
            />

            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          <button type="submit">
            Login
          </button>

        </form>

        {message && (
          <p className="form-message">
            {message}
          </p>
        )}

        <p className="register-text">
          Don't have an account?{" "}
          <Link to="/register">Register</Link>
        </p>

      </div>

    </div>
  );
}

export default Login;