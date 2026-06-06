/* Open Atlas — Tweaks island. Drives the live token system on :root. */
const OA_TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#3f63ad",
  "warmth": "warm",
  "displayMult": 1,
  "bodySize": 16,
  "contourGap": 26,
  "contourOpacity": 0.5,
  "radius": 2,
  "density": "comfortable"
}/*EDITMODE-END*/;

const ACCENT_HUE = { "#3f63ad": 250, "#2f7e83": 200, "#7a4f86": 320, "#4f7d52": 145 };
const DENSITY_UNIT = { compact: 6, comfortable: 8, roomy: 10 };

function applyOATweaks(t) {
  const r = document.documentElement;
  r.style.setProperty("--accent-h", String(ACCENT_HUE[t.accent] ?? 250));
  r.setAttribute("data-warmth", t.warmth);
  r.style.setProperty("--display-mult", String(t.displayMult));
  r.style.setProperty("--fs-body", t.bodySize + "px");
  r.style.setProperty("--contour-gap", t.contourGap + "px");
  r.style.setProperty("--contour-opacity", String(t.contourOpacity));
  r.style.setProperty("--radius", t.radius + "px");
  r.style.setProperty("--space-unit", (DENSITY_UNIT[t.density] ?? 8) + "px");
}

function OATweaks() {
  const [t, setTweak] = useTweaks(OA_TWEAK_DEFAULTS);
  React.useEffect(() => { applyOATweaks(t); }, [t]);
  return (
    React.createElement(TweaksPanel, { title: "Tweaks" },
      React.createElement(TweakSection, { label: "Identity" }),
      React.createElement(TweakColor, {
        label: "Accent", value: t.accent,
        options: ["#3f63ad", "#2f7e83", "#7a4f86", "#4f7d52"],
        onChange: (v) => setTweak("accent", v),
      }),
      React.createElement(TweakRadio, {
        label: "Paper warmth", value: t.warmth,
        options: ["warm", "neutral", "cool"],
        onChange: (v) => setTweak("warmth", v),
      }),
      React.createElement(TweakSection, { label: "Type scale" }),
      React.createElement(TweakSlider, {
        label: "Display", value: t.displayMult, min: 0.85, max: 1.25, step: 0.05, unit: "×",
        onChange: (v) => setTweak("displayMult", v),
      }),
      React.createElement(TweakSlider, {
        label: "Body", value: t.bodySize, min: 14, max: 19, step: 1, unit: "px",
        onChange: (v) => setTweak("bodySize", v),
      }),
      React.createElement(TweakSection, { label: "Cartography" }),
      React.createElement(TweakSlider, {
        label: "Contour gap", value: t.contourGap, min: 14, max: 44, step: 2, unit: "px",
        onChange: (v) => setTweak("contourGap", v),
      }),
      React.createElement(TweakSlider, {
        label: "Contour strength", value: t.contourOpacity, min: 0, max: 1, step: 0.1,
        onChange: (v) => setTweak("contourOpacity", v),
      }),
      React.createElement(TweakSection, { label: "Form" }),
      React.createElement(TweakRadio, {
        label: "Radius", value: t.radius,
        options: [{ value: 0, label: "0" }, { value: 2, label: "2" }, { value: 4, label: "4" }, { value: 8, label: "8" }],
        onChange: (v) => setTweak("radius", v),
      }),
      React.createElement(TweakRadio, {
        label: "Density", value: t.density,
        options: ["compact", "comfortable", "roomy"],
        onChange: (v) => setTweak("density", v),
      }),
    )
  );
}

/* Apply defaults immediately (before panel ever opens) so the page reflects them. */
applyOATweaks(OA_TWEAK_DEFAULTS);

ReactDOM.createRoot(document.getElementById("tweaks-root")).render(React.createElement(OATweaks));
