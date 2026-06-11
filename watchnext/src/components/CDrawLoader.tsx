import { useEffect, useState } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Svg, { Defs, Mask, Circle, Image as SvgImage } from "react-native-svg";
import { cDrawFrame } from "../lib/cDrawFrame";

// "Your real c, drawing itself" — the watchnext wordmark with a gap, and the
// `c` revealed in that gap by a circle-stroke mask whose dash grows then shrinks
// over a 1.7s loop. Faithful port of the source HTML/CSS animation. Geometry
// (viewBox, circle, image placement) matches the original 1:1.

const VB_W = 1246;
const VB_H = 490;
const DURATION = 1700; // ms, one loop — matches the source @keyframes

// The source used SVG `pathLength="100"` so dash values read as percentages.
// react-native-svg has no pathLength, so we scale those percentages by the real
// circle circumference (2πr, r=48) to get equivalent dash lengths.
const CIRCUMFERENCE = 2 * Math.PI * 48;
const pct = (v: number) => (v / 100) * CIRCUMFERENCE;

const baseSrc = require("../../assets/c-base.png"); // wordmark with the c-gap
const revealSrc = require("../../assets/c-reveal.png"); // the c that draws in

// Only this tiny element re-renders each frame; the image layers stay mounted.
function DrawCircle() {
  const [frame, setFrame] = useState(() => cDrawFrame(0));

  useEffect(() => {
    let raf = 0;
    let start: number | null = null;
    const tick = (ts: number) => {
      if (start === null) start = ts;
      setFrame(cDrawFrame(((ts - start) % DURATION) / DURATION));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <Circle
      cx={536}
      cy={254}
      r={48}
      fill="none"
      stroke="#fff"
      strokeWidth={56}
      strokeLinecap="butt"
      strokeDasharray={[pct(frame.dashA), pct(frame.dashB)]}
      strokeDashoffset={pct(frame.offset)}
    />
  );
}

export interface CDrawLoaderProps {
  /** Logo width in px. Defaults to ~72% of screen width (max 300). */
  size?: number;
  /** Hold blank for this many ms before showing — for "taking longer than it should". */
  delay?: number;
}

export function CDrawLoader({ size, delay = 0 }: CDrawLoaderProps) {
  const [shown, setShown] = useState(delay === 0);

  useEffect(() => {
    if (delay === 0) return;
    const id = setTimeout(() => setShown(true), delay);
    return () => clearTimeout(id);
  }, [delay]);

  // Reserve the same centered space while waiting, so nothing jumps when it appears.
  if (!shown) return <View style={styles.wrap} />;

  const width = size ?? Math.min(Dimensions.get("window").width * 0.72, 300);
  const height = (width * VB_H) / VB_W;

  return (
    <View style={styles.wrap} accessibilityRole="progressbar" accessibilityLabel="Loading">
      <Svg width={width} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`}>
        <Defs>
          <Mask id="rev" maskUnits="userSpaceOnUse">
            <DrawCircle />
          </Mask>
        </Defs>
        <SvgImage
          href={baseSrc}
          x={0}
          y={0}
          width={VB_W}
          height={VB_H}
          preserveAspectRatio="xMidYMid meet"
        />
        <SvgImage
          href={revealSrc}
          x={490}
          y={192}
          width={93}
          height={125}
          preserveAspectRatio="none"
          mask="url(#rev)"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center" },
});
