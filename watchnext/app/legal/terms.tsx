import { LegalDoc } from "../../src/components/LegalDoc";
import { TERMS } from "../../src/legal/legalText";

export default function TermsScreen() {
  return <LegalDoc title="Terms of Use" sections={TERMS} />;
}
