export type MockBadgeProps = {
  visible: boolean;
  label?: string;
};

export function MockBadge({
  visible,
  label = "mock: true",
}: MockBadgeProps): React.JSX.Element | null {
  if (!visible) return null;

  return (
    <span
      role="status"
      aria-label="Mock data path"
      data-mock="true"
      className="inline-flex items-center border-2 border-verdict-review bg-raised px-2 py-0.5 text-xs font-bold tracking-wider text-verdict-review"
    >
      {label}
    </span>
  );
}
