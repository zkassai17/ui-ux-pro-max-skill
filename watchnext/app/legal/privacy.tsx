import { LegalDoc } from "../../src/components/LegalDoc";
import { PRIVACY } from "../../src/legal/legalText";

export default function PrivacyScreen() {
  return <LegalDoc title="Privacy Policy" sections={PRIVACY} />;
}
