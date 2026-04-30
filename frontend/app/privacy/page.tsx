export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "60px 24px", fontFamily: "Georgia, serif", color: "#1C1917" }}>
      <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#F97316", marginBottom: 8 }}>
        Life By Design
      </p>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Privacy Policy</h1>
      <p style={{ fontSize: 13, color: "#78716C", marginBottom: 48 }}>Last updated: April 2026</p>

      <Section title="1. Who we are">
        Life By Design ("the app") is a personal productivity and life planning application operated by RGB India.
        For questions, contact us at <a href="mailto:connect@rgbindia.com" style={{ color: "#F97316" }}>connect@rgbindia.com</a>.
      </Section>

      <Section title="2. Information we collect">
        We collect your name, email address, and password when you register. We store the plans, goals, habits,
        tasks, and reflections you create within the app.
      </Section>

      <Section title="3. Google Calendar integration">
        If you choose to connect your Google Calendar, we request permission to create, update, and delete
        calendar events on your behalf (<code>calendar.events</code> scope). We use this access solely to sync
        events you create within Life By Design to your Google Calendar.
        <br /><br />
        We do <strong>not</strong> read, store, or share any of your existing Google Calendar data.
        We do not access any other Google services.
        <br /><br />
        You can revoke this access at any time from your{" "}
        <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" style={{ color: "#F97316" }}>
          Google Account permissions page
        </a>.
      </Section>

      <Section title="4. How we use your data">
        We use your data solely to provide the Life By Design service — to display your plans, track your habits,
        and sync your events. We do not sell or share your personal data with third parties.
      </Section>

      <Section title="5. Data storage">
        Your data is stored securely on servers hosted on Amazon Web Services. We use industry-standard
        practices to protect your information.
      </Section>

      <Section title="6. Your rights">
        You can request deletion of your account and all associated data at any time by emailing us at{" "}
        <a href="mailto:connect@rgbindia.com" style={{ color: "#F97316" }}>connect@rgbindia.com</a>.
      </Section>

      <Section title="7. Changes to this policy">
        We may update this policy from time to time. Continued use of the app after changes constitutes
        acceptance of the updated policy.
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
