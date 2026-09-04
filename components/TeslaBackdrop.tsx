// Tesla-side background: a static, near-black gradient — no animation, no
// canvas. The SpaceX side has the animated `Starfield.tsx`; the Robotaxi side
// gets a quiet dark wash instead of pure black. A cool charcoal glow drifts up
// from the lower-left with a subtle darker vignette at the edges.
export default function TeslaBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10"
      style={{
        backgroundColor: "#08090c",
        backgroundImage:
          "radial-gradient(120% 80% at 15% 100%, rgba(70, 84, 110, 0.22) 0%, rgba(70, 84, 110, 0) 55%)," +
          "radial-gradient(100% 70% at 85% 0%, rgba(40, 46, 60, 0.28) 0%, rgba(40, 46, 60, 0) 50%)," +
          "linear-gradient(180deg, #0b0c10 0%, #08090c 45%, #060608 100%)",
      }}
    />
  );
}
