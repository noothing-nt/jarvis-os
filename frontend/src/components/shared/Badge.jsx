import clsx from "clsx";

const VARIANTS = {
  blue:   "badge-blue",
  green:  "badge-green",
  red:    "badge-red",
  amber:  "badge-amber",
  purple: "badge-purple",
  teal:   "badge-teal",
  gray:   "badge-gray",
};

export default function Badge({ children, variant = "gray", dot = false, className = "" }) {
  return (
    <span className={clsx("badge", VARIANTS[variant] || VARIANTS.gray, className)}>
      {dot && (
        <span className={clsx(
          "w-1.5 h-1.5 rounded-full flex-shrink-0",
          variant === "blue"   && "bg-blue-400",
          variant === "green"  && "bg-success",
          variant === "red"    && "bg-danger",
          variant === "amber"  && "bg-warning",
          variant === "purple" && "bg-purple-400",
          variant === "teal"   && "bg-teal-400",
          variant === "gray"   && "bg-muted",
        )} />
      )}
      {children}
    </span>
  );
}