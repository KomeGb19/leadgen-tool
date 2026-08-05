import { cn } from "@/lib/utils";
import { scoreTier } from "@/lib/scoring";

const tierColor = { hot: "#E8A33D", warm: "#4A90D9", cold: "#8A9199" } as const;
const tierLabel = { hot: "HOT", warm: "WARM", cold: "COLD" } as const;

/** Circular score gauge — used on the lead detail header and dashboard top leads. */
export function ScoreRing({ score, size = 64 }: { score: number; size?: number }) {
  const tier = scoreTier(score);
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#333A42"
          strokeWidth={4}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tierColor[tier]}
          strokeWidth={4}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-xl leading-none text-paper">{score}</span>
      </div>
    </div>
  );
}

/** Compact inline version for table rows. */
export function ScoreBadge({ score }: { score: number }) {
  const tier = scoreTier(score);
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn("h-2 w-2 rounded-full")}
        style={{ backgroundColor: tierColor[tier] }}
      />
      <span className="font-mono text-sm text-paper">{score}</span>
      <span className="font-mono text-[10px] text-muted">{tierLabel[tier]}</span>
    </div>
  );
}
