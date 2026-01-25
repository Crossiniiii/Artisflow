export type StaffWelcomeEmailPayload = {
  to: string;
  name: string;
};

const EMAIL_API_BASE = import.meta.env.VITE_EMAIL_API_BASE || 'http://localhost:4000';

export async function sendStaffWelcomeEmail(payload: StaffWelcomeEmailPayload): Promise<void> {
  const subject = 'Welcome to ArtisFlow';
  const text = `Hi ${payload.name || 'there'},\n\nYou have been added as a staff member in ArtisFlow.\nYou can now sign in using your registered email.\n\nArtisFlow System`;
  const html = `<p>Hi ${payload.name || 'there'},</p><p>You have been added as a staff member in <strong>ArtisFlow</strong>.</p><p>You can now sign in using your registered email.</p><p>ArtisFlow System</p>`;

  const response = await fetch(`${EMAIL_API_BASE}/send-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      to: payload.to,
      subject,
      text,
      html
    })
  });

  if (!response.ok) {
    throw new Error('Failed to send staff welcome email');
  }
}

