import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { TriggerEngine, type TriggerStatus } from "@clinibox/protocol-engine";
import { createSimulatorDriver, type Scenario, type VitalsSample } from "./telemetry";

/**
 * App-wide vitals stream + autonomous trigger engine.
 *
 * Lives above the tab navigator so a critical trigger can interrupt the UI
 * no matter which screen is open. The trigger engine evaluates every sample
 * synchronously; the alert overlay reacts to `trigger` state.
 */

interface VitalsContextValue {
  scenario: Scenario;
  setScenario: (s: Scenario) => void;
  sample: VitalsSample | null;
  trigger: TriggerStatus;
  resolveTrigger: () => void;
}

const VitalsContext = createContext<VitalsContextValue | null>(null);

export function VitalsProvider({ children }: { children: ReactNode }) {
  const [scenario, setScenarioState] = useState<Scenario>("estable");
  const [sample, setSample] = useState<VitalsSample | null>(null);
  const engineRef = useRef(new TriggerEngine());
  const [trigger, setTrigger] = useState<TriggerStatus>(engineRef.current.current);

  useEffect(() => {
    const stop = createSimulatorDriver(scenario).start((s) => {
      setSample(s);
      setTrigger(engineRef.current.feed(s, s.timestamp));
    });
    return stop;
  }, [scenario]);

  const setScenario = (s: Scenario) => {
    // switching scenario represents a new situation: re-arm the engine
    engineRef.current.resolve();
    setTrigger(engineRef.current.current);
    setScenarioState(s);
  };

  const resolveTrigger = () => {
    setTrigger(engineRef.current.resolve());
  };

  return (
    <VitalsContext.Provider
      value={{ scenario, setScenario, sample, trigger, resolveTrigger }}
    >
      {children}
    </VitalsContext.Provider>
  );
}

export function useVitals(): VitalsContextValue {
  const ctx = useContext(VitalsContext);
  if (!ctx) throw new Error("useVitals must be used inside VitalsProvider");
  return ctx;
}
