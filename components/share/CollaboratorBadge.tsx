import { initials, cn } from "@/lib/utils";

interface Props {
  name: string;
  color: string;
  role?: "owner" | "editor" | "viewer";
  size?: "sm" | "md";
  showRole?: boolean;
}

export function CollaboratorBadge({ name, color, role, size = "md", showRole = false }: Props) {
  const sizes = {
    sm: { avatar: "w-6 h-6 text-[10px]", text: "text-xs", padding: "px-2 py-1" },
    md: { avatar: "w-7 h-7 text-[11px]", text: "text-sm", padding: "px-3 py-1.5" },
  };
  const s = sizes[size];

  return (
    <div className={cn("flex items-center gap-2 bg-white rounded-full border border-sand-100", s.padding)}>
      <div
        className={cn("rounded-full flex items-center justify-center font-bold text-white", s.avatar)}
        style={{ background: color }}
      >
        {initials(name)}
      </div>
      <span className={cn("font-medium text-sand-700", s.text)}>{name}</span>
      {showRole && role && (
        <span className={cn(
          "chip text-[10px] ml-1",
          role === "owner" ? "bg-amber/10 text-amber" :
          role === "editor" ? "bg-ocean/10 text-ocean" :
          "bg-sand-100 text-sand-500"
        )}>
          {role}
        </span>
      )}
    </div>
  );
}
