import { useEffect, useState } from "react";

function Dashboard() {
  const [system, setSystem] = useState(null);
  const [sensor, setSensor] = useState(null);
  const [history, setHistory] = useState([]);
  const [backendDown, setBackendDown] = useState(false);

  const userId =
    localStorage.getItem("quakealertUserId");

  useEffect(() => {
    function getData() {
      fetch(
        `http://localhost:5000/api/status?userId=${userId}`
      )
        .then((response) => response.json())
        .then((data) => {
          setSystem(data);
          setBackendDown(false);
        })
        .catch((error) => {
          console.error("System error:", error);
          setBackendDown(true);
        });

      fetch(
        `http://localhost:5000/api/sensor?userId=${userId}`
      )
        .then((response) => response.json())
        .then((data) => {
          setSensor(data);
        })
        .catch((error) => {
          console.error("Sensor error:", error);
        });

      fetch(
        `http://localhost:5000/api/history?userId=${userId}`
      )
        .then((response) => response.json())
        .then((data) => {
          setHistory(data);
        })
        .catch((error) => {
          console.error("History error:", error);
        });
    }

    if (userId) {
      getData();

      // Update dashboard data every 3 seconds
      const interval = setInterval(() => {
        getData();
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [userId]);

  const status = sensor?.status
    ? sensor.status.toLowerCase()
    : "";

  // Same limits the server uses: 2 = warning, 5 = critical
  const SCALE_MAX = 6;
  const markerPosition = sensor
    ? Math.min(Math.max(sensor.vibration / SCALE_MAX, 0), 1) * 100
    : 0;

  const lastReading = sensor?.timestamp
    ? new Date(sensor.timestamp).toLocaleTimeString()
    : null;

  const connectionLabel = backendDown
    ? "Backend offline"
    : system
    ? "System online"
    : "Connecting...";

  const alertMessage =
    sensor?.status === "CRITICAL"
      ? "High vibration detected. Please check the monitored area."
      : sensor?.status === "WARNING"
      ? "Increased vibration detected at the monitoring location."
      : "No critical vibration detected.";

  return (
    <div className="dashboard">

      <div className="dashboard-header">

        <div>
          <h1>
            QuakeAlert Dashboard
          </h1>

          <p>
            Earthquake and structural vibration
            monitoring system
          </p>
        </div>

        <div
          className={`online-status ${
            backendDown ? "offline" : ""
          }`}
        >
          ● {connectionLabel}
        </div>

      </div>

      <div className={`alert-box ${status}`} role="status">

        <h2>
          Current Alert
        </h2>

        <p>
          {alertMessage}
        </p>

      </div>

      <div className="dashboard-cards">

        <div className="status-card">

          <h3>
            System Status
          </h3>

          <h2>
            {system
              ? system.status
              : "Loading..."}
          </h2>

          <p>
            Backend connection
          </p>

        </div>

        <div className="status-card">

          <h3>
            Current Vibration
          </h3>

          <h2>
            {sensor
              ? sensor.vibration
              : "..."}
          </h2>

          <p>
            Vibration level
          </p>

        </div>

        <div className="status-card">

          <h3>
            Device
          </h3>

          <h2>
            {system
              ? system.device
              : "..."}
          </h2>

          <p>
            Connected monitoring device
          </p>

        </div>

        <div className="status-card">

          <h3>
            Location
          </h3>

          <h2>
            {system
              ? system.location
              : "..."}
          </h2>

          <p>
            Monitoring area
          </p>

        </div>

      </div>

      <div className="dashboard-section">

        <div className="overview-card">

          <h2>
            Vibration Overview
          </h2>

          <div className={`big-vibration ${status}`}>
            {sensor
              ? sensor.vibration
              : "..."}
          </div>

          <div
            className={`dashboard-status ${status}`}
          >
            {sensor
              ? sensor.status
              : "LOADING"}
          </div>

          <div
            className="overview-scale"
            aria-label="Vibration scale: normal below 2, warning 2 to 5, critical 5 and above"
          >

            <div className="scale-track">
              <span className="scale-band normal"></span>
              <span className="scale-band warning"></span>
              <span className="scale-band critical"></span>

              {sensor && (
                <span
                  className={`scale-marker ${status}`}
                  style={{ left: `${markerPosition}%` }}
                ></span>
              )}
            </div>

            <div className="scale-labels">
              <span>Normal<br />below 2</span>
              <span>Warning<br />2 to 5</span>
              <span>Critical<br />5 and above</span>
            </div>

          </div>

          <p className="last-reading">
            {lastReading
              ? `Last reading at ${lastReading}`
              : "Checking sensor data..."}
          </p>

        </div>

        <div className="overview-card">

          <h2>
            Device Information
          </h2>

          <div className="device-details">

            <p>
              <strong>
                Device ID:
              </strong>{" "}
              {sensor?.deviceId || "..."}
            </p>

            <p>
              <strong>
                Sensor:
              </strong>{" "}
              {sensor?.sensor || "..."}
            </p>

            <p>
              <strong>
                Location:
              </strong>{" "}
              {sensor?.location || "..."}
            </p>

            <p>
              <strong>
                Protocol:
              </strong>{" "}
              MQTT
            </p>

            <p>
              <strong>
                Monitoring:
              </strong>{" "}
              Real-Time
            </p>

          </div>

        </div>

      </div>

      <div className="history-card">

        <h2>
          Vibration Trend
        </h2>

        {history.length > 10 && (
          <p className="trend-note">
            Showing the latest 10 of {history.length} readings.
          </p>
        )}

        <div className="vibration-chart">

          {history.length === 0 ? (

            <p>
              No vibration events recorded yet. Readings will appear here when your device sends data.
            </p>

          ) : (

            history.slice(0, 10).map((reading) => (

              <div
                className="chart-item"
                key={reading.id}
              >

                <div className="chart-label">

                  <span>
                    {new Date(
                      reading.timestamp
                    ).toLocaleTimeString()}
                  </span>

                  <strong>
                    {reading.vibration}
                  </strong>

                </div>

                <div className="chart-bar-container">

                  <div
                    className={`chart-bar ${reading.status.toLowerCase()}`}
                    style={{
                      width: `${Math.min(
                        (reading.vibration / SCALE_MAX) * 100,
                        100
                      )}%`
                    }}
                  ></div>

                </div>

                <span
                  className={`history-status ${reading.status.toLowerCase()}`}
                >
                  {reading.status}
                </span>

              </div>

            ))

          )}

        </div>

      </div>

    </div>
  );
}

export default Dashboard;