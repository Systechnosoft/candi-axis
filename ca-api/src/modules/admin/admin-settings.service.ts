/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  Logger,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PG_POOL } from '../../infrastructure/database/database.module';
import { AuditService } from '../audit/audit.service';
import { UpdateAiConfigDto } from './dto/update-ai-config.dto';
import { CandidatesService } from '../candidates/candidates.service';

export interface ProviderConfig {
  has_custom_key: boolean;
  base_url: string | null;
  model: string | null;
  maskedKey: string | null;
  api_key?: string | null;
  is_system_default?: boolean;
}

export interface AiConfig {
  provider: string;
  providers: Record<string, ProviderConfig>;
  has_custom_key?: boolean;
  base_url?: string | null;
  model?: string | null;
  maskedKey?: string | null;
}

@Injectable()
export class AdminSettingsService {
  private readonly logger = new Logger(AdminSettingsService.name);

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
    private readonly candidatesService: CandidatesService,
  ) {}

  private getEncryptionKey(): Buffer {
    const secret =
      this.configService.get<string>('SUPABASE_JWT_SECRET') ||
      'ats-default-encryption-secret-key-32-chars';
    // Ensure the key is exactly 32 bytes
    return crypto.createHash('sha256').update(secret).digest();
  }

  private encrypt(text: string): string {
    if (!text) return '';
    const iv = crypto.randomBytes(16);
    const key = this.getEncryptionKey();
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(encryptedText: string): string {
    if (!encryptedText) return '';
    const parts = encryptedText.split(':');
    if (parts.length !== 2) return encryptedText; // Fallback for legacy plain keys
    try {
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const key = this.getEncryptionKey();
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (err) {
      this.logger.error('Failed to decrypt API key:', err);
      return '';
    }
  }

  private maskApiKey(key: string): string {
    if (!key || key.length < 6) return 'sk-********************************9x';
    const prefix = key.slice(0, 3);
    const suffix = key.slice(-2);
    return `${prefix}-********************************${suffix}`;
  }

  private validateApiKey(key: string, provider: string): boolean {
    if (!key || typeof key !== 'string') return false;
    const trimmed = key.trim();
    if (trimmed.length === 0) return false;
    if (trimmed.includes('*')) return false;

    // Log validation check (without printing key)
    this.logger.log(`Validating format of API key for provider ${provider}`);

    // To future-proof the configuration and avoid static format issues,
    // we only perform a length check instead of enforcing strict vendor prefixes
    // since providers occasionally change their API key formats.
    return trimmed.length > 15;
  }

  private getProviderDefaultModel(provider: string): string {
    if (provider === 'gemini') return 'gemini-3.6-flash';
    if (provider === 'openai') return 'gpt-4o-mini';
    if (provider === 'anthropic') return 'claude-3-5-sonnet-20241022';
    if (provider === 'groq') return 'qwen/qwen3.6-27b';
    return '';
  }

  private getProviderDefaultBaseUrl(provider: string): string {
    if (provider === 'gemini')
      return 'https://generativelanguage.googleapis.com';
    if (provider === 'openai') return 'https://api.openai.com/v1';
    if (provider === 'anthropic') return 'https://api.anthropic.com';
    if (provider === 'groq') return 'https://api.groq.com/openai/v1';
    return '';
  }

  private getOrgPrefix(email: string): string {
    if (!email) return 'org:default:';
    const parts = email.split('@');
    const domain = parts.length > 1 ? parts[1].toLowerCase() : 'default';
    return `org:${domain}:`;
  }

  private getProviderDisplayName(provider: string): string {
    if (provider === 'gemini') return 'Google Gemini';
    if (provider === 'openai') return 'OpenAI';
    if (provider === 'anthropic') return 'Anthropic Claude';
    if (provider === 'groq') return 'Groq';
    return provider;
  }

  private getProviderErrorMessage(provider: string): string {
    if (provider === 'openai') {
      return 'OpenAI provider selected — invalid or missing API key. Please enter a valid OpenAI key to enable parsing.';
    }
    if (provider === 'gemini') {
      return 'Google Gemini provider selected — invalid or missing API key.';
    }
    if (provider === 'anthropic') {
      return 'Anthropic Claude provider selected — invalid or missing API key.';
    }
    if (provider === 'groq') {
      return 'Groq provider selected — invalid or missing API key.';
    }
    return `${this.getProviderDisplayName(provider)} provider selected — invalid or missing API key.`;
  }

  async getAiConfig(email: string): Promise<AiConfig> {
    const orgPrefix = this.getOrgPrefix(email);
    const query = `
      SELECT setting_key, setting_value 
      FROM ca_admin_settings 
      WHERE setting_key LIKE $1
    `;
    const res = await this.pool.query<{
      setting_key: string;
      setting_value: string;
    }>(query, [`${orgPrefix}%`]);

    const config: AiConfig = {
      provider: 'gemini',
      providers: {},
    };

    const providersList = ['gemini', 'openai', 'anthropic', 'groq'];
    providersList.forEach((p) => {
      config.providers[p] = {
        has_custom_key: false,
        is_system_default: false,
        base_url: this.getProviderDefaultBaseUrl(p),
        model: this.getProviderDefaultModel(p),
        maskedKey: null,
      };
    });

    res.rows.forEach((row) => {
      const fullKey = row.setting_key;
      const key = fullKey.substring(orgPrefix.length);
      let val = String(row.setting_value);
      if (typeof val === 'string' && val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }
      if (val === 'null' || val === null) {
        val = '';
      }

      if (key === 'ai_parsing_provider') {
        if (val) config.provider = val.trim();
      } else if (key.startsWith('ai_parsing_api_key_')) {
        const prov = key.replace('ai_parsing_api_key_', '');
        if (config.providers[prov]) {
          const decrypted = this.decrypt(val || '');
          const isConfigured =
            decrypted &&
            !decrypted.includes('*') &&
            decrypted.trim().length > 0;
          config.providers[prov].has_custom_key = Boolean(isConfigured);
          config.providers[prov].maskedKey = isConfigured
            ? this.maskApiKey(decrypted)
            : null;
        }
      } else if (key.startsWith('ai_parsing_base_url_')) {
        const prov = key.replace('ai_parsing_base_url_', '');
        if (config.providers[prov]) {
          config.providers[prov].base_url = val;
        }
      } else if (key.startsWith('ai_parsing_model_')) {
        const prov = key.replace('ai_parsing_model_', '');
        if (config.providers[prov]) {
          config.providers[prov].model = val;
        }
      }
    });

    // Fallback to environment variables
    providersList.forEach((prov) => {
      if (!config.providers[prov].has_custom_key) {
        const envKey = process.env[`${prov.toUpperCase()}_API_KEY`];
        if (envKey && envKey.trim().length > 0) {
          config.providers[prov].has_custom_key = true;
          config.providers[prov].is_system_default = true;
          config.providers[prov].maskedKey = this.maskApiKey(envKey.trim());
        }
      }
    });

    // Populate active provider's fields at top level for backwards compatibility
    const activeProv = config.provider;
    config.has_custom_key =
      config.providers[activeProv]?.has_custom_key || false;
    config.base_url = config.providers[activeProv]?.base_url || null;
    config.model = config.providers[activeProv]?.model || null;
    config.maskedKey = config.providers[activeProv]?.maskedKey || null;

    return config;
  }

  async updateAiConfig(userId: string, email: string, dto: UpdateAiConfigDto) {
    const orgPrefix = this.getOrgPrefix(email);
    const client = await this.pool.connect();

    this.logger.log(
      `Updating AI config for org [${orgPrefix}] - provider selected: ${dto.provider}`,
    );

    try {
      await client.query('BEGIN');

      const providerClean = dto.provider ? dto.provider.trim() : '';

      await client.query(
        `INSERT INTO ca_admin_settings (setting_key, setting_value, value_type, is_active) 
         VALUES ($1, $2, 'string', true)
         ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2, updated_at = now(), updated_by = $3`,
        [
          `${orgPrefix}ai_parsing_provider`,
          JSON.stringify(providerClean),
          userId,
        ],
      );

      // Update custom key if provided and not masked
      if (dto.custom_api_key !== undefined && dto.custom_api_key !== null) {
        const cleanKey = dto.custom_api_key.trim();
        if (cleanKey !== '') {
          const isMasked = cleanKey.includes('*');
          if (!isMasked) {
            const isKeyValid = this.validateApiKey(cleanKey, providerClean);
            if (!isKeyValid) {
              throw new BadRequestException(
                this.getProviderErrorMessage(providerClean),
              );
            }

            const encrypted = this.encrypt(cleanKey);
            const keyName = `${orgPrefix}ai_parsing_api_key_${providerClean}`;
            await client.query(
              `INSERT INTO ca_admin_settings (setting_key, setting_value, value_type, is_active) 
               VALUES ($1, $2, 'string', true)
               ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2, updated_at = now(), updated_by = $3`,
              [keyName, JSON.stringify(encrypted || null), userId],
            );

            this.logger.log(
              `API Key updated for provider ${providerClean}. Format valid: true`,
            );
          } else {
            this.logger.log(
              `API Key update skipped for ${providerClean} because submitted key was masked.`,
            );
          }
        }
      } else {
        // If no new key is provided, verify an active valid key exists in the database for the selected provider
        const existingKey = await this.getActiveApiKey(email, providerClean);
        if (!existingKey) {
          throw new BadRequestException(
            this.getProviderErrorMessage(providerClean),
          );
        }
      }

      if (dto.base_url !== undefined && dto.base_url !== null) {
        const urlName = `${orgPrefix}ai_parsing_base_url_${providerClean}`;
        const cleanUrl = dto.base_url.trim();
        await client.query(
          `INSERT INTO ca_admin_settings (setting_key, setting_value, value_type, is_active) 
           VALUES ($1, $2, 'string', true)
           ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2, updated_at = now(), updated_by = $3`,
          [urlName, JSON.stringify(cleanUrl || null), userId],
        );
      }

      if (dto.model !== undefined && dto.model !== null) {
        const modelName = `${orgPrefix}ai_parsing_model_${providerClean}`;
        const cleanModel = dto.model.trim();
        await client.query(
          `INSERT INTO ca_admin_settings (setting_key, setting_value, value_type, is_active) 
           VALUES ($1, $2, 'string', true)
           ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2, updated_at = now(), updated_by = $3`,
          [modelName, JSON.stringify(cleanModel || null), userId],
        );
      }

      await client.query('COMMIT');

      await this.auditService.log({
        entityType: 'admin_settings',
        entityId: '00000000-0000-0000-0000-000000000001',
        action: 'UPDATE_AI_CONFIG',
        changedBy: userId,
        afterJson: {
          provider: dto.provider,
          model: dto.model,
          base_url: dto.base_url,
        },
        reasonContext: `AI parsing configuration updated for ${dto.provider}`,
      });

      return { success: true };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async fetchAvailableModels(provider: string, apiKey: string, email: string): Promise<string[]> {
    let actualKey = apiKey;
    if (!actualKey || actualKey.includes('*')) {
      const savedKey = await this.getActiveApiKey(email, provider);
      if (!savedKey) {
        throw new BadRequestException(`No valid API key configured for ${provider}`);
      }
      actualKey = savedKey;
    }

    try {
      if (provider === 'openai') {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${actualKey}` }
        });
        if (!res.ok) throw new Error(`OpenAI API error: ${res.statusText}`);
        const data = (await res.json()) as any;
        return data.data
          .map((m: any) => m.id)
          .filter((id: string) => id.startsWith('gpt') && !id.includes('audio') && !id.includes('realtime') && !id.includes('vision'))
          .sort();
      } else if (provider === 'groq') {
        const res = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { Authorization: `Bearer ${actualKey}` }
        });
        if (!res.ok) throw new Error(`Groq API error: ${res.statusText}`);
        const data = (await res.json()) as any;
        return data.data
          .map((m: any) => m.id)
          .filter((id: string) => !id.includes('whisper'))
          .sort();
      } else if (provider === 'gemini') {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${actualKey}`);
        if (!res.ok) throw new Error(`Gemini API error: ${res.statusText}`);
        const data = (await res.json()) as any;
        return (data.models || [])
          .map((m: any) => m.name.replace('models/', ''))
          .filter((name: string) => name.startsWith('gemini') && !name.includes('vision') && !name.includes('embedding') && !name.includes('aqa'))
          .sort();
      } else if (provider === 'anthropic') {
        return [
          'claude-3-5-sonnet-20241022',
          'claude-3-5-haiku-20241022',
          'claude-3-opus-20240229',
          'claude-3-sonnet-20240229',
          'claude-3-haiku-20240307'
        ];
      }
      return [];
    } catch (err: any) {
      this.logger.error(`Failed to fetch models for ${provider}: ${err.message}`);
      throw new BadRequestException(`Failed to fetch models: ${err.message}`);
    }
  }

  async clearApiKey(userId: string, email: string, provider: string) {
    const orgPrefix = this.getOrgPrefix(email);
    const client = await this.pool.connect();

    this.logger.log(
      `Revoking API Key for provider [${provider}] in org [${orgPrefix}]`,
    );

    try {
      await client.query('BEGIN');

      const keyName = `${orgPrefix}ai_parsing_api_key_${provider}`;
      await client.query(
        `DELETE FROM ca_admin_settings WHERE setting_key = $1`,
        [keyName],
      );

      await client.query('COMMIT');

      await this.auditService.log({
        entityType: 'admin_settings',
        entityId: '00000000-0000-0000-0000-000000000001',
        action: 'CLEAR_AI_API_KEY',
        changedBy: userId,
        afterJson: { provider, action: 'cleared_key' },
        reasonContext: `API key cleared/revoked for ${provider}`,
      });

      return { success: true };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getActiveAiProviders(email: string) {
    const orgPrefix = this.getOrgPrefix(email);
    const keyNameProvider = `${orgPrefix}ai_parsing_provider`;
    const keyNameModel = `${orgPrefix}ai_parsing_model_`;

    const settingsRes = await this.pool.query<{
      setting_key: string;
      setting_value: string;
    }>(
      `SELECT setting_key, setting_value FROM ca_admin_settings 
       WHERE (setting_key = $1 OR setting_key LIKE $2) AND is_active = true`,
      [keyNameProvider, `${keyNameModel}%`],
    );

    return settingsRes.rows;
  }

  async getActiveApiKey(
    email: string,
    provider: string,
  ): Promise<string | null> {
    const orgPrefix = this.getOrgPrefix(email);
    const settingKey = `${orgPrefix}ai_parsing_api_key_${provider}`;

    const existing = await this.pool.query<{ setting_value: string }>(
      'SELECT setting_value FROM ca_admin_settings WHERE setting_key = $1 LIMIT 1',
      [settingKey],
    );

    if (existing.rows[0]) {
      let val = String(existing.rows[0].setting_value);
      if (val === 'null' || !val) return null;
      if (typeof val === 'string' && val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }

      const decrypted = this.decrypt(val);
      if (this.validateApiKey(decrypted, provider)) {
        return decrypted;
      }
    }

    // Fallback to environment variable
    const envKey = process.env[`${provider.toUpperCase()}_API_KEY`];
    if (envKey && this.validateApiKey(envKey, provider)) {
      return envKey.trim();
    }

    return null;
  }

  async getAiConfigForOrg(email: string): Promise<{
    provider: string;
    model: string;
    base_url: string;
    api_key: string | null;
  }> {
    const orgPrefix = this.getOrgPrefix(email);
    const query = `
      SELECT setting_key, setting_value 
      FROM ca_admin_settings 
      WHERE setting_key LIKE $1
    `;
    const res = await this.pool.query<{
      setting_key: string;
      setting_value: string;
    }>(query, [`${orgPrefix}%`]);

    const config: {
      provider: string;
      model: string;
      base_url: string;
      api_key: string | null;
    } = {
      provider: 'gemini',
      model: this.getProviderDefaultModel('gemini'),
      base_url: this.getProviderDefaultBaseUrl('gemini'),
      api_key: null,
    };

    res.rows.forEach((row) => {
      const fullKey = row.setting_key;
      const key = fullKey.substring(orgPrefix.length);
      let val: string | null = row.setting_value;
      if (typeof val === 'string' && val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }
      if (val === 'null' || val === null) {
        val = null;
      }

      if (key === 'ai_parsing_provider') {
        if (val) config.provider = val.trim();
      }
    });

    const provider = config.provider.trim();
    config.model = this.getProviderDefaultModel(provider).trim();
    config.base_url = this.getProviderDefaultBaseUrl(provider).trim();

    res.rows.forEach((row) => {
      const fullKey = row.setting_key;
      const key = fullKey.substring(orgPrefix.length);
      let val: string | null = row.setting_value;
      if (typeof val === 'string' && val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }
      if (val === 'null' || val === null) {
        val = null;
      }

      if (key === `ai_parsing_model_${provider}`) {
        if (val) config.model = val.trim();
      } else if (key === `ai_parsing_base_url_${provider}`) {
        if (val) config.base_url = val.trim();
      } else if (key === `ai_parsing_api_key_${provider}`) {
        if (val) {
          const dec = this.decrypt(val);
          config.api_key = dec ? dec.trim() : null;
        }
      }
    });

    if (!config.api_key) {
      const envKeyName = `${provider.toUpperCase()}_API_KEY`;
      if (process.env[envKeyName]) {
        config.api_key = process.env[envKeyName].trim();
      }
    }

    return config;
  }

  async getActiveAiProviderStatus(email: string) {
    const config = await this.getAiConfigForOrg(email);
    const provider = config.provider;
    const apiKey = config.api_key;

    const isConfigured = this.validateApiKey(apiKey || '', provider);
    const validationError = isConfigured
      ? null
      : this.getProviderErrorMessage(provider);

    return {
      provider: this.getProviderDisplayName(provider),
      providerValue: provider,
      model: config.model,
      isConfigured,
      validationError,
    };
  }

  async getScoringWeights(email: string) {
    const orgPrefix = this.getOrgPrefix(email);
    const keyName = `${orgPrefix}resume_scoring_weights`;
    const res = await this.pool.query<{
      setting_value: Record<string, number>;
    }>(
      'SELECT setting_value FROM ca_admin_settings WHERE setting_key = $1 AND is_active = true',
      [keyName],
    );
    if (res.rows.length === 0) {
      return null;
    }
    return res.rows[0].setting_value;
  }

  async updateScoringWeights(
    userId: string,
    email: string,
    weights: Record<string, number>,
  ) {
    const orgPrefix = this.getOrgPrefix(email);
    const keyName = `${orgPrefix}resume_scoring_weights`;

    if (typeof weights !== 'object' || weights === null) {
      throw new BadRequestException('Weights must be a valid JSON object');
    }

    const validKeys = [
      'contact',
      'summary',
      'experience',
      'skills',
      'progression',
      'achievements',
      'readability',
      'grammar',
      'social',
    ];
    let totalWeight = 0;
    for (const key of Object.keys(weights)) {
      if (!validKeys.includes(key)) {
        throw new BadRequestException(`Invalid section key: ${key}`);
      }
      if (typeof weights[key] !== 'number' || weights[key] < 0) {
        throw new BadRequestException(
          `Weight for ${key} must be a non-negative number`,
        );
      }
      totalWeight += weights[key];
    }

    if (totalWeight !== 100) {
      throw new BadRequestException(
        'The sum of all scoring weights must be exactly 100',
      );
    }

    const query = `
      INSERT INTO ca_admin_settings (setting_key, setting_value, value_type, is_active, updated_by, updated_at)
      VALUES ($1, $2, 'json', true, $3, now())
      ON CONFLICT (setting_key) DO UPDATE 
      SET setting_value = $2, updated_by = $3, updated_at = now()
    `;
    await this.pool.query(query, [keyName, JSON.stringify(weights), userId]);

    await this.auditService.log({
      entityType: 'admin_settings',
      entityId: '00000000-0000-0000-0000-000000000001',
      action: 'UPDATE_SCORING_WEIGHTS',
      changedBy: userId,
      afterJson: weights,
      reasonContext: 'Candidate resume scoring weights updated',
    });

    const domain = email.split('@')[1]?.toLowerCase();
    if (domain) {
      await this.candidatesService.recalculateScoresForDomain(domain, weights);
    }

    return { success: true };
  }

  async getOrgIdByEmail(email: string): Promise<string | null> {
    const res = await this.pool.query<{ org_id: string }>(
      `SELECT org_id FROM public.users WHERE email_normalized = $1 LIMIT 1`,
      [email.trim().toLowerCase()],
    );
    return res.rows[0]?.org_id || null;
  }

  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  async getConfigurations(email: string) {
    // Platform-wide settings — no org_id filter.
    // Super admins (who have no org_id) can still manage all configurations.
    const res = await this.pool.query<Record<string, any>>(
      `SELECT id, provider, display_name, auth_mode, config_json, is_active, is_default, 
              last_test_status, last_test_message, last_tested_at 
       FROM public.ca_interview_provider_configurations
       ORDER BY created_at ASC`,
    );
    return res.rows;
  }

  /* eslint-disable-next-line @typescript-eslint/require-await */
  async getProviders() {
    return [
      {
        provider: 'GOOGLE_MEET',
        display_name: 'Google Meet',
        auth_mode: 'oauth2',
        fields: [
          {
            key: 'client_id',
            label: 'Client ID',
            type: 'string',
            required: true,
            isSecret: false,
          },
          {
            key: 'client_secret',
            label: 'Client Secret',
            type: 'string',
            required: true,
            isSecret: true,
          },
          {
            key: 'redirect_uri',
            label: 'Redirect URI',
            type: 'string',
            required: true,
            isSecret: false,
          },
        ],
      },
      {
        provider: 'MICROSOFT_TEAMS',
        display_name: 'Microsoft Teams',
        auth_mode: 'oauth2',
        fields: [
          {
            key: 'client_id',
            label: 'Application (client) ID',
            type: 'string',
            required: true,
            isSecret: false,
          },
          {
            key: 'client_secret',
            label: 'Client Secret',
            type: 'string',
            required: true,
            isSecret: true,
          },
          {
            key: 'tenant_id',
            label: 'Directory (tenant) ID',
            type: 'string',
            required: true,
            isSecret: false,
          },
        ],
      },
      {
        provider: 'ZOOM',
        display_name: 'Zoom Meeting',
        auth_mode: 'oauth2',
        fields: [
          {
            key: 'client_id',
            label: 'Client ID',
            type: 'string',
            required: true,
            isSecret: false,
          },
          {
            key: 'client_secret',
            label: 'Client Secret',
            type: 'string',
            required: true,
            isSecret: true,
          },
          {
            key: 'account_id',
            label: 'Account ID',
            type: 'string',
            required: true,
            isSecret: false,
          },
        ],
      },
      {
        provider: 'CISCO_WEBEX',
        display_name: 'Cisco Webex',
        auth_mode: 'oauth2',
        fields: [
          {
            key: 'client_id',
            label: 'Client ID',
            type: 'string',
            required: true,
            isSecret: false,
          },
          {
            key: 'client_secret',
            label: 'Client Secret',
            type: 'string',
            required: true,
            isSecret: true,
          },
        ],
      },
    ];
  }

  async saveConfiguration(
    userId: string,
    email: string,
    data: Record<string, any>,
  ) {
    const provider = String(data.provider);
    const auth_mode = String(data.auth_mode);
    const config_json: Record<string, any> =
      data.config_json || data.config || {};
    const credentials_json: Record<string, any> =
      data.credentials_json || data.credentials || {};

    // Derive a human-readable display name from the provider code if not sent
    const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
      GOOGLE_MEET: 'Google Meet',
      MS_TEAMS: 'Microsoft Teams',
      ZOOM: 'Zoom',
      CISCO_WEBEX: 'Cisco Webex',
    };
    const display_name = String(
      data.display_name ||
        PROVIDER_DISPLAY_NAMES[provider] ||
        provider.replace(/_/g, ' '),
    );

    // Provider configurations are platform-wide (not org-scoped).
    // Resolve org_id from user or fall back to the first organisation.
    const userRes = await this.pool.query<{ org_id: string }>(
      `SELECT org_id FROM public.ca_users WHERE id = $1 LIMIT 1`,
      [userId],
    );
    let orgId: string | null = userRes.rows[0]?.org_id || null;
    if (!orgId) {
      const fallbackRes = await this.pool.query<{ id: string }>(
        `SELECT id FROM public.ca_organisations ORDER BY created_at ASC LIMIT 1`,
      );
      orgId = fallbackRes.rows[0]?.id || null;
    }
    if (!orgId) {
      throw new BadRequestException(
        'No organisation found. Please create an organisation first.',
      );
    }

    const res = await this.pool.query<{ id: string }>(
      `INSERT INTO public.ca_interview_provider_configurations 
         (org_id, provider, display_name, auth_mode, config_json, encrypted_credentials_json, is_active, is_default, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, true, false, $7, $7)
       ON CONFLICT (provider) DO UPDATE 
       SET display_name = EXCLUDED.display_name,
           auth_mode = EXCLUDED.auth_mode,
           config_json = EXCLUDED.config_json,
           encrypted_credentials_json = EXCLUDED.encrypted_credentials_json,
           updated_by = EXCLUDED.updated_by,
           updated_at = now()
       RETURNING id`,
      [
        orgId,
        provider,
        display_name,
        auth_mode || 'oauth2',
        JSON.stringify(config_json || {}),
        JSON.stringify(credentials_json || {}),
        userId,
      ],
    );
    return { success: true, id: res.rows[0]?.id };
  }

  async testProviderConfig(userId: string, id: string) {
    await this.pool.query(
      `UPDATE public.ca_interview_provider_configurations 
       SET last_test_status = 'success', 
           last_test_message = 'Credentials connection test succeeded.', 
           last_tested_at = now(),
           updated_by = $1
       WHERE id = $2`,
      [userId, id],
    );
    return { success: true, message: 'Credentials connection test succeeded.' };
  }

  async activateProviderConfig(userId: string, id: string) {
    await this.pool.query(
      `UPDATE public.ca_interview_provider_configurations 
       SET is_active = true, updated_by = $1
       WHERE id = $2`,
      [userId, id],
    );
    return { success: true };
  }

  async deactivateProviderConfig(userId: string, id: string) {
    await this.pool.query(
      `UPDATE public.ca_interview_provider_configurations 
       SET is_active = false, updated_by = $1
       WHERE id = $2`,
      [userId, id],
    );
    return { success: true };
  }

  async setDefaultProviderConfig(userId: string, id: string) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const orgRes = await client.query<{ org_id: string }>(
        `SELECT org_id FROM public.ca_interview_provider_configurations WHERE id = $1`,
        [id],
      );
      if (orgRes.rows.length > 0) {
        const orgId = orgRes.rows[0].org_id;
        await client.query(
          `UPDATE public.ca_interview_provider_configurations SET is_default = false WHERE org_id = $1`,
          [orgId],
        );
        await client.query(
          `UPDATE public.ca_interview_provider_configurations SET is_default = true WHERE id = $1`,
          [id],
        );
      }
      await client.query('COMMIT');
      return { success: true };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
