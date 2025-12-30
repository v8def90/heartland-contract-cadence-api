/**
 * Email Service
 *
 * @description Handles email sending via AWS SES.
 * Provides email templates for verification, password reset, and welcome emails.
 *
 * @author Heart Token API Team
 * @since 1.0.0
 */

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

/**
 * Email Service
 *
 * @description Manages email sending through AWS SES.
 * Supports HTML and plain text email templates.
 *
 * @example
 * ```typescript
 * const emailService = EmailService.getInstance();
 * await emailService.sendVerificationEmail(email, token, did);
 * ```
 */
export class EmailService {
  private static instance: EmailService;

  /**
   * AWS SES client
   */
  private sesClient: SESClient;

  /**
   * From email address
   */
  private fromEmail: string;

  /**
   * Frontend URL for email links
   */
  private frontendUrl: string;

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    const region = process.env.SES_REGION || 'ap-northeast-1';
    this.sesClient = new SESClient({ region });
    this.fromEmail =
      process.env.SES_FROM_EMAIL || 'noreply@example.com';
    this.frontendUrl =
      process.env.FRONTEND_URL || 'https://app.example.com';
  }

  /**
   * Get singleton instance
   *
   * @returns EmailService instance
   */
  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Send email via AWS SES
   *
   * @description Sends an email using AWS SES.
   *
   * @param to - Recipient email address
   * @param subject - Email subject
   * @param htmlBody - HTML email body
   * @param textBody - Plain text email body (optional)
   * @returns Promise resolving when email is sent
   *
   * @example
   * ```typescript
   * await emailService.sendEmail(
   *   'user@example.com',
   *   'Welcome',
   *   '<h1>Welcome!</h1>',
   *   'Welcome!'
   * );
   * ```
   */
  public async sendEmail(
    to: string,
    subject: string,
    htmlBody: string,
    textBody?: string
  ): Promise<void> {
    try {
      const command = new SendEmailCommand({
        Source: this.fromEmail,
        Destination: {
          ToAddresses: [to],
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: htmlBody,
              Charset: 'UTF-8',
            },
            ...(textBody && {
              Text: {
                Data: textBody,
                Charset: 'UTF-8',
              },
            }),
          },
        },
      });

      await this.sesClient.send(command);
    } catch (error) {
      throw new Error(
        `Failed to send email: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Send verification email
   *
   * @description Sends an email verification link to the user.
   *
   * @param email - Recipient email address
   * @param token - Verification token
   * @param primaryDid - User's primary DID
   * @returns Promise resolving when email is sent
   *
   * @example
   * ```typescript
   * await emailService.sendVerificationEmail(email, token, did);
   * ```
   */
  public async sendVerificationEmail(
    email: string,
    token: string,
    primaryDid: string
  ): Promise<void> {
    const verificationUrl = `${this.frontendUrl}/auth/verify-email?token=${token}&did=${primaryDid}`;

    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>メールアドレス認証</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #4CAF50;">メールアドレス認証</h1>
            <p>以下のリンクをクリックしてメールアドレスを認証してください。</p>
            <p>
              <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px;">
                メールアドレスを認証する
              </a>
            </p>
            <p>または、以下のリンクをブラウザにコピー＆ペーストしてください：</p>
            <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              このリンクは24時間有効です。<br>
              このメールに心当たりがない場合は、無視してください。
            </p>
          </div>
        </body>
      </html>
    `;

    const textBody = `
メールアドレス認証

以下のリンクをクリックしてメールアドレスを認証してください：

${verificationUrl}

このリンクは24時間有効です。
このメールに心当たりがない場合は、無視してください。
    `;

    await this.sendEmail(
      email,
      'メールアドレス認証',
      htmlBody,
      textBody
    );
  }

  /**
   * Send password reset email
   *
   * @description Sends a password reset link to the user.
   *
   * @param email - Recipient email address
   * @param token - Password reset token
   * @param primaryDid - User's primary DID
   * @returns Promise resolving when email is sent
   */
  public async sendPasswordResetEmail(
    email: string,
    token: string,
    primaryDid: string
  ): Promise<void> {
    const resetUrl = `${this.frontendUrl}/auth/reset-password?token=${token}&did=${primaryDid}`;

    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>パスワードリセット</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2196F3;">パスワードリセット</h1>
            <p>パスワードリセットのリクエストを受け付けました。</p>
            <p>以下のリンクをクリックして新しいパスワードを設定してください。</p>
            <p>
              <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 4px;">
                パスワードをリセットする
              </a>
            </p>
            <p>または、以下のリンクをブラウザにコピー＆ペーストしてください：</p>
            <p style="word-break: break-all; color: #666;">${resetUrl}</p>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              このリンクは24時間有効です。<br>
              このリクエストに心当たりがない場合は、無視してください。
            </p>
          </div>
        </body>
      </html>
    `;

    const textBody = `
パスワードリセット

パスワードリセットのリクエストを受け付けました。
以下のリンクをクリックして新しいパスワードを設定してください：

${resetUrl}

このリンクは24時間有効です。
このリクエストに心当たりがない場合は、無視してください。
    `;

    await this.sendEmail(
      email,
      'パスワードリセット',
      htmlBody,
      textBody
    );
  }

  /**
   * Send welcome email
   *
   * @description Sends a welcome email to newly registered users.
   *
   * @param email - Recipient email address
   * @param displayName - User's display name
   * @param primaryDid - User's primary DID
   * @returns Promise resolving when email is sent
   */
  public async sendWelcomeEmail(
    email: string,
    displayName: string,
    primaryDid: string
  ): Promise<void> {
    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>ようこそ</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #4CAF50;">ようこそ！</h1>
            <p>${displayName}さん、ご登録ありがとうございます。</p>
            <p>アカウントが正常に作成されました。</p>
            <p>メールアドレスの認証を完了すると、すべての機能をご利用いただけます。</p>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              ご不明な点がございましたら、お気軽にお問い合わせください。
            </p>
          </div>
        </body>
      </html>
    `;

    const textBody = `
ようこそ！

${displayName}さん、ご登録ありがとうございます。

アカウントが正常に作成されました。
メールアドレスの認証を完了すると、すべての機能をご利用いただけます。

ご不明な点がございましたら、お気軽にお問い合わせください。
    `;

    await this.sendEmail(email, 'ようこそ', htmlBody, textBody);
  }
}

