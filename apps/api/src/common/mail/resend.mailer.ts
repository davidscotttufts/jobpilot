import { injectable } from "@needle-di/core";
import { Resend } from "resend";
import { logger } from "@/common/logger";
import { env } from "@/env";
import type { Mailer, MailMessage } from "./mailer";

/** Sends email through Resend. Bound to the {@link MAILER} token when RESEND_API_KEY is set. */
@injectable()
export class ResendMailer implements Mailer {
  private readonly client = new Resend(env.RESEND_API_KEY);

  async send({ to, subject, react }: MailMessage): Promise<void> {
    const { error } = await this.client.emails.send({ from: env.EMAIL_FROM, to, subject, react });
    if (error) {
      logger.error({ err: error, to, subject }, "Resend failed to send email");
      throw new Error(error.message);
    }
  }
}
