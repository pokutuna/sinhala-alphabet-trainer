import type { Badge, BadgeTone } from "~/lib/courses";

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  warn: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  info: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  muted: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

/**
 * Small pill row that surfaces a character's frequency / exception status
 * (まれ / 綴り字専用 / 外来語 / 借用). Shared by the lesson overview chips and
 * the character detail view. Renders nothing when there are no badges.
 */
export function CharBadges({
  badges,
  size = "sm",
}: {
  badges: Badge[];
  size?: "xs" | "sm";
}) {
  if (badges.length === 0) return null;
  const pad =
    size === "xs" ? "px-1 py-px text-[0.6rem]" : "px-2 py-0.5 text-xs";
  return (
    <div className="flex flex-wrap gap-1">
      {badges.map((b) => (
        <span
          key={b.label}
          title={b.title}
          className={`rounded-full font-medium ${pad} ${TONE_CLASS[b.tone]}`}
        >
          {b.label}
        </span>
      ))}
    </div>
  );
}
