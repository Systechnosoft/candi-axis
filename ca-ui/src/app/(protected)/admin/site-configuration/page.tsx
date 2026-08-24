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
  Cpu,
  RefreshCw,
  Plus,
  X
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
    model: 'qwen/qwen3.6-27b',
    baseUrl: 'https://api.groq.com/openai/v1',
    label: 'Groq'
  }
};

type ApiKeyStatus = 'active' | 'unavailable' | 'invalid';

interface UiApiKey {
  id?: string;
  key: string;
  maskedKey?: string;
  isNew?: boolean;
  status?: ApiKeyStatus;
  lastUsedAt?: string;
}

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
  const [keys, setKeys] = useState<UiApiKey[]>([]);
  const [model, setModel] = useState<string>('');
  const [isCustomModel, setIsCustomModel] = useState<boolean>(false);
  const [baseUrl, setBaseUrl] = useState<string>('');
  
  const [showKeyIndex, setShowKeyIndex] = useState<number | null>(null);
  const [isForgetModalOpen, setIsForgetModalOpen] = useState(false);
  const [keyToRemoveIndex, setKeyToRemoveIndex] = useState<number | null>(null);
  
  const [availableModels, setAvailableModels] = useState<string[] | null>(null);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [fetchModelsError, setFetchModelsError] = useState<string | null>(null);



  const fetchConfig = async () => {
    try {
      setLoading(true);
      const data = await AdminService.getAiConfig();
      console.log('Fetched AI Config:', data);
      setConfig(data);
      
      const activeProv = data.provider || 'gemini';
      setSelectedProvider(activeProv);
      setIsCustomModel(false);
      
      const provDetails = data.providers?.[activeProv];
      if (provDetails) {
        if (provDetails.keys && provDetails.keys.length > 0) {
          setKeys(provDetails.keys.map((k: any) => ({
            id: k.id,
            key: '',
            maskedKey: k.maskedKey,
            status: k.status || 'active',
            isNew: false,
            lastUsedAt: k.lastUsedAt
          })));
        } else if (provDetails.has_custom_key) {
          setKeys([{
            id: 'legacy-key',
            key: '',
            maskedKey: provDetails.maskedKey,
            status: 'active',
            isNew: false
          }]);
        } else {
          setKeys([]);
        }
        setModel(provDetails.model || PROVIDER_DEFAULTS[activeProv].model);
        setBaseUrl(provDetails.base_url || PROVIDER_DEFAULTS[activeProv].baseUrl);
      } else {
        setKeys([]);
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
    
    const defaults = PROVIDER_DEFAULTS[newProv];
    const dbProvDetails = config?.providers?.[newProv];
    
    setModel(dbProvDetails?.model || defaults.model);
    setBaseUrl(dbProvDetails?.base_url || defaults.baseUrl);
    setIsCustomModel(false);

    if (dbProvDetails) {
      if (dbProvDetails.keys && dbProvDetails.keys.length > 0) {
        setKeys(dbProvDetails.keys.map((k: any) => ({
          id: k.id,
          key: '',
          maskedKey: k.maskedKey,
          status: k.status || 'active',
          isNew: false,
          lastUsedAt: k.lastUsedAt
        })));
      } else if (dbProvDetails.has_custom_key) {
        setKeys([{
          id: 'legacy-key',
          key: '',
          maskedKey: dbProvDetails.maskedKey,
          status: 'active',
          isNew: false
        }]);
      } else {
        setKeys([]);
      }
    } else {
      setKeys([]);
    }
    setAvailableModels(null);
    setFetchModelsError(null);
  };

  const handleFetchModels = async () => {
    setIsFetchingModels(true);
    setFetchModelsError(null);
    try {
      const activeKeys = keys.filter(k => k.status === 'active' || k.isNew);
      const testKey = activeKeys.length > 0 ? (activeKeys[0].isNew ? activeKeys[0].key : undefined) : undefined;
      
      const models = await AdminService.fetchModels({
        provider: selectedProvider,
        api_key: testKey
      });
      setAvailableModels(models);
      if (models.length === 0) {
        setFetchModelsError('No models returned. Feature may not be fully supported for this provider yet.');
      } else {
        setSuccessMsg(`Successfully fetched ${models.length} models from ${selectedProvider}.`);
      }
    } catch (err: any) {
      setFetchModelsError(err.data?.message || err.message || 'Failed to fetch models from provider.');
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    // Validate that new keys are not empty
    const filteredKeys = keys.filter(k => !k.isNew || (k.isNew && k.key.trim().length > 0));

    try {
      await AdminService.updateAiConfig({
        provider: selectedProvider,
        model: model,
        base_url: baseUrl,
        keys: filteredKeys.map(k => ({
          id: k.isNew ? undefined : k.id,
          key: k.key,
          isNew: k.isNew,
          status: (k.status === 'unavailable' ? 'disabled' : k.status || 'active') as any
        }))
      });

      setSuccessMsg('AI Configuration saved successfully.');
      
      // Refresh config to update local state
      const updatedConfig = await AdminService.getAiConfig();
      setConfig(updatedConfig);
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

  const handleAddKey = () => {
    setKeys([...keys, { key: '', isNew: true, status: 'active' }]);
  };

  const handleRemoveKey = (index: number) => {
    const keyToRemove = keys[index];
    if (!keyToRemove.isNew) {
      setKeyToRemoveIndex(index);
      return;
    }
    const newKeys = [...keys];
    newKeys.splice(index, 1);
    setKeys(newKeys);
  };

  const confirmRemoveKey = () => {
    if (keyToRemoveIndex !== null) {
      const newKeys = [...keys];
      newKeys.splice(keyToRemoveIndex, 1);
      setKeys(newKeys);
      setKeyToRemoveIndex(null);
    }
  };

  const updateKeyInput = (index: number, val: string) => {
    const newKeys = [...keys];
    newKeys[index].key = val;
    setKeys(newKeys);
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

  const isKeyConfigured = keys.length > 0;
  const isSystemDefault = config && config.providers && config.providers[selectedProvider] && config.providers[selectedProvider].is_system_default;
  const hasHealthyKeys = keys.some(k => k.status === 'active');

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      <PageHeader 
        title="Site Configuration" 
        description="Configure system-wide integrations, AI parsing engines, and credentials securely."
      />

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
            <div className="p-6 border-b border-border bg-subtle/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-brand" />
                <div>
                  <h3 className="font-semibold text-text-primary text-base">AI Parsing & Matching Provider</h3>
                  <p className="text-xs text-text-secondary">Configure the model used for candidate resume parsing and job ratings.</p>
                </div>
              </div>
              
              <div className="flex-shrink-0">
                {isKeyConfigured ? (
                  isSystemDefault ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand/10 text-brand-dark border border-brand/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                      System Default Active
                    </span>
                  ) : hasHealthyKeys ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-success/10 text-success-dark border border-success/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                      API Keys Active ({keys.filter(k => k.status === 'active').length})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-status-error/10 text-status-error border border-status-error/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-status-error" />
                      No Healthy API Keys
                    </span>
                  )
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-warning/10 text-warning-dark border border-warning/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                    API Key Missing / Incomplete
                  </span>
                )}
              </div>
            </div>

            <div className="p-6 flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-1">AI Provider</label>
                  <p className="text-xs text-text-secondary">Select which LLM provider handles backend operations.</p>
                </div>
                <div className="md:col-span-2">
                  <SingleSelect
                    options={Object.entries(PROVIDER_DEFAULTS).map(([key, details]) => ({ id: key, name: details.label }))}
                    selectedId={selectedProvider}
                    onChange={handleProviderChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-1 flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-text-muted" /> API Keys
                  </label>
                  <p className="text-xs text-text-secondary">Provide one or more credentials. The system will automatically failover between them on quota limits.</p>
                </div>
                <div className="md:col-span-2 flex flex-col gap-3">
                  {keys.map((k, index) => {
                    const isErrorState = k.status === 'invalid' || k.status === 'unavailable';
                    return (
                      <div key={k.id || `new-${index}`} className="flex flex-col gap-2 p-3 rounded-lg border border-border bg-subtle/30">
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            {k.isNew ? (
                              <input 
                                type={showKeyIndex === index ? 'text' : 'password'}
                                placeholder="Enter API key"
                                value={k.key}
                                onChange={(e) => updateKeyInput(index, e.target.value)}
                                className="w-full pl-3 pr-10 py-2 rounded-md border border-border bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand font-mono"
                                required={k.isNew}
                              />
                            ) : (
                              <div className="w-full pl-3 py-2 rounded-md border border-border bg-surface/50 text-sm font-mono text-text-primary">
                                {k.maskedKey || '••••••••••••••••'}
                              </div>
                            )}
                            {k.isNew && (
                              <button 
                                type="button"
                                onClick={() => setShowKeyIndex(showKeyIndex === index ? null : index)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors focus:outline-none"
                              >
                                {showKeyIndex === index ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            )}
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => handleRemoveKey(index)}
                            className="flex items-center justify-center w-9 h-9 rounded-md border border-border bg-surface text-text-secondary hover:text-status-error hover:border-status-error/30 transition-colors focus:outline-none"
                            title="Remove Key"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        
                        {!k.isNew && (
                          <div className="flex items-center justify-between mt-1 px-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-text-secondary">
                                Status: {k.status === 'unavailable' ? 'Unavailable' : 
                                         k.status === 'invalid' ? 'Invalid' : 'Active'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={handleAddKey}
                    className="w-full border-dashed flex items-center justify-center gap-2 py-3"
                  >
                    <Plus className="w-4 h-4" /> Add API Key
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-1 flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-text-muted" /> Model
                  </label>
                  <p className="text-xs text-text-secondary">Specify the custom model name or identifier to utilize.</p>
                </div>
                <div className="md:col-span-2">
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      {isCustomModel ? (
                        <div className="flex w-full gap-2 relative">
                          <input 
                            type="text"
                            required
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            placeholder="Type custom model name..."
                            className="w-full px-3 py-2 pr-16 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setIsCustomModel(false);
                              setModel(availableModels?.[0] || PROVIDER_DEFAULTS[selectedProvider]?.model || '');
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-text-primary font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <SingleSelect
                          options={[
                            ...(model && availableModels && !availableModels.includes(model) ? [{ id: model, name: `${model} (Unavailable)` }] : []),
                            ...(model && !availableModels ? [{ id: model, name: model }] : []),
                            ...(availableModels?.map(m => ({ id: m, name: m })) || []),
                            ...((!availableModels || availableModels.length === 0) && !model ? [{ id: '', name: 'Fetch models to select...' }] : []),
                            { id: '__other__', name: 'Other (Type custom name)' }
                          ]}
                          selectedId={model}
                          onChange={(id) => {
                            if (id === '__other__') {
                              setIsCustomModel(true);
                              setModel('');
                            } else {
                              setModel(id);
                            }
                          }}
                        />
                      )}
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleFetchModels}
                        disabled={isFetchingModels || (!isKeyConfigured)}
                        className="whitespace-nowrap flex items-center gap-1.5"
                      >
                        {isFetchingModels ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Fetch Models
                      </Button>
                    </div>
                    {fetchModelsError && (
                      <p className="text-xs text-status-error">{fetchModelsError}</p>
                    )}
                  </div>
                </div>
              </div>

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

      {keyToRemoveIndex !== null && (
        <ModalShell
          title="Remove API Key"
          onClose={() => setKeyToRemoveIndex(null)}
          footer={
            <div className="flex justify-end gap-3 w-full">
              <Button 
                variant="secondary" 
                onClick={() => setKeyToRemoveIndex(null)}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmRemoveKey}
              >
                Remove
              </Button>
            </div>
          }
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-error-50 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-error-dark" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary mb-1">
                Are you sure you want to remove this saved API key?
              </p>
              <p className="text-sm text-text-secondary">
                This action will not be permanent until you click &apos;Save Configuration&apos;.
              </p>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
