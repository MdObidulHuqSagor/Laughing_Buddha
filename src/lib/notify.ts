import { db } from "@/db";
import { ownerNotifications } from "@/db/schema";

type NotifyInput = {
  subject: string;
  body: string;
};

/**
 * Notifies the owner about a new reservation / order.
 *
 * Delivery is attempted in this order, using whichever secret is configured:
 *   1. Resend transactional email  (RESEND_API_KEY + OWNER_EMAIL)
 *   2. Telegram bot message        (TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID)
 *   3. Generic webhook (Zapier / WhatsApp Cloud API relay) (OWNER_WEBHOOK_URL)
 *
 * Every attempt is logged into `owner_notifications` so the dashboard can show
 * the alert feed even when no provider key is present.
 */
export async function notifyOwner({ subject, body }: NotifyInput): Promise<void> {
  let channel = "log";
  let delivered = false;
  let detail: string | null = "No delivery provider configured — logged locally.";

  try {
    if (process.env.RESEND_API_KEY && process.env.OWNER_EMAIL) {
      channel = "resend";
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM ?? "Laughing Buddha <onboarding@resend.dev>",
          to: [process.env.OWNER_EMAIL],
          subject,
          text: body,
        }),
      });
      delivered = res.ok;
      detail = res.ok ? "Email sent via Resend." : `Resend error ${res.status}`;
    } else if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      channel = "telegram";
      const res = await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: process.env.TELEGRAM_CHAT_ID,
            text: `*${subject}*\n${body}`,
            parse_mode: "Markdown",
          }),
        },
      );
      delivered = res.ok;
      detail = res.ok ? "Telegram message sent." : `Telegram error ${res.status}`;
    } else if (process.env.OWNER_WEBHOOK_URL) {
      channel = "webhook";
      const res = await fetch(process.env.OWNER_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });
      delivered = res.ok;
      detail = res.ok ? "Webhook accepted." : `Webhook error ${res.status}`;
    }
  } catch (error) {
    detail = error instanceof Error ? error.message : "Unknown delivery error";
  }

  try {
    await db.insert(ownerNotifications).values({ channel, subject, body, delivered, detail });
  } catch (error) {
    console.error("[notify] could not log notification", error);
  }
}
