export default function TermsPage() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "60px 24px", fontFamily: "Georgia, serif", color: "#1C1917" }}>
      <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#F97316", marginBottom: 8 }}>
        Life By Design
      </p>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Terms and Conditions</h1>
      <p style={{ fontSize: 13, color: "#78716C", marginBottom: 48 }}>Last updated: April 2026</p>

      <Section title="1. Acceptance of terms">
        By accessing or using Life By Design ("the app"), you agree to be bound by these Terms and Conditions.
        If you do not agree, please do not use the app.
      </Section>

      <Section title="2. Use of the app">
        Life By Design is a personal productivity and life planning tool. You may use it only for lawful,
        personal purposes. You are responsible for maintaining the confidentiality of your account credentials.
      </Section>

      <Section title="3. Google Calendar integration">
        If you connect your Google Calendar, you authorise Life By Design to create, update, and delete
        calendar events on your behalf. You may disconnect this integration at any time from within the app
        or from your{" "}
        <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" style={{ color: "#F97316" }}>
          Google Account permissions page
        </a>.
        We are not responsible for any data loss resulting from revoking calendar access.
      </Section>

      <Section title="4. Intellectual property">
        All content, design, and code within Life By Design is the property of RGB India. You may not
        reproduce, distribute, or create derivative works without written permission.
      </Section>

      <Section title="5. Disclaimer">
        Life By Design is provided "as is" without warranties of any kind. We do not guarantee uninterrupted
        or error-free operation of the app.
      </Section>

      <Section title="6. Limitation of liability">
        RGB India shall not be liable for any indirect, incidental, or consequential damages arising from
        your use of the app.
      </Section>

      <Section title="7. Changes to terms">
        We reserve the right to update these terms at any time. Continued use of the app after changes
        constitutes acceptance of the updated terms.
      </Section>

      <Section title="8. Contact">
        For any questions regarding these terms, contact us at{" "}
        <a href="mailto:connect@rgbindia.com" style={{ color: "#F97316" }}>connect@rgbindia.com</a>.
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, color: "#1C1917" }}>{title}</h2>
      <p style={{ fontSize: 15, lineHeight: 1.8, color: "#44403C", margin: 0 }}>{children}</p>
    </div>
  );
}
