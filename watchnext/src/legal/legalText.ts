// Single source of truth for the app's legal documents. The in-app screens
// (app/legal/*) render these, and docs/legal/*.md mirror them for hosting the
// public Privacy Policy URL that App Store Connect requires.

export const LEGAL_UPDATED = "July 16, 2026";
export const LEGAL_CONTACT = "zkassai17@gmail.com"; // support + legal contact

export type LegalSection = { h: string; p: string[] };

export const TERMS: LegalSection[] = [
  {
    h: "1. Agreement",
    p: [
      "These Terms of Use (\"Terms\") are a legal agreement between you and watchnext (\"watchnext\", \"we\", \"us\"). By creating an account or using the app you agree to these Terms and to our Privacy Policy. If you do not agree, do not use watchnext.",
    ],
  },
  {
    h: "2. Who can use watchnext",
    p: [
      "You must be at least 13 years old to use watchnext. By using the app you confirm that you meet this requirement and that the information you provide is accurate.",
    ],
  },
  {
    h: "3. Your account",
    p: [
      "You are responsible for keeping your account secure and for all activity that happens under it. Tell us right away if you believe your account has been compromised. You may delete your account at any time from Settings, which permanently removes your data as described in the Privacy Policy.",
    ],
  },
  {
    h: "4. User content and zero-tolerance policy",
    p: [
      "watchnext lets you post content such as reviews, notes, and a public profile that other users can see. You own your content, and you grant watchnext a non-exclusive license to store and display it to other users as part of the service.",
      "There is ZERO TOLERANCE for objectionable content or abusive behavior. You may not post content that is unlawful, defamatory, obscene, pornographic, harassing, threatening, hateful, or that promotes discrimination, violence, or harm toward any person or group. You may not impersonate others or infringe anyone's rights.",
      "We may remove content and suspend or terminate accounts that violate this policy. We review reports of objectionable content and abusive users and act on valid reports — including removing the content and ejecting the user — within 24 hours.",
    ],
  },
  {
    h: "5. Reporting and blocking",
    p: [
      "You can report content or users you find objectionable, and you can block users so you no longer see their content or interact with them. We encourage you to use these tools; we take reports seriously.",
    ],
  },
  {
    h: "6. Acceptable use",
    p: [
      "Do not misuse the service: no scraping, reverse engineering, automated abuse, attempts to break security, or interference with other users' enjoyment of watchnext.",
    ],
  },
  {
    h: "7. Third-party data",
    p: [
      "Movie and TV information is provided by The Movie Database (TMDB). This product uses the TMDB API but is not endorsed or certified by TMDB. Availability and streaming information may be inaccurate or out of date.",
    ],
  },
  {
    h: "8. Disclaimers",
    p: [
      "watchnext is provided \"as is\" without warranties of any kind. We do not guarantee that the app will be uninterrupted, error-free, or that recommendations or data will be accurate.",
    ],
  },
  {
    h: "9. Limitation of liability",
    p: [
      "To the fullest extent permitted by law, watchnext is not liable for any indirect, incidental, or consequential damages arising from your use of the app.",
    ],
  },
  {
    h: "10. Changes and termination",
    p: [
      "We may update these Terms from time to time; continued use after an update means you accept the new Terms. We may suspend or end access to the service, and you may stop using it at any time by deleting your account.",
    ],
  },
  {
    h: "11. Contact",
    p: [
      "Questions about these Terms? Contact us at " + LEGAL_CONTACT + ".",
    ],
  },
];

export const PRIVACY: LegalSection[] = [
  {
    h: "Overview",
    p: [
      "This Privacy Policy explains what watchnext (\"we\", \"us\") collects, how we use it, and the choices you have. By using watchnext you agree to this policy.",
    ],
  },
  {
    h: "Information we collect",
    p: [
      "Account information: your email address and the username you choose.",
      "Your activity: the movies and shows you add, their status (want, watching, watched), your ratings, your reviews and notes, and your friend connections.",
      "Content you post: reviews, notes, and recommendations, which may be visible to other users.",
      "Basic technical data needed to run the app, such as authentication tokens on your device.",
    ],
  },
  {
    h: "How we use your information",
    p: [
      "To provide the service — save your library, generate recommendations, and power social features like friends, blends, and the activity feed.",
      "To keep watchnext safe — review reports, enforce our Terms, and prevent abuse.",
      "We do not sell your personal information, and we do not use it for third-party advertising.",
    ],
  },
  {
    h: "How your information is shared",
    p: [
      "With other users: your username, public profile, reviews, and activity are visible to your friends and, where you choose, to other users. You control what you share and can block users.",
      "With service providers: we use Supabase to host our database and handle authentication. Movie and TV data is retrieved from The Movie Database (TMDB) when you browse or search.",
      "We share information only as needed to run the app or when required by law.",
    ],
  },
  {
    h: "Data retention and deletion",
    p: [
      "We keep your information while your account is active. You can permanently delete your account at any time from Settings → Delete account, which removes your profile, library, reviews, and connections. You can also export your library data from Settings.",
    ],
  },
  {
    h: "Security",
    p: [
      "We use industry-standard measures, including encrypted connections and row-level access controls, to protect your data. No system is perfectly secure, but we work to keep your information safe.",
    ],
  },
  {
    h: "Children",
    p: [
      "watchnext is not intended for children under 13, and we do not knowingly collect information from them.",
    ],
  },
  {
    h: "Your choices",
    p: [
      "You can edit your profile, control what you share, block other users, export your data, and delete your account — all from within the app.",
    ],
  },
  {
    h: "Changes to this policy",
    p: [
      "We may update this policy from time to time. We will reflect the latest revision date at the top, and continued use of watchnext means you accept the updated policy.",
    ],
  },
  {
    h: "Contact",
    p: [
      "Questions about your privacy? Contact us at " + LEGAL_CONTACT + ".",
    ],
  },
];
