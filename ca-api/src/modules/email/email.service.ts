import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    const gmailEmail = this.configService.get<string>('GMAIL_USER');
    const gmailPassword = this.configService.get<string>('GMAIL_APP_PASSWORD');
    const outlookEmail = this.configService.get<string>('OUTLOOK_EMAIL');
    const outlookPassword = this.configService.get<string>('OUTLOOK_PASSWORD');

    if (gmailEmail && gmailPassword) {
      const trimmedEmail = gmailEmail.trim();
      const trimmedPassword = gmailPassword.trim();

      this.logger.log(
        `Initializing Gmail SMTP Transporter for email: "${trimmedEmail}" (password length: ${trimmedPassword.length})`,
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: trimmedEmail,
          pass: trimmedPassword,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
        logger: {
          info: (msg: string) => this.logger.log(`[SMTP-INFO] ${msg}`),
          warn: (msg: string) => this.logger.warn(`[SMTP-WARN] ${msg}`),
          error: (msg: string) => this.logger.error(`[SMTP-ERROR] ${msg}`),
          debug: (msg: string) =>
            this.logger.debug
              ? this.logger.debug(`[SMTP-DEBUG] ${msg}`)
              : this.logger.log(`[SMTP-DEBUG] ${msg}`),
        },
        debug: true,
      } as any);
    } else if (outlookEmail && outlookPassword) {
      const trimmedEmail = outlookEmail.trim();
      const trimmedPassword = outlookPassword.trim();

      this.logger.log(
        `Initializing Outlook SMTP Transporter for email: "${trimmedEmail}" (password length: ${trimmedPassword.length})`,
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      this.transporter = nodemailer.createTransport({
        host: 'smtp.office365.com',
        port: 587,
        secure: false,
        auth: {
          user: trimmedEmail,
          pass: trimmedPassword,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
        family: 4,
        tls: {
          rejectUnauthorized: false,
        },
        // Enable nodemailer internal logger and debugging wrapped with NestJS Logger
        logger: {
          info: (msg: string) => this.logger.log(`[SMTP-INFO] ${msg}`),
          warn: (msg: string) => this.logger.warn(`[SMTP-WARN] ${msg}`),
          error: (msg: string) => this.logger.error(`[SMTP-ERROR] ${msg}`),
          debug: (msg: string) =>
            this.logger.debug
              ? this.logger.debug(`[SMTP-DEBUG] ${msg}`)
              : this.logger.log(`[SMTP-DEBUG] ${msg}`),
        },
        debug: true,
      } as any);
    } else {
      this.logger.warn(
        'SMTP email credentials are not fully configured in the environment.',
      );
    }
  }

  onModuleInit() {
    if (this.transporter) {
      // Execute transporter verification in the background without awaiting it.
      // This ensures SMTP connection/credential checks do not block the NestJS application bootstrap process.
      void this.verifyTransporter();
    }
  }

  private async verifyTransporter() {
    this.logger.log(
      'Verifying SMTP transporter configuration & authentication...',
    );
    try {
      await this.transporter.verify();
      this.logger.log(
        'SMTP transporter is ready and authenticated successfully.',
      );
    } catch (err: any) {
      this.logger.error(
        `SMTP verification failed. Check credentials, host, and port. Error: ${err.message}`,
        err.stack,
      );
      const errMsg = err.message || '';
      if (
        errMsg.includes('SmtpClientAuthentication is disabled for the Tenant')
      ) {
        this.logger.error(
          'SMTP Authentication failed: SmtpClientAuthentication is disabled for the Tenant. Please enable it in the Microsoft 365 Admin Center for this mailbox/organization.',
        );
      } else if (err.code === 'EAUTH' || err.responseCode === 535) {
        this.logger.error(
          'SMTP Authentication failed: The password or email may be incorrect (or MFA is enabled without an App Password).',
        );
      } else {
        this.logger.error(
          `SMTP Error details - Code: ${err.code || 'N/A'}, Response Code: ${err.responseCode || 'N/A'}, Command: ${err.command || 'N/A'}`,
        );
      }
    }
  }

  async sendEmail(params: {
    to: string | string[];
    cc?: string | string[];
    subject: string;
    html: string;
    text?: string;
    replyTo?: string;
    icalEvent?: {
      filename?: string;
      method?: string;
      content?: string | Buffer;
    };
    attachments?: Array<{
      filename: string;
      content: Buffer | string;
      contentType?: string;
    }>;
  }) {
    if (!this.transporter) {
      this.logger.warn('SMTP Transporter not initialized. Skipping email.');
      return;
    }

    const gmailEmail = this.configService.get<string>('GMAIL_USER');
    const outlookEmail = this.configService.get<string>('OUTLOOK_EMAIL');
    const email = gmailEmail || outlookEmail;

    if (!email) {
      this.logger.warn(
        'No configured email sender address found. Skipping email send.',
      );
      return;
    }

    const to = Array.isArray(params.to) ? params.to : [params.to];
    const cc = params.cc
      ? Array.isArray(params.cc)
        ? params.cc
        : [params.cc]
      : [];

    const toEmails = [...new Set(to.map((e) => e.trim()).filter(Boolean))];
    let ccEmails = [...new Set(cc.map((e) => e.trim()).filter(Boolean))];

    // Filter out duplicate emails in CC that are already in TO (case-insensitive check)
    const lowerToEmails = new Set(toEmails.map((e) => e.toLowerCase()));
    ccEmails = ccEmails.filter((e) => !lowerToEmails.has(e.toLowerCase()));

    // Filter out the sender email from CC (case-insensitive check)
    const senderEmail = email.trim().toLowerCase();
    ccEmails = ccEmails.filter((e) => e.toLowerCase() !== senderEmail);

    if (toEmails.length === 0) {
      this.logger.warn('No recipient emails found. Skipping email send.');
      return;
    }

    const mailOptions: nodemailer.SendMailOptions = {
      from: `"HR" <${email.trim()}>`,
      to: toEmails.join(', '),
      subject: params.subject,
      html: params.html,
      text:
        params.text ||
        params.html
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim(),
    };

    if (params.icalEvent) {
      mailOptions.icalEvent = params.icalEvent;
    }

    if (ccEmails.length > 0) {
      mailOptions.cc = ccEmails.join(', ');
    }

    if (params.replyTo) {
      mailOptions.replyTo = params.replyTo;
    }

    if (params.attachments && params.attachments.length > 0) {
      mailOptions.attachments = params.attachments.map((att) => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
      }));
    }

    const isGmail = !!gmailEmail;
    const providerName = isGmail ? 'Gmail' : 'Outlook';

    try {
      this.logger.log(
        `Sending email via ${providerName} SMTP to: ${toEmails.join(', ')} (CC: ${ccEmails.join(', ') || 'none'})`,
      );
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully: ${info.messageId}`);
      return info;
    } catch (err: any) {
      this.logger.error(
        `Failed to send email via ${providerName} SMTP: ${err.message}`,
        err.stack,
      );
      const errMsg = err.message || '';
      if (
        errMsg.includes('SmtpClientAuthentication is disabled for the Tenant')
      ) {
        this.logger.error(
          'SMTP Authentication failed: SmtpClientAuthentication is disabled for the Tenant. Please enable it in the Microsoft 365 Admin Center for this mailbox/organization.',
        );
      } else if (err.code === 'EAUTH' || err.responseCode === 535) {
        this.logger.error(
          `SMTP Authentication failed: The password or email may be incorrect (or MFA is enabled without an App Password for ${providerName}).`,
        );
      } else {
        this.logger.error(
          `SMTP Error details - Code: ${err.code || 'N/A'}, Response Code: ${err.responseCode || 'N/A'}, Command: ${err.command || 'N/A'}`,
        );
      }
      throw err;
    }
  }
}
