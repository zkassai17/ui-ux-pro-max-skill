import { Text, TextInput, StyleSheet } from "react-native";

// Make Oxanium (the logo typeface) the default font for ALL text in the app.
// We inject a default fontFamily on every Text/TextInput, chosen by the element's
// fontWeight so bold labels stay bold. Any explicit `fontFamily` in a style (e.g.
// the HEADING token on titles) still wins, because the component's own style is
// applied AFTER our injected default.

const REGULAR = "Oxanium_400Regular";
const MEDIUM = "Oxanium_600SemiBold";
const BOLD = "Oxanium_700Bold";

function familyForWeight(style: unknown): string {
  const flat = (StyleSheet.flatten(style as never) || {}) as { fontWeight?: string | number };
  const w = String(flat.fontWeight ?? "");
  if (w === "700" || w === "800" || w === "900" || w === "bold") return BOLD;
  if (w === "500" || w === "600") return MEDIUM;
  return REGULAR;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function patch(Comp: any): void {
  if (!Comp || Comp.__fontPatched || typeof Comp.render !== "function") return;
  const orig = Comp.render;
  Comp.render = function (props: any, ref: any) {
    const fam = familyForWeight(props?.style);
    const merged = { ...props, style: [{ fontFamily: fam }, props?.style] };
    return orig.call(this, merged, ref);
  };
  Comp.__fontPatched = true;
}

patch(Text);
patch(TextInput);
