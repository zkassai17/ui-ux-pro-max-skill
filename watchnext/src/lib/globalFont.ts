/* eslint-disable @typescript-eslint/no-explicit-any */
import { Text, TextInput, StyleSheet } from "react-native";

declare const require: (name: string) => any;

// Make Oxanium (the logo typeface) the default font for ALL text in the app.
// RN 0.81's Text is a plain function component (no `.render` to patch), so we
// hook the JSX runtime instead: every <Text>/<TextInput> element gets a default
// fontFamily injected, chosen by its fontWeight so bold stays bold. A style with
// an explicit fontFamily (e.g. a title's HEADING token) still wins, because the
// element's own style is applied AFTER our injected default.

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
