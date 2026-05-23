export function LoadingSkeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={[
        "rounded-lg border border-gold/20 bg-[linear-gradient(135deg,rgba(201,168,76,0.16),rgba(201,168,76,0.06))]",
        "animate-[shimmer_2s_ease-in-out_infinite]",
        className,
      ].join(" ")}
      aria-label="Loading"
    />
  );
}

