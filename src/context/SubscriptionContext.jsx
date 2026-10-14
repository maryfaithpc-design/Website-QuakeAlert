import {
  createContext,
  useEffect,
  useState
} from "react";

export const SubscriptionContext =
  createContext();

function SubscriptionProvider({
  children
}) {
  const [plan, setPlan] = useState(() => {
    return (
      localStorage.getItem(
        "quakealertPlan"
      ) || "FREE"
    );
  });

  const [maxDevices, setMaxDevices] =
    useState(() => {
      const savedPlan =
        localStorage.getItem(
          "quakealertPlan"
        ) || "FREE";

      return savedPlan === "PRO"
        ? 3
        : 1;
    });

  function updatePlan() {
    const savedPlan =
      localStorage.getItem(
        "quakealertPlan"
      ) || "FREE";

    setPlan(savedPlan);

    setMaxDevices(
      savedPlan === "PRO"
        ? 3
        : 1
    );
  }

  useEffect(() => {
    updatePlan();

    window.addEventListener(
      "quakealertPlanChanged",
      updatePlan
    );

    return () => {
      window.removeEventListener(
        "quakealertPlanChanged",
        updatePlan
      );
    };
  }, []);

  function refreshPlan() {
    updatePlan();
  }

  function upgradeToPro() {
    localStorage.setItem(
      "quakealertPlan",
      "PRO"
    );

    setPlan("PRO");
    setMaxDevices(3);
  }

  function downgradeToFree() {
    localStorage.setItem(
      "quakealertPlan",
      "FREE"
    );

    setPlan("FREE");
    setMaxDevices(1);
  }

  return (
    <SubscriptionContext.Provider
      value={{
        plan,
        maxDevices,
        refreshPlan,
        upgradeToPro,
        downgradeToFree
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export default SubscriptionProvider;