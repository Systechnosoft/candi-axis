'use client';

import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/primitives/Card';
import { Button } from '@/components/primitives/Button';
import { ModalShell } from '@/components/primitives/ModalShell';
import { useAuth } from '@/contexts/AuthContext';
import { AdminService } from '@/lib/api/admin';
import { 
  Eye, 
  EyeOff, 
  Trash2, 
  Save, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  Lock,
  Globe,
  Cpu
} from 'lucide-react';

const PROVIDER_DEFAULTS: Record<string, { model: string; baseUrl: string; label: string }> = {
  gemini: {
    model: 'gemini-2.5-flash',
    baseUrl: 'https://generativelanguage.googleapis.com',
    label: 'Google Gemini'
  },
  openai: {
    model: 'gpt-5',
    baseUrl: 'https://api.openai.com/v1',
    label: 'OpenAI'
  },
  anthropic: {
    model: 'claude-sonnet',
    baseUrl: 'https://api.anthropic.com',
    label: 'Anthropic Claude'
  },
  groq: {
    model: 'llama-3.3-70b-versatile',
    baseUrl: 'https://api.groq.com/openai/v1',
    label: 'Groq'
  }
};

export default function SiteConfigurationPage() {
  const { hasAccess } = useAuth();
  const isAdmin = hasAccess('users');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active DB configuration
  const [config, setConfig] = useState<any>(null);

  // Form State
  const [selectedProvider, setSelectedProvider] = useState<string>('gemini');
  const [apiKey, setApiKey] = useState<string>('');
  const [model, setModel] = useState<string>('');
  const [baseUrl, setBaseUrl] = useState<string>('');
  
  const [showKey, setShowKey] = useState(false);
  const [isForgetModalOpen, setIsForgetModalOpen] = useState(false);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const data = await AdminService.getAiConfig();
      setConfig(data);
      
      const activeProv = data.provider || 'gemini';
      setSelectedProvider(activeProv);
      
      const provDetails = data.providers?.[activeProv];
      if (provDetails) {
        setApiKey(provDetails.maskedKey || '');
        setModel(provDetails.model || PROVIDER_DEFAULTS[activeProv].model);
        setBaseUrl(provDetails.base_url || PROVIDER_DEFAULTS[activeProv].baseUrl);
      } else {
        setApiKey('');
        setModel(PROVIDER_DEFAULTS[activeProv].model);
        setBaseUrl(PROVIDER_DEFAULTS[activeProv].baseUrl);
      }
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.data?.message || err.message || 'Failed to load AI configuration settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchConfig();
    }
  }, [isAdmin]);

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProv = e.target.value;
    setSelectedProvider(newProv);
    
    // Auto populate model & base url based on new provider
    const defaults = PROVIDER_DEFAULTS[newProv];
    setModel(defaults.model);
    setBaseUrl(defaults.baseUrl);

    // Populate key if exists in DB config
    const dbProvDetails = config?.providers?.[newProv];
    if (dbProvDetails && dbProvDetails.has_custom_key) {
      setApiKey(dbProvDetails.maskedKey || '');
    } else {
      setApiKey('');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      await AdminService.updateAiConfig({
        provider: selectedProvider,
        custom_api_key: apiKey === '' ? '' : apiKey,
        model: model,
        base_url: baseUrl
      });

      setSuccessMsg('AI Configuration saved successfully.');
      await fetchConfig();
    } catch (err: any) {
      setErrorMsg(err.data?.message || err.message || 'Failed to update AI settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleForgetConfirm = async () => {
    setDeleting(true);
    setIsForgetModalOpen(false);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      await AdminService.clearApiKey(selectedProvider);
      setSuccessMsg(`Successfully cleared API Key for ${PROVIDER_DEFAULTS[selectedProvider]?.label || selectedProvider}.`);
      await fetchConfig();
    } catch (err: any) {
      setErrorMsg(err.data?.message || err.message || 'Failed to clear API key.');
    } finally {
      setDeleting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-error-50 border border-error text-error-dark p-6 rounded-lg flex items-start gap-4">
          <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-lg">Access Denied</h3>
            <p className="mt-1 text-sm">You do not have the required permissions to view or update site settings. Please contact your system administrator.</p>
          </div>
        </div>
      </div>
    );
  }

  // Check if API key is configured in DB for selected provider
  const isKeyConfigured = config?.providers?.[selectedProvider]?.has_custom_key;

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-10">
      <PageHeader 
        title="Site Configuration" 
        actions={null}
      />
      <p className="text-text-secondary -mt-2">Configure system-wide integrations, AI parsing engines, and credentials securely.</p>

      {successMsg && (
        <div className="bg-success/10 border border-success/30 text-success-dark px-4 py-3 rounded-lg flex items-center gap-3 text-sm animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}


      {loading ? (
        <div className="flex items-center justify-center p-20 text-text-muted">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="flex flex-col gap-6">
          <Card className="overflow-hidden">
            {/* Header section with active configuration status banner */}
            <div className="p-6 border-b border-border bg-subtle/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-brand" />
                <div>
                  <h3 className="font-semibold text-text-primary text-base">AI Parsing & Matching Provider</h3>
                  <p className="text-xs text-text-secondary">Configure the model used for candidate resume parsing and job ratings.</p>
                </div>
              </div>
              
              {/* API Key validation status badge */}
              <div className="flex-shrink-0">
                {isKeyConfigured ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-success/10 text-success-dark border border-success/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                    API Key is Configured
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-warning/10 text-warning-dark border border-warning/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                    API Key Missing / Incomplete
                  </span>
                )}
              </div>
            </div>

            <div className="p-6 flex flex-col gap-6">
              {/* Provider Selection */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-1">AI Provider</label>
                  <p className="text-xs text-text-secondary">Select which LLM provider handles backend operations.</p>
                </div>
                <div className="md:col-span-2">
                  <select 
                    value={selectedProvider}
                    onChange={handleProviderChange}
                    className="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                  >
                    {Object.entries(PROVIDER_DEFAULTS).map(([key, details]) => (
                      <option key={key} value={key}>{details.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* API Key */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-1 flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-text-muted" /> API Key
                  </label>
                  <p className="text-xs text-text-secondary">Credentials will be encrypted securely at rest in our database.</p>
                </div>
                <div className="md:col-span-2">
                  <div className="relative">
                    <input 
                      type={showKey ? 'text' : 'password'}
                      placeholder={isKeyConfigured ? '••••••••••••••••' : 'Enter your API key'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full pl-3 pr-10 py-2 rounded-md border border-border bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand font-mono"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors focus:outline-none"
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {isKeyConfigured && (
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-text-secondary">Masked Key: <span className="font-mono bg-subtle px-1.5 py-0.5 rounded text-text-primary">{config?.providers?.[selectedProvider]?.maskedKey}</span></span>
                      <button 
                        type="button"
                        onClick={() => setIsForgetModalOpen(true)}
                        className="text-xs text-status-error hover:text-status-error/90 font-medium flex items-center gap-1 hover:underline focus:outline-none"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Forget API Key
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Model */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-1 flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-text-muted" /> Model
                  </label>
                  <p className="text-xs text-text-secondary">Specify the custom model name or identifier to utilize.</p>
                </div>
                <div className="md:col-span-2">
                  <input 
                    type="text"
                    required
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. gemini-2.5-flash"
                    className="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand font-mono"
                  />
                </div>
              </div>

              {/* Base URL */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-1 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-text-muted" /> Base URL
                  </label>
                  <p className="text-xs text-text-secondary">The endpoint target for routing the API request payloads.</p>
                </div>
                <div className="md:col-span-2">
                  <input 
                    type="url"
                    required
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="e.g. https://api.openai.com/v1"
                    className="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="px-6 py-4 border-t border-border bg-subtle flex justify-end gap-3">
              <Button 
                type="submit" 
                variant="primary" 
                disabled={saving || deleting}
                className="flex items-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Configuration
              </Button>
            </div>
          </Card>
        </form>
      )}

      {/* Confirmation Modal for Revocation */}
      {isForgetModalOpen && (
        <ModalShell
          title="Revoke API Key"
          onClose={() => setIsForgetModalOpen(false)}
          footer={
            <>
              <Button 
                variant="secondary" 
                onClick={() => setIsForgetModalOpen(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                className="bg-status-error text-white hover:bg-status-error/95"
                onClick={handleForgetConfirm}
                disabled={deleting}
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5 inline" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-1.5 inline" />
                )}
                Confirm Revocation
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-3">
            <p className="text-sm text-text-primary font-medium">
              Forget {PROVIDER_DEFAULTS[selectedProvider]?.label || selectedProvider} API Key?
            </p>
            <p className="text-xs text-text-secondary">
              This action will permanently delete the encrypted API Key from the database. Resume parsing and application rating matching using this provider will be disabled until a new key is provided.
            </p>
          </div>
        </ModalShell>
      )}

      {/* Error Dialog Modal */}
      {errorMsg && (
        <ModalShell
          title="Configuration Failed"
          onClose={() => setErrorMsg(null)}
          footer={
            <Button 
              variant="primary" 
              onClick={() => setErrorMsg(null)}
              className="w-full sm:w-auto"
            >
              Dismiss
            </Button>
          }
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-error-50 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-error-dark" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary mb-1">
                Save failed with the following error:
              </p>
              <p className="text-sm text-text-secondary break-words whitespace-pre-line leading-relaxed">
                {errorMsg}
              </p>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
