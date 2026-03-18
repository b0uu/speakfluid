import Link from "next/link";
import type { Scenario } from "@/types";

const difficultyColor: Record<string, string> = {
  beginner: "text-emerald",
  intermediate: "text-blue",
  advanced: "text-grey-900",
};

export default function ScenarioCard({ scenario }: { scenario: Scenario }) {
  return (
    <Link
      href={`/session/${scenario.id}`}
      className="group flex flex-col sm:flex-row items-start gap-4 p-5 bg-white rounded-lg border border-grey-200 transition-all duration-200 hover:border-l-[3px] hover:border-l-blue hover:bg-blue-50"
    >
      {/* Emoji icon circle */}
      <div className="flex-shrink-0 w-14 h-14 rounded-full bg-grey-100 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform duration-200">
        {scenario.icon}
      </div>

      {/* Text content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <h3 className="font-display text-lg text-grey-900 leading-tight">
            {scenario.title}
          </h3>
        </div>
        <p className="text-sm text-grey-600 leading-relaxed mb-2">
          {scenario.description}
        </p>
        <div className="flex items-center gap-3">
          <span
            className={`text-xs font-semibold uppercase tracking-wider ${difficultyColor[scenario.difficulty]}`}
          >
            {scenario.difficulty}
          </span>
          <span className="text-xs text-grey-400">
            ~{scenario.targetExchanges} exchanges
          </span>
        </div>
      </div>
    </Link>
  );
}
