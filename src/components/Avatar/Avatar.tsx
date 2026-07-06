import { AVATAR_ICONS } from "@/lib/avatar";

interface AvatarProps {
  full_name: string;
  icon?: string;
  color?: string;
  size?: "sm" | "md" | "lg";
  badge?: number;
  className?: string;
}

const sizeClasses = {
  sm: "w-9 h-9 text-sm",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-xl",
};

const emojiSizes = {
  sm: "text-base leading-none",
  md: "text-lg leading-none",
  lg: "text-2xl leading-none",
};

export default function Avatar({ full_name, icon, color, size = "sm", badge, className = "" }: AvatarProps) {
  const iconData = icon ? AVATAR_ICONS.find((i) => i.id === icon) : undefined;
  const bgColor = color ?? "#6366f1";

  const badgeEl = badge !== undefined && badge > 0 ? (
    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none ring-2 ring-white dark:ring-slate-800">
      {badge > 99 ? "99+" : badge}
    </span>
  ) : null;

  if (iconData) {
    return (
      <div
        className={`relative rounded-full flex items-center justify-center shrink-0 ${sizeClasses[size]} ${className}`}
        style={{ backgroundColor: bgColor }}
      >
        <span className={emojiSizes[size]} style={{ lineHeight: 1 }}>
          {iconData.emoji}
        </span>
        {badgeEl}
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-full flex items-center justify-center font-bold shrink-0 text-white ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: bgColor }}
    >
      <span>{full_name?.charAt(0)?.toUpperCase() ?? "U"}</span>
      {badgeEl}
    </div>
  );
}
