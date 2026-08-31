/**
 * Brand assets.
 *
 * - `/images/logo.png`      full lockup (Buddha mark + "LAUGHING BUDDHA" wordmark)
 * - `/images/logo-mark.png` mark only, for tight spots (nav, cart bar, avatars)
 *
 * Both files are gold artwork on a black plate, so on non-black surfaces the
 * mark is placed inside a dark rounded chip rather than sitting bare.
 */

export function LogoMark({
  size = 40,
  className = "",
  rounded = "rounded-xl",
}: {
  size?: number;
  className?: string;
  rounded?: string;
}) {
  return (
    <span
      className={`inline-grid shrink-0 place-items-center overflow-hidden bg-black ring-1 ring-gold-500/40 ${rounded} ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src="/images/logo-mark.png"
        alt="Laughing Buddha"
        width={size}
        height={size}
        className="h-full w-full scale-110 object-cover"
      />
    </span>
  );
}

export function LogoLockup({
  className = "",
  width = 260,
  priority = false,
}: {
  className?: string;
  width?: number;
  priority?: boolean;
}) {
  return (
    <img
      src="/images/logo.png"
      alt="Laughing Buddha — modern Thai kitchen, Gulshan Dhaka"
      width={width}
      height={width}
      loading={priority ? "eager" : "lazy"}
      // The artwork ships on a black plate; `mix-blend-screen` drops that plate
      // so the gold sits cleanly on any dark background.
      className={`mix-blend-screen select-none ${className}`}
      style={{ width }}
    />
  );
}
