import { scenarios } from "@/lib/scenarios";
import ScenarioCard from "./ScenarioCard";

export default function ScenarioGrid() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {scenarios.map((scenario) => (
        <ScenarioCard key={scenario.id} scenario={scenario} />
      ))}
    </div>
  );
}
