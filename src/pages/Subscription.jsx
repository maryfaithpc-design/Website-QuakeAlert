import {
  useContext,
  useEffect,
  useRef,
  useState
} from "react";

import { SubscriptionContext } from "../context/SubscriptionContext";

function Subscription() {
  const paypalRef = useRef(null);

  const {
    plan,
    upgradeToPro
  } = useContext(SubscriptionContext);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const clientId =
    "BAAJnX2zAu0WD-6CDxYTvzJTxl9gnnxeYY1VbOqL-VADqEqwmYPTbW5N3AwGNd6T1paraTVZJWlLwFIboY";

  const planId =
    "P-96S3081159522614MNK2UD4Y";

  useEffect(() => {
    function loadPayPal() {
      if (!window.paypal) {
        setLoading(false);
        setMessage(
          "PayPal SDK was not loaded."
        );
        return;
      }

      if (!paypalRef.current) {
        setLoading(false);
        setMessage(
          "PayPal container was not found."
        );
        return;
      }

      // Prevent duplicate PayPal buttons
      if (
        paypalRef.current.children.length > 0
      ) {
        setLoading(false);
        return;
      }

      window.paypal
        .Buttons({
          style: {
            layout: "vertical",
            shape: "rect",
            label: "paypal"
          },

          createSubscription(
            data,
            actions
          ) {
            console.log(
              "Creating PayPal subscription..."
            );

            return actions.subscription.create({
              plan_id: planId
            });
          },

          onApprove(data) {
            console.log(
              "PayPal subscription approved:",
              data
            );

            const userId =
              localStorage.getItem(
                "quakealertUserId"
              );

            if (!userId) {
              setLoading(false);

              setMessage(
                "Your PayPal payment was approved, but your QuakeAlert account could not be identified. Please login again."
              );

              return;
            }

            fetch(
              "http://localhost:5000/api/paypal/activate",
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json"
                },
                body: JSON.stringify({
                  subscriptionId:
                    data.subscriptionID,
                  userId: Number(userId)
                })
              }
            )
              .then((response) =>
                response.json()
              )
              .then((result) => {
                console.log(
                  "Subscription activation:",
                  result
                );

                if (result.success) {
                  // Update React subscription state
                  upgradeToPro();

                  // Save the plan locally
                  localStorage.setItem(
                    "quakealertPlan",
                    "PRO"
                  );

                  setMessage(
                    "Subscription successful! Your QuakeAlert Pro Plan is now active."
                  );
                } else {
                  setMessage(
                    "PayPal payment succeeded, but the Pro Plan could not be activated."
                  );
                }

                setLoading(false);
              })
              .catch((error) => {
                console.error(
                  "Subscription activation error:",
                  error
                );

                setLoading(false);

                setMessage(
                  "Payment succeeded, but there was a problem activating your plan."
                );
              });
          },

          onCancel() {
            setLoading(false);

            setMessage(
              "PayPal subscription was cancelled."
            );
          },

          onError(error) {
            console.error(
              "PayPal Button Error:",
              error
            );

            setLoading(false);

            setMessage(
              "PayPal error. Check the browser Console."
            );
          }
        })
        .render(paypalRef.current)
        .then(() => {
          console.log(
            "PayPal button rendered."
          );

          setLoading(false);
        })
        .catch((error) => {
          console.error(
            "PayPal render error:",
            error
          );

          setLoading(false);

          setMessage(
            "PayPal button could not be rendered."
          );
        });
    }

    const existingScript =
      document.getElementById(
        "paypal-sdk"
      );

    if (existingScript) {
      if (window.paypal) {
        loadPayPal();
      } else {
        existingScript.addEventListener(
          "load",
          loadPayPal,
          {
            once: true
          }
        );
      }

      return;
    }

    const script =
      document.createElement("script");

    script.id = "paypal-sdk";

    script.src =
      `https://www.paypal.com/sdk/js?client-id=${clientId}` +
      `&vault=true&intent=subscription`;

    script.async = true;

    script.onload = () => {
      console.log(
        "PayPal SDK loaded."
      );

      loadPayPal();
    };

    script.onerror = () => {
      console.error(
        "PayPal SDK failed to load."
      );

      setLoading(false);

      setMessage(
        "Unable to load PayPal SDK."
      );
    };

    document.body.appendChild(script);

    return () => {
      if (paypalRef.current) {
        paypalRef.current.innerHTML = "";
      }
    };
  }, [upgradeToPro]);

  return (
    <div className="subscription-page">
      <div className="subscription-header">
        <h1>Subscription</h1>

        <p>
          Upgrade your QuakeAlert account for
          more monitoring features.
        </p>
      </div>

      <div className="subscription-card">
        <div className="plan-badge">
          PRO PLAN
        </div>

        <h2>
          QuakeAlert Pro
        </h2>

        <div className="price">
          ₱99
          <span>/month</span>
        </div>

        <p className="plan-description">
          Get extended earthquake and
          structural vibration monitoring
          features.
        </p>

        <div className="plan-features">
          <p>
            ✓ Up to 3 ESP32 devices
          </p>

          <p>
            ✓ Multiple monitoring locations
          </p>

          <p>
            ✓ Detailed alert history
          </p>

          <p className="feature-soon">
            ○ Earthquake and vibration
            notifications
            <span className="soon-tag">
              Coming soon
            </span>
          </p>

          <p className="feature-soon">
            ○ Location-based alerts
            <span className="soon-tag">
              Coming soon
            </span>
          </p>

          <p>
            ✓ Downloadable reports
          </p>

          <p className="feature-soon">
            ○ Extended monitoring history
            <span className="soon-tag">
              Coming soon
            </span>
          </p>

          <p>
            ✓ Real-time monitoring
          </p>
        </div>

        {plan === "PRO" && (
          <div className="plan-active">
            <strong>Your PRO Plan is active.</strong>{" "}
            You can connect up to 3 devices.
          </div>
        )}

        <div
          className="paypal-section"
          style={{
            display:
              plan === "PRO"
                ? "none"
                : "block"
          }}
        >
          <h3>
            Subscribe with PayPal
          </h3>

          {loading && (
            <p>
              Loading PayPal...
            </p>
          )}

          <div
            ref={paypalRef}
            id="paypal-button-container"
          ></div>
        </div>

        {message && (
          <div className="subscription-message">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

export default Subscription;