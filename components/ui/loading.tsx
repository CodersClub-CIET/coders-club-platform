export function Loading({
  label = "Loading...",
}: {
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 p-4"
    >
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      <span className="text-sm text-muted-foreground">
        {label}
      </span>
    </div>
  );
}