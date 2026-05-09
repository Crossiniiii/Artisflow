export type StaffWelcomeEmailPayload = {
  to: string;
  name: string;
};

const EMAIL_API_BASE = (import.meta as any).env?.VITE_EMAIL_API_BASE || 'http://localhost:4000';

/**
 * Escapes HTML special characters to prevent XSS attacks
 */
const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export async function sendStaffWelcomeEmail(payload: StaffWelcomeEmailPayload): Promise<void> {
  const subject = 'Welcome to ArtisFlow';
  const safeName = payload.name ? escapeHtml(payload.name) : 'there';
  const text = `Hi ${payload.name || 'there'},\n\nYou have been added as a staff member in ArtisFlow.\nYou can now sign in using your registered email.\n\nArtisFlow System`;
  const html = `<p>Hi ${safeName},</p><p>You have been added as a staff member in <strong>ArtisFlow</strong>.</p><p>You can now sign in using your registered email.</p><p>ArtisFlow System</p>`;

  try {
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
      }),
      // Add a short timeout to avoid hanging
      signal: AbortSignal.timeout(3000)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.warn(`Email server responded with error: ${response.status}. Skipping welcome email.`);
    }
  } catch (error) {
    // Silently ignore connection errors in development environments
    // This prevents the "Failed to fetch" TypeError from cluttering the console
    if (error instanceof TypeError || (error as any).name === 'AbortError') {
      console.info('Email service unavailable. Skipping welcome email.');
    } else {
      console.error('Unexpected error in email service:', error);
    }
  }
}

