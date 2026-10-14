import { useEffect, useState } from "react";

function Alerts() {
  const [sensor, setSensor] = useState(null);
  const [history, setHistory] = useState([]);

  const userId =
    localStorage.getItem("quakealertUserId");

  // Get the current sensor and saved alert history
  function getData() {
    if (!userId) {
      return;
    }

    fetch(
      `http://localhost:5000/api/sensor?userId=${userId}`
    )
      .then((response) => response.json())
      .then((data) => {
        setSensor(data);
      })
      .catch((error) => {
        console.error(
          "Sensor error:",
          error
        );
      });

    fetch(
      `http://localhost:5000/api/history?userId=${userId}`
    )
      .then((response) => response.json())
      .then((data) => {
        setHistory(data);
      })
      .catch((error) => {
        console.error(
          "History error:",
          error
        );
      });
  }

  // Load data when the page opens
  useEffect(() => {
    getData();

    // Update the alert page every 3 seconds
    const interval = setInterval(() => {
      getData();
    }, 3000);

    return () => clearInterval(interval);
  }, [userId]);

  // Show only warning and critical alerts
  const alertHistory = history.filter(
    (alert) => alert.status !== "NORMAL"
  );

  // Show the latest 20 alerts so the page stays easy to read
  const visibleAlerts = alertHistory.slice(0, 20);

  return (
    <div className="alerts-page">

      <div className="alerts-header">

        <div>
          <h1>
            Alerts
          </h1>

          <p>
            View recent vibration and
            earthquake-related alerts.
          </p>
        </div>

        {sensor && (
          <div
            className={`current-alert-status ${sensor.status.toLowerCase()}`}
          >
            {sensor.status}
          </div>
        )}

      </div>

      <div className="current-alert-card">

        <div>

          <h2>
            Current Monitoring Status
          </h2>

          {sensor ? (
            <>
              <p>
                Device:{" "}
                <strong>
                  {sensor.deviceId}
                </strong>
              </p>

              <p>
                Location:{" "}
                <strong>
                  {sensor.location}
                </strong>
              </p>

              <p>
                Current Vibration:{" "}
                <strong>
                  {sensor.vibration}
                </strong>
              </p>

              <p>
                Last Update:{" "}
                <strong>
                  {new Date(
                    sensor.timestamp
                  ).toLocaleTimeString()}
                </strong>
              </p>
            </>
          ) : (
            <p>
              Loading sensor information...
            </p>
          )}

        </div>

        {sensor && (
          <div
            className={`large-alert-status ${sensor.status.toLowerCase()}`}
          >
            {sensor.status}
          </div>
        )}

      </div>

      <div className="alert-history-card">

        <h2>
          Alert History
        </h2>

        {alertHistory.length > 20 && (
          <p className="trend-note">
            Showing the latest 20 of {alertHistory.length} alerts.
          </p>
        )}

        {alertHistory.length === 0 ? (

          <div className="no-alerts">

            <h3>
              No Recent Alerts
            </h3>

            <p>
              No warning or critical
              vibration has been detected.
            </p>

          </div>

        ) : (

          <div className="alert-list">

            {visibleAlerts.map(
              (alert) => (

                <div
                  className={`alert-item ${alert.status.toLowerCase()}`}
                  key={alert.id}
                >

                  <div>

                    <h2>
                      {alert.status}
                    </h2>

                    <p>
                      {alert.status ===
                      "CRITICAL"
                        ? "High vibration detected at the monitoring location."
                        : "Increased vibration detected at the monitoring location."}
                    </p>

                    <p>
                      Vibration Level:{" "}
                      <strong>
                        {alert.vibration}
                      </strong>
                    </p>

                    <p>
                      Device:{" "}
                      <strong>
                        {alert.deviceId}
                      </strong>
                    </p>

                  </div>

                  <span>
                    {new Date(
                      alert.timestamp
                    ).toLocaleString()}
                  </span>

                </div>

              )
            )}

          </div>

        )}

      </div>

    </div>
  );
}

export default Alerts;