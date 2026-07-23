import { Controller, Get, Post, Query, Request, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GoogleCalendarService } from './google-calendar.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../../rbac/guards/rbac.guard';
import { RequireModule } from '../../rbac/decorators/require-module.decorator';

@ApiTags('Google Calendar Integration')
@Controller('api/integrations/google')
export class GoogleCalendarController {
  constructor(private readonly googleCalendarService: GoogleCalendarService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequireModule('interviews', 'viewer')
  @Get('auth-url')
  @ApiOperation({ summary: 'Generate Google Calendar OAuth authorization URL' })
  async getAuthUrl(@Request() req: any) {
    const url = await this.googleCalendarService.getAuthUrl(req.user.atsUserId);
    return { url };
  }

  // Public Callback route (cannot have Bearer token verification)
  @Get('callback')
  @ApiOperation({ summary: 'Google Calendar OAuth callback redirect handler' })
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: any,
  ) {
    try {
      await this.googleCalendarService.handleCallback(code, state);
      
      // Return a popup message script and close the window
      res.setHeader('Content-Type', 'text/html');
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Google Calendar Connected</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 80vh;
              background-color: #f9fafb;
              color: #1f2937;
              margin: 0;
            }
            .card {
              background: white;
              padding: 2.5rem;
              border-radius: 12px;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
              text-align: center;
              max-width: 400px;
            }
            h2 { color: #10b981; margin-top: 0; }
            p { color: #4b5563; font-size: 0.95rem; line-height: 1.5; }
            .spinner {
              border: 3px solid #f3f3f3;
              border-top: 3px solid #10b981;
              border-radius: 50%;
              width: 24px;
              height: 24px;
              animation: spin 1s linear infinite;
              margin: 1.5rem auto 0;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Connection Successful!</h2>
            <p>Your Google Calendar has been successfully integrated with Systechnosoft ATS.</p>
            <p>This window will close automatically shortly.</p>
            <div class="spinner"></div>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GOOGLE_CALENDAR_CONNECTED' }, '*');
            }
            setTimeout(() => {
              window.close();
            }, 2500);
          </script>
        </body>
        </html>
      `);
    } catch (err) {
      res.setHeader('Content-Type', 'text/html');
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Google Calendar Connection Failed</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 80vh;
              background-color: #f9fafb;
              color: #1f2937;
              margin: 0;
            }
            .card {
              background: white;
              padding: 2.5rem;
              border-radius: 12px;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
              text-align: center;
              max-width: 400px;
            }
            h2 { color: #ef4444; margin-top: 0; }
            p { color: #4b5563; font-size: 0.95rem; line-height: 1.5; }
            button {
              background-color: #3b82f6;
              color: white;
              border: none;
              padding: 0.5rem 1rem;
              border-radius: 6px;
              cursor: pointer;
              margin-top: 1rem;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Connection Failed</h2>
            <p>${err.message || 'An unknown error occurred during Google Calendar authentication.'}</p>
            <button onclick="window.close()">Close Window</button>
          </div>
        </body>
        </html>
      `);
    }
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequireModule('interviews', 'viewer')
  @Get('status')
  @ApiOperation({ summary: 'Check Google Calendar integration connection status' })
  getConnectionStatus(@Request() req: any) {
    return this.googleCalendarService.getConnectionStatus(req.user.atsUserId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequireModule('interviews', 'editor')
  @Post('disconnect')
  @ApiOperation({ summary: 'Disconnect/deactivate Google Calendar integration' })
  async disconnect(@Request() req: any) {
    await this.googleCalendarService.disconnect(req.user.atsUserId);
    return { success: true };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequireModule('interviews', 'editor')
  @Post('generate-meet-link')
  @ApiOperation({ summary: 'Pre-generate a Google Meet link and temporary calendar event' })
  async generateMeetLink(@Request() req: any) {
    return this.googleCalendarService.preGenerateMeetLink(req.user.atsUserId);
  }
}
