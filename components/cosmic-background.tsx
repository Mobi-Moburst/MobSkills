import Image from "next/image";

/**
 * Full-bleed cosmic background (ported from MobPulse's login screen).
 * Render inside a `fixed inset-0` parent; foreground content sits above it.
 * Layers: zoomed background image → dark scrim → radial vignette fading to the
 * app background color at the edges.
 */
export function CosmicBackground() {
  return (
    <>
      <Image src="/login-bg.png" alt="" fill priority className="scale-110 object-cover object-[45%_100%]" />
      <div className="absolute inset-0 bg-background/65" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 0%, transparent 55%, var(--color-background) 100%)",
        }}
      />
    </>
  );
}
