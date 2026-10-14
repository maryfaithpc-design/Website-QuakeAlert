import { NavLink, useNavigate } from "react-router-dom";

function Sidebar() {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("quakealertLoggedIn");
    localStorage.removeItem("quakealertUserId");
    localStorage.removeItem("quakealertPlan");
    window.dispatchEvent(new Event("quakealertPlanChanged"));
    navigate("/");
  }

  function linkClass({ isActive }) {
    return isActive ? "active" : "";
  }

  return (
    <aside className="sidebar">
      <h2>QuakeAlert</h2>

      <nav>
        <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
        <NavLink to="/monitoring" className={linkClass}>Monitoring</NavLink>
        <NavLink to="/devices" className={linkClass}>Devices</NavLink>
        <NavLink to="/alerts" className={linkClass}>Alerts</NavLink>
        <NavLink to="/reports" className={linkClass}>Reports</NavLink>
        <NavLink to="/subscription" className={linkClass}>Subscription</NavLink>
      </nav>

      <button className="logout" onClick={handleLogout}>
        Logout
      </button>
    </aside>
  );
}

export default Sidebar;