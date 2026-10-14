import { createRoot } from "react-dom/client";
import "./App.css";
import App from "./App";
import SubscriptionProvider from "./context/SubscriptionContext";

createRoot(document.getElementById("root")).render(
  <SubscriptionProvider>
    <App />
  </SubscriptionProvider>
);