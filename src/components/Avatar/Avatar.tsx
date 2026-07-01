import { AVATAR_ICONS } from "@/lib/avatar";

interface AvatarProps {
  full_name: string;
  icon?: string;
  color?: string;
  size?: "sm" | "md" | "lg";
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

export default function Avatar({ full_name, icon, color, size = "sm", className = "" }: AvatarProps) {
  const iconData = icon ? AVATAR_ICONS.find((i) => i.id === icon) : undefined;
  const bgColor = color ?? "#6366f1";

  if (iconData) {
    return (
      <div
        className={`rounded-full flex items-center justify-center shrink-0 ${sizeClasses[size]} ${className}`}
        style={{ backgroundColor: bgColor }}
      >
        <span className={emojiSizes[size]} style={{ lineHeight: 1 }}>
          {iconData.emoji}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold shrink-0 text-white ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: bgColor }}
    >
      <span>{full_name?.charAt(0)?.toUpperCase() ?? "U"}</span>
    </div>
  );
}
