import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { AdminSettingsService } from '../admin/admin-settings.service';

export interface AiExecutionError extends Error {
  response?: {
    status?: number;
    data?: any;
    headers?: any;
  };
  status?: number;
}

@Injectable()
export class AiExecutionService {
  private readonly logger = new Logger(AiExecutionService.name);

  constructor(
    @Inject(forwardRef(() => AdminSettingsService))
    private readonly adminSettingsService: AdminSettingsService,
  ) {}

  /**
   * Executes an AI API call with automatic failover between available API keys.
   * @param email Organization context email
   * @param provider The AI provider (e.g. 'gemini', 'openai', 'groq')
   * @param action The closure to execute with the active API key
   * @returns Result of the action
   */
  async executeWithFailover<T>(
    email: string,
    provider: string,
    action: (apiKey: string) => Promise<T>,
  ): Promise<T> {
    const eligibleKeys = await this.adminSettingsService.getEligibleApiKeys(email, provider);
    
    if (eligibleKeys.length === 0) {
      throw new Error(`No available or eligible API keys for AI provider: ${provider}`);
    }

    let lastError: Error | null = null;

    for (let i = 0; i < eligibleKeys.length; i++) {
      const keyItem = eligibleKeys[i];
      try {
        this.logger.debug(`Attempting AI call with key id: ${keyItem.id} for provider ${provider}`);
        const result = await action(keyItem.decryptedKey);
        
        // If it succeeds, the key remains active. No DB update needed for status.
        
        return result;
      } catch (err: any) {
        lastError = err;
        this.logger.error(`AI execution failed with key id: ${keyItem.id}: ${err.message}`);
        
        const isCritical = await this.classifyAndHandleError(email, provider, keyItem.id, err);
        
        // If error is related to payload, model, or infrastructure, do not failover - bubble it up
        if (!isCritical) {
          throw err;
        }
        // Otherwise, continue to the next key (failover)
      }
    }

    throw new Error(`AI service is currently unavailable for this operation. All eligible keys failed. Last error: ${lastError?.message}`);
  }

  /**
   * Classifies the error and updates key health status appropriately.
   * Returns true if the error is key-specific (and we should try the next key).
   * Returns false if the error is request/infrastructure specific (and we should NOT failover).
   */
  private async classifyAndHandleError(email: string, provider: string, keyId: string, err: AiExecutionError): Promise<boolean> {
    const status = err.response?.status || err.status;
    const message = err.message?.toLowerCase() || '';

    // 401 - Invalid Credential
    if (status === 401 || message.includes('invalid api key') || message.includes('unauthorized') || message.includes('incorrect api key')) {
      await this.adminSettingsService.updateApiKeyStatus(email, provider, keyId, 'invalid');
      return true; // failover
    }

    // 403 - Permission Restriction / Revoked
    if (status === 403) {
      // Do not automatically mark key invalid on 403. Treat as provider error.
      return false; // do NOT failover
    }

    // 429 - Rate Limit / Quota Exhausted
    if (status === 429 || message.includes('rate limit') || message.includes('too many requests') || message.includes('quota') || message.includes('429')) {
      await this.adminSettingsService.updateApiKeyStatus(email, provider, keyId, 'unavailable');
      return true; // failover
    }

    // 413 - Payload Too Large
    if (status === 413 || message.includes('payload too large') || message.includes('context_length_exceeded') || message.includes('maximum context length')) {
      // NOT a key health issue. Do NOT failover.
      return false;
    }

    // 5xx / Network Errors / Timeout
    if ((status && status >= 500) || message.includes('timeout') || message.includes('econnreset') || message.includes('fetch error')) {
      // Transient infrastructure error. Do NOT failover by marking key unhealthy, although one might retry with same key.
      // We will let it fail the request immediately to avoid exhausting limits unnecessarily.
      return false;
    }

    // Unsupported model, etc.
    if (status === 404 || message.includes('model not found') || message.includes('does not exist')) {
       // Request specific
       return false;
    }

    // Default: bubble up, do not burn other keys on unknown errors
    return false;
  }
}
