/* eslint-disable @typescript-eslint/no-explicit-any */
import { Text, TextInput, StyleSheet } from "react-native";

declare const require: (name: string) => any;

// Two-font system: Inter is the default for ALL body text; titles keep Oxanium
// (the logo font) via the explicit HEADING token in their styles. RN 0.81's Text
// is a plain function component (no `.render` to patch), so we hook the JSX
// runtime: every <Text>/<TextInput> gets a default Inter fontFamily injected,
// chosen by its fontWeight so bold stays bold. A style with an explicit
// fontFamily (a title's HEADING) still wins — it's applied AFTER our default.

const REGULAR = "Inter_400Regular";
const MEDIUM = "Inter_600SemiBold";
const BOLD = "Inter_700Bold";

function familyForWeight(style: unknown): string {
  const flat = (StyleSheet.flatten(style as never) || {}) as { fontWeight?: string | number };
  const w = String(flat.fontWeight ?? "");
  if (w === "700" || w === "800" || w === "900" || w === "bold") return BOLD;
  if (w === "500" || w === "600") return MEDIUM;
  return REGULAR;
}

function inject(type: unknown, props: any): any {
  if (props && (type === Text || type === TextInput)) {
    return { ...props, style: [{ fontFamily: familyForWeight(props.style) }, props.style] };
  }
  return props;
}

function patchRuntime(mod: any): void {
  if (!mod || mod.__fontPatched) return;
  for (const key of ["jsx", "jsxs", "jsxDEV"]) {
    const orig = mod[key];
    if (typeof orig !== "function") continue;
    mod[key] = function (type: unknown, props: any, ...rest: unknown[]) {
      return orig.call(this, type, inject(type, props), ...rest);
    };
  }
  mod.__fontPatched = true;
}

try { patchRuntime(require("react/jsx-runtime")); } catch {}
try { patchRuntime(require("react/jsx-dev-runtime")); } catch {}
