interface LogoIconProps {
  size?: "sm" | "md" | "lg";
}

export function LogoIcon({ size = "md" }: LogoIconProps) {
  const sizeClass = 
    size === "lg" ? "size-20" : size === "sm" ? "size-6" : "size-7";

  return (
    <img
      src="/logo.png"
      alt="Logo TugasKita"
      className={`${sizeClass} object-contain`}
    />
  );
}