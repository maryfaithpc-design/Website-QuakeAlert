import { useEffect, useState } from "react";

function Monitoring() {
  const [sensor, setSensor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [backendDown, setBackendDown] = useState(false);

  const userId =
    localStorage.getItem("quakealertUserId");

  function getSensorData() {
    if (!userId) {
      setLoading(false);
      return;
    }

    fetch(
      `http://localhost:5000/api/sensor?userId=${userId}`
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error("Server error");
        }

        return response.json();
      })
      .then((data) => {
        setSensor(data);
        setLastUpdate(new Date());
        setBackendDown(false);
        setLoading(false);
      })
      .catch((error) => {
        console.error(
          "Sensor connection error:",
          error
        );

        setBackendDown(true);
        setLoading(false);
      });
  }

  useEffect(() => {
    getSensorData();

    const interval = setInterval(() => {
      getSensorData();
    }, 3000);

    return () => clearInterval(interval);
  }, [userId]);

  if (loading) {
    return (
      <div className="monitoring-page">
        <h1>Real-Time Monitoring</h1>
        <p>Loading sensor data...</p>
      </div>
    );
  }

  if (!sensor) {
    return (
      <div className="monitoring-page">
        <h1>Real-Time Monitoring</h1>

        <div className="monitoring-error">
          <h2>Unable to Connect</h2>

          <p>
            The QuakeAlert backend server could
            not be reached.
          </p>

          <p>
            Make sure the backend is running on
            port 5000.
          </p>
        </div>
      </div>
    );
  }

  const vibrationPercent = Math.min(
    (sensor.vibration / 6) * 100,
    100
  );

  return (
    <div className="monitoring-page">

      <div className="monitoring-header">

        <div>
          <h1>
            Real-Time Monitoring
          </h1>

          <p>
            Monitor vibration levels from
            your QuakeAlert device.
          </p>
        </div>

        <div
          className={`monitoring-online ${
            backendDown ? "offline" : ""
          }`}
        >
          ● {backendDown ? "OFFLINE" : "ONLINE"}
        </div>

      </div>

      <div className="monitoring-main-card">

        <div className="monitoring-value-section">

          <h3>
            Current Vibration
          </h3>

          <div className="monitoring-big-value">
            {sensor.vibration}
          </div>

          <span
            className={`monitoring-status ${sensor.status.toLowerCase()}`}
          >
            {sensor.status}
          </span>

        </div>

        <div className="vibration-level-section">

          <h3>
            Vibration Level
          </h3>

          <div className="vibration-bar">

            <div
              className={`vibration-fill ${sensor.status.toLowerCase()}`}
              style={{
                width: `${vibrationPercent}%`
              }}
            ></div>

          </div>

          <div className="vibration-scale scale-ticks">
            <span style={{ left: "0%" }}>0</span>
            <span style={{ left: "33.33%" }}>2</span>
            <span style={{ left: "83.33%" }}>5</span>
            <span style={{ left: "100%" }}>6+</span>
          </div>

          <div className="thresholds">
            <span>
              Normal: 0–2
            </span>

            <span>
              Warning: 2–5
            </span>

            <span>
              Critical: 5+
            </span>
          </div>

        </div>

      </div>

      <div className="monitoring-grid">

        <div className="monitoring-card">

          <h3>
            Device
          </h3>

          <h2>
            {sensor.deviceId}
          </h2>

          <p>
            {sensor.location}
          </p>

        </div>

        <div className="monitoring-card">

          <h3>
            Connection
          </h3>

          <h2>
            {backendDown ? "OFFLINE" : "ONLINE"}
          </h2>

          <p>
            {backendDown
              ? "Backend not reachable"
              : "Backend Connected"}
          </p>

        </div>

        <div className="monitoring-card">

          <h3>
            Sensor
          </h3>

          <h2>
            {sensor.sensor}
          </h2>

          <p>
            Motion and vibration sensor
          </p>

        </div>

        <div className="monitoring-card">

          <h3>
            Monitoring Status
          </h3>

          <div
            className={`monitoring-status ${sensor.status.toLowerCase()}`}
          >
            {sensor.status}
          </div>

          <p>
            {sensor.status === "NORMAL"
              ? "No significant vibration detected."
              : sensor.status === "WARNING"
              ? "Increased vibration detected."
              : "High vibration detected."}
          </p>

        </div>

      </div>

      <div className="sensor-panel">

        <h2>
          Sensor Information
        </h2>

        <div className="sensor-info">

          <p>
            <strong>
              Device ID:
            </strong>{" "}
            {sensor.deviceId}
          </p>

          <p>
            <strong>
              Location:
            </strong>{" "}
            {sensor.location}
          </p>

          <p>
            <strong>
              Sensor:
            </strong>{" "}
            {sensor.sensor}
          </p>

          <p>
            <strong>
              Protocol:
            </strong>{" "}
            MQTT
          </p>

          <p>
            <strong>
              Update:
            </strong>{" "}
            Every 3 seconds
          </p>

          <p>
            <strong>
              Last Update:
            </strong>{" "}
            {new Date(
              sensor.timestamp
            ).toLocaleTimeString()}
          </p>

          <p>
            <strong>
              Dashboard Connection:
            </strong>{" "}
            {lastUpdate
              ? "Connected"
              : "Waiting for data"}
          </p>

        </div>

      </div>

      <div className="monitoring-note">

        <h3>
          Monitoring Thresholds
        </h3>

        <p>
          QuakeAlert currently uses experimental
          vibration levels for this prototype:
          0–2 Normal, 2–5 Warning, and 5+
          Critical.
        </p>

        <p>
          These prototype thresholds are for
          system demonstration and are not
          official earthquake safety measurements.
        </p>

      </div>

    </div>
  );
}

export default Monitoring;