import {
  useContext,
  useEffect,
  useState
} from "react";

import {
  SubscriptionContext
} from "../context/SubscriptionContext";

function Devices() {
  const {
    plan,
    maxDevices
  } = useContext(
    SubscriptionContext
  );

  const [devices, setDevices] =
    useState([]);

  const [location, setLocation] =
    useState("");

  const [message, setMessage] =
    useState("");

  const userId =
    localStorage.getItem(
      "quakealertUserId"
    );

  // Load only the devices that belong to the logged-in user
  function loadDevices() {
    const currentUserId =
      localStorage.getItem(
        "quakealertUserId"
      );

    if (!currentUserId) {
      setMessage(
        "User account could not be identified."
      );
      return;
    }

    fetch(
      `http://localhost:5000/api/devices/${currentUserId}`
    )
      .then((response) =>
        response.json()
      )
      .then((result) => {
        if (result.success) {
          setDevices(
            result.devices
          );
        } else {
          setMessage(
            result.message
          );
        }
      })
      .catch((error) => {
        console.error(
          "Load devices error:",
          error
        );

        setMessage(
          "Unable to load your devices."
        );
      });
  }

  // Load devices when the page opens, and refresh every 3 seconds
  // so the device status (ONLINE / OFFLINE) stays up to date
  useEffect(() => {
    loadDevices();

    const interval = setInterval(() => {
      loadDevices();
    }, 3000);

    return () => clearInterval(interval);
  }, [userId]);

  function addDevice() {
    if (
      devices.length >=
      maxDevices
    ) {
      setMessage(
        plan === "FREE"
          ? "Your Free Plan allows only 1 device. Upgrade to the PRO Plan to connect up to 3 devices."
          : "You have reached your device limit."
      );
      return;
    }

    if (!location.trim()) {
      setMessage(
        "Please enter a monitoring location."
      );
      return;
    }

    fetch(
      "http://localhost:5000/api/devices",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          userId:
            Number(userId),
          location:
            location.trim()
        })
      }
    )
      .then((response) =>
        response.json()
      )
      .then((result) => {
        if (result.success) {
          setMessage(
            "Monitoring device added successfully."
          );

          setLocation("");

          // Reload devices from the database
          loadDevices();
        } else {
          setMessage(
            result.message
          );
        }
      })
      .catch((error) => {
        console.error(
          "Add device error:",
          error
        );

        setMessage(
          "Unable to add the monitoring device."
        );
      });
  }

  function removeDevice(
    deviceId
  ) {
    if (
      devices.length === 1
    ) {
      setMessage(
        "You must keep at least one monitoring device."
      );
      return;
    }

    fetch(
      `http://localhost:5000/api/devices/${deviceId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          userId:
            Number(userId)
        })
      }
    )
      .then((response) =>
        response.json()
      )
      .then((result) => {
        if (result.success) {
          setMessage(
            "Device removed successfully."
          );

          // Reload devices from the database
          loadDevices();
        } else {
          setMessage(
            result.message
          );
        }
      })
      .catch((error) => {
        console.error(
          "Remove device error:",
          error
        );

        setMessage(
          "Unable to remove the device."
        );
      });
  }

  return (
    <div className="devices-page">

      <div className="devices-header">

        <div>
          <h1>
            My Devices
          </h1>

          <p>
            Manage your connected
            QuakeAlert monitoring
            devices.
          </p>
        </div>

        <div className="plan-info">

          <strong>
            Current Plan: {plan}
          </strong>

          <span>
            Devices:{" "}
            {devices.length} /{" "}
            {maxDevices}
          </span>

        </div>

      </div>

      <div className="add-device-card">

        <h2>
          Add Monitoring Device
        </h2>

        <p>
          Add a device and choose
          its monitoring location.
        </p>

        <input
          type="text"
          placeholder="Enter monitoring location"
          value={location}
          onChange={(event) =>
            setLocation(
              event.target.value
            )
          }
        />

        <button
          onClick={addDevice}
        >
          + Add Device
        </button>

      </div>

      {message && (
        <div className="device-message">
          {message}
        </div>
      )}

      <div className="device-list">

        {devices.length === 0 ? (

          <div className="device-card">

            <h2>
              No Devices Yet
            </h2>

            <p>
              Add your first QuakeAlert
              monitoring device above.
            </p>

          </div>

        ) : (

          devices.map(
            (device) => (

              <div
                className="device-card"
                key={device.id}
              >

                <div className="device-card-header">

                  <div>

                    <h2>
                      {device.deviceId}
                    </h2>

                    <p>
                      {device.location}
                    </p>

                  </div>

                  <span
                    className={`device-status ${device.status.toLowerCase()}`}
                  >
                    {device.status}
                  </span>

                </div>

                <div className="device-details">

                  <p>
                    <strong>
                      Device ID:
                    </strong>{" "}
                    {device.deviceId}
                  </p>

                  <p>
                    <strong>
                      Location:
                    </strong>{" "}
                    {device.location}
                  </p>

                  <p>
                    <strong>
                      Sensor:
                    </strong>{" "}
                    {device.sensor}
                  </p>

                  <p>
                    <strong>
                      Connection:
                    </strong>{" "}
                    {device.connection}
                  </p>

                </div>

                <button
                  className="remove-device"
                  onClick={() =>
                    removeDevice(
                      device.id
                    )
                  }
                >
                  Remove Device
                </button>

              </div>

            )
          )

        )}

      </div>

    </div>
  );
}

export default Devices;