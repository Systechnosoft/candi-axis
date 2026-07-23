'use client';

import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/primitives/Card';
import { Button } from '@/components/primitives/Button';
import { useAuth } from '@/contexts/AuthContext';
import { AdminService } from '@/lib/api/admin';
import {
  Eye,
  EyeOff,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Lock,
  Globe,
  Settings,
  RefreshCw,
  Power,
  Star,
  Check,
  Video,
  X,
  AlertTriangle
} from 'lucide-react';

const PROVIDER_METADATA: Record<string, { label: string; logoUrl?: string; color: string }> = {
  GOOGLE_MEET: { label: 'Google Meet', color: 'bg-blue-500/10 border-blue-500 text-blue-500' },
  MICROSOFT_TEAMS: { label: 'Microsoft Teams', color: 'bg-indigo-500/10 border-indigo-500 text-indigo-500' },
  ZOOM: { label: 'Zoom Meeting', color: 'bg-sky-500/10 border-sky-500 text-sky-500' },
  CISCO_WEBEX: { label: 'Cisco Webex', color: 'bg-orange-500/10 border-orange-500 text-orange-500' }
};

export default function InterviewConfigurationPage() {
  const { session } = useAuth();
  const isSuperAdmin = session?.roles.includes('super_admin');

  const [loading, setLoading] = useState(true);
  const [configurations, setConfigurations] = useState<any[]>([]);
  const [schemas, setSchemas] = useState<Record<string, any>>({});
  
  // Selected configuration details
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [activeSchema, setActiveSchema] = useState<any | null>(null);
  const [formFields, setFormFields] = useState<Record<string, any>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  // UI Actions states
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [activating, setActivating] = useState(false);
  const [settingDefault, setSettingDefault] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchConfigurations = async () => {
    try {
      setLoading(true);
      const configs = await AdminService.getConfigurations();
      setConfigurations(configs);

      // Load schemas for providers
      const schemasList = await AdminService.getProviders();
      const schemasMap: Record<string, any> = {};
      schemasList.forEach((s) => {
        schemasMap[s.provider] = s;
      });
      setSchemas(schemasMap);
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.data?.message || err.message || 'Failed to load configurations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchConfigurations();
    }
  }, [isSuperAdmin]);

  const selectProviderCard = async (provider: string) => {
    setSelectedProvider(provider);
    setSuccessMsg(null);
    setErrorMsg(null);

    const schema = schemas[provider];
    setActiveSchema(schema);

    // Fetch existing configuration values if any
    try {
      const existing = configurations.find((c) => c.provider === provider);
      const defaults: Record<string, any> = {};

      schema.fields.forEach((f: any) => {
        defaults[f.key] = f.defaultValue || '';
      });

      if (existing) {
        // Merge saved config + secrets
        setFormFields({
          ...defaults,
          ...existing.config,
          ...existing.credentials
        });
      } else {
        setFormFields(defaults);
      }
    } catch (err: any) {
      setErrorMsg(`Failed to load schema details for ${provider}`);
    }
  };

  const handleInputChange = (key: string, value: any) => {
    setFormFields((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider || !activeSchema) return;

    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    // Separate configuration config and credentials
    const configPayload: Record<string, any> = {};
    const credentialsPayload: Record<string, any> = {};

    activeSchema.fields.forEach((field: any) => {
      const val = formFields[field.key];
      if (field.isSecret) {
        credentialsPayload[field.key] = val;
      } else {
        configPayload[field.key] = val;
      }
    });

    try {
      await AdminService.saveProviderConfig({
        provider: selectedProvider,
        config: configPayload,
        credentials: credentialsPayload
      });

      setSuccessMsg(`${PROVIDER_METADATA[selectedProvider || '']?.label || selectedProvider} configuration saved successfully.`);
      await fetchConfigurations();
      
      // Reselect to update password masks
      const updatedConfigs = await AdminService.getConfigurations();
      const updatedRow = updatedConfigs.find((c: any) => c.provider === selectedProvider);
      if (updatedRow) {
        setFormFields((prev) => ({
          ...prev,
          ...updatedRow.config,
          ...updatedRow.credentials
        }));
      }
    } catch (err: any) {
      setErrorMsg(err.data?.message || err.message || 'Failed to save configuration settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    const existing = configurations.find((c) => c.provider === selectedProvider);
    if (!existing) {
      setErrorMsg('Please save the configuration before testing connection.');
      return;
    }

    setTesting(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await AdminService.testProviderConfig(existing.id);
      if (res.success) {
        setSuccessMsg(`Test connection successful: ${res.message}`);
      } else {
        setErrorMsg(`Test connection failed: ${res.message}`);
      }
      await fetchConfigurations();
    } catch (err: any) {
      setErrorMsg(err.data?.message || err.message || 'Test connection encountered an error.');
    } finally {
      setTesting(false);
    }
  };

  const handleActivationToggle = async (active: boolean) => {
    const existing = configurations.find((c) => c.provider === selectedProvider);
    if (!existing) return;

    setActivating(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      if (active) {
        await AdminService.activateProviderConfig(existing.id);
        setSuccessMsg(`${PROVIDER_METADATA[selectedProvider || '']?.label} configuration activated successfully.`);
      } else {
        await AdminService.deactivateProviderConfig(existing.id);
        setSuccessMsg(`${PROVIDER_METADATA[selectedProvider || '']?.label} configuration deactivated successfully.`);
      }
      await fetchConfigurations();
    } catch (err: any) {
      setErrorMsg(err.data?.message || err.message || 'Failed to update activation state.');
    } finally {
      setActivating(false);
    }
  };

  const handleSetDefault = async () => {
    const existing = configurations.find((c) => c.provider === selectedProvider);
    if (!existing) return;

    setSettingDefault(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      await AdminService.setDefaultProviderConfig(existing.id);
      setSuccessMsg(`${PROVIDER_METADATA[selectedProvider || '']?.label} is now the default meeting provider.`);
      await fetchConfigurations();
    } catch (err: any) {
      setErrorMsg(err.data?.message || err.message || 'Failed to set default provider.');
    } finally {
      setSettingDefault(false);
    }
  };

  const toggleSecretVisibility = (key: string) => {
    setShowSecrets((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  if (!isSuperAdmin) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold text-text-primary mb-2">Access Denied</h2>
        <p className="text-sm text-text-secondary">You do not have the required permissions to view this page. Please contact your system administrator.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-10">
      <PageHeader 
        title="Interview Configuration" 
        actions={null}
      />
      <p className="text-text-secondary -mt-2">
        Manage configurations and API credentials settings for your interview meeting providers.
      </p>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg flex items-center gap-3 text-sm animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-lg flex items-center gap-3 text-sm animate-in fade-in duration-200">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading && configurations.length === 0 ? (
        <div className="flex items-center justify-center p-20 text-text-muted">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Provider List Column */}
          <div className="md:col-span-1 flex flex-col gap-4">
            <h3 className="font-semibold text-sm text-text-secondary uppercase tracking-wider mb-1">
              Providers
            </h3>
            {Object.keys(PROVIDER_METADATA).map((provKey) => {
              const meta = PROVIDER_METADATA[provKey];
              const dbRow = configurations.find((c) => c.provider === provKey);
              const isSelected = selectedProvider === provKey;

              return (
                <Card
                  key={provKey}
                  onClick={() => selectProviderCard(provKey)}
                  className={`cursor-pointer transition-all hover:scale-[1.01] overflow-hidden relative border p-4 flex flex-col gap-2 ${
                    isSelected ? 'border-brand ring-1 ring-brand bg-brand/5 shadow-md' : 'border-border bg-surface'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded border ${meta.color}`}>
                        <Video className="w-4 h-4" />
                      </div>
                      <span className="font-semibold text-sm text-text-primary">
                        {meta.label}
                      </span>
                    </div>

                    {dbRow?.is_default && (
                      <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-800" />
                        Default
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 items-center text-xs mt-2 justify-between">
                    <div className="flex gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          dbRow?.is_active
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {dbRow?.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          dbRow ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {dbRow ? 'Configured' : 'Not Configured'}
                      </span>
                    </div>

                    {dbRow?.last_test_status && (
                      <span
                        className={`text-[10px] uppercase font-bold tracking-tight ${
                          dbRow.last_test_status === 'SUCCESS' ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        Test: {dbRow.last_test_status}
                      </span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Configuration Form Column */}
          <div className="md:col-span-2 flex flex-col gap-4">
            {selectedProvider && activeSchema ? (
              <Card className="p-6 border border-border bg-surface shadow-sm">
                <div className="flex justify-between items-center border-b border-border pb-4 mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-text-primary">
                      {PROVIDER_METADATA[selectedProvider || '']?.label} Settings
                    </h2>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {activeSchema.description}
                    </p>
                  </div>

                  {configurations.find((c) => c.provider === selectedProvider) && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={testing}
                        onClick={handleTestConnection}
                        className="flex items-center gap-1 text-xs"
                      >
                        {testing ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                        Test Connection
                      </Button>
                      
                      {configurations.find((c) => c.provider === selectedProvider)?.is_active ? (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={settingDefault || configurations.find((c) => c.provider === selectedProvider)?.is_default}
                            onClick={handleSetDefault}
                            className="flex items-center gap-1 text-xs"
                          >
                            <Star className="w-3 h-3" />
                            Set Default
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={activating}
                            onClick={() => handleActivationToggle(false)}
                            className="flex items-center gap-1 text-xs text-rose-600 hover:bg-rose-50"
                          >
                            <Power className="w-3 h-3" />
                            Deactivate
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={activating}
                          onClick={() => handleActivationToggle(true)}
                          className="flex items-center gap-1 text-xs text-emerald-600 hover:bg-emerald-50"
                        >
                          <Power className="w-3 h-3" />
                          Activate
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                  {activeSchema.fields.map((field: any) => {
                    const isSecret = field.isSecret;
                    const value = formFields[field.key] || '';
                    const isVisible = showSecrets[field.key] || false;

                    return (
                      <div key={field.key} className="flex flex-col gap-1.5 text-left">
                        <label className="text-xs font-bold text-text-primary uppercase tracking-wider">
                          {field.label} {field.required && <span className="text-rose-500">*</span>}
                        </label>

                        {field.type === 'select' ? (
                          <select
                            value={value}
                            required={field.required}
                            onChange={(e) => handleInputChange(field.key, e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface text-text-primary"
                          >
                            <option value="">Select option...</option>
                            {field.options?.map((opt: any) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : isSecret ? (
                          <div className="relative">
                            <input
                              type={isVisible ? 'text' : 'password'}
                              value={value}
                              required={field.required && value !== '********'}
                              placeholder={value === '********' ? 'Password Configured' : field.placeholder}
                              onChange={(e) => handleInputChange(field.key, e.target.value)}
                              className="w-full pl-3 pr-10 py-2 text-sm border border-border rounded-md bg-surface text-text-primary"
                            />
                            <button
                              type="button"
                              onClick={() => toggleSecretVisibility(field.key)}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text-primary"
                            >
                              {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        ) : (
                          <input
                            type={field.type || 'text'}
                            value={value}
                            required={field.required}
                            placeholder={field.placeholder}
                            onChange={(e) => handleInputChange(field.key, e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface text-text-primary"
                          />
                        )}

                        {field.helpText && (
                          <span className="text-[11px] text-text-secondary">
                            {field.helpText}
                          </span>
                        )}
                      </div>
                    );
                  })}

                  <div className="flex justify-end gap-3 border-t border-border pt-4 mt-6">
                    <Button
                      type="submit"
                      disabled={saving}
                      className="bg-brand text-white hover:bg-brand/90 flex items-center gap-1"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Save Configuration
                    </Button>
                  </div>
                </form>
              </Card>
            ) : (
              <Card className="p-16 border border-dashed border-border bg-surface text-center flex flex-col items-center justify-center gap-3">
                <Settings className="w-12 h-12 text-text-muted animate-pulse" />
                <h3 className="font-bold text-text-primary text-md">
                  No Provider Selected
                </h3>
                <p className="text-xs text-text-secondary max-w-sm">
                  Select a provider card on the left panel to fetch its schema, view configuration status, and update settings.
                </p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
