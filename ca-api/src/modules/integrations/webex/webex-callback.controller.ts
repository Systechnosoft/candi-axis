import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { WebexService } from './webex.service';
import { AdminSettingsService } from '../../admin/admin-settings.service';
import { PG_POOL } from '../../../infrastructure/database/database.module';
import { Inject } from '@nestjs/common';
import { Pool } from 'pg';

@ApiTags('Cisco Webex Integration')
@Controller('api/meeting-integrations/CISCO_WEBEX')
export class WebexCallbackController {
  constructor(
    private readonly webexService: WebexService,
    private readonly adminSettingsService: AdminSettingsService,
    @Inject(PG_POOL) private readonly pool: Pool,
  ) {}

  @Get('callback')
  @ApiOperation({
    summary: 'OAuth Callback for Webex Integration',
  })
  async handleCallback(@Query('code') code: string, @Res() res: Response) {
    if (!code) {
      return res.status(400).send('Missing authorization code.');
    }

    // Fetch config to get client_id and client_secret
    const dbRes = await this.pool.query(
      `SELECT config_json, encrypted_credentials_json 
       FROM public.ca_interview_provider_configurations 
       WHERE provider = 'CISCO_WEBEX' LIMIT 1`,
    );

    if (dbRes.rows.length === 0) {
      return res.status(400).send('Webex configuration not found in DB.');
    }

    const config = dbRes.rows[0].config_json || {};
    const creds = dbRes.rows[0].encrypted_credentials_json || {};

    const clientId = (config.client_id || creds.client_id || '').trim();
    let clientSecret = '';
    if (creds.client_secret) {
      clientSecret = this.adminSettingsService.decrypt(creds.client_secret as string);
    } else if (config.client_secret && config.client_secret !== '********') {
      clientSecret = config.client_secret;
    }

    const redirectUri = 'http://localhost:3000/api/meeting-integrations/CISCO_WEBEX/callback';

    // Exchange code for tokens
    const response = await fetch('https://webexapis.com/v1/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(400).send(`Failed to exchange code: ${JSON.stringify(data)}`);
    }

    // Render a nice HTML page with the refresh token
    const html = `
      <html>
        <head>
          <title>Webex Authorized</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 40px; background: #f9fafb; color: #111827; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            h1 { color: #059669; }
            .token-box { background: #f3f4f6; padding: 15px; border-radius: 6px; word-break: break-all; font-family: monospace; font-size: 14px; margin-top: 10px; border: 1px solid #e5e7eb; }
            p { line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>✅ Webex Authorized Successfully!</h1>
            <p>Your application is now linked to Webex. Please copy the <strong>Refresh Token</strong> below and paste it into your CandiAxis Admin Settings to complete the integration.</p>
            <h3>Refresh Token:</h3>
            <div class="token-box">${data.refresh_token}</div>
            <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">You can close this window after copying the token.</p>
          </div>
        </body>
      </html>
    `;

    return res.status(200).send(html);
  }
}
