'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../hooks/useApi';

interface CompanyData {
  name: string;
  legalName: string;
  code: string;
  gstin: string;
  pan: string;
  billingModel: string;
  billingCycle: string;
  contactEmail: string;
  contactPhone: string;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  country: string;
  city: string;
  timezone: string;
  currency: string;
}

interface SiteData {
  siteCode: string;
  siteName: string;
  address: string;
  city: string;
  state: string;
  latitude: number | '';
  longitude: number | '';
  geofenceRadius: number;
  timezone: string;
}

interface ProcessData {
  processCode: string;
  processName: string;
  description: string;
}

interface AdminData {
  email: string;
  name: string;
  phone: string;
  employeeId: string;
  password: string;
  gender: string;
}

const STEPS = ['Company Info', 'Sites', 'Processes', 'Admin Account'];

export default function CompanyOnboardingWizard() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [companyId, setCompanyId] = useState('');

  const [company, setCompany] = useState<CompanyData>({
    name: '', legalName: '', code: '', gstin: '', pan: '',
    billingModel: 'COMPANY', billingCycle: 'MONTHLY',
    contactEmail: '', contactPhone: '',
    primaryContactName: '', primaryContactEmail: '', primaryContactPhone: '',
    country: 'India', city: '', timezone: 'Asia/Kolkata', currency: 'INR',
  });

  const [sites, setSites] = useState<SiteData[]>([
    { siteCode: '', siteName: '', address: '', city: '', state: '', latitude: '', longitude: '', geofenceRadius: 500, timezone: 'Asia/Kolkata' },
  ]);

  const [processes, setProcesses] = useState<ProcessData[]>([
    { processCode: '', processName: '', description: '' },
  ]);

  const [admin, setAdmin] = useState<AdminData>({
    email: '', name: '', phone: '', employeeId: '', password: 'Temp@123', gender: '',
  });

  const handleCompanyChange = (field: keyof CompanyData, value: string) => {
    setCompany(prev => ({ ...prev, [field]: value }));
  };

  const handleSiteChange = (index: number, field: keyof SiteData, value: string | number) => {
    setSites(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const addSite = () => {
    setSites(prev => [...prev, { siteCode: '', siteName: '', address: '', city: '', state: '', latitude: '', longitude: '', geofenceRadius: 500, timezone: 'Asia/Kolkata' }]);
  };

  const removeSite = (index: number) => {
    if (sites.length > 1) setSites(prev => prev.filter((_, i) => i !== index));
  };

  const handleProcessChange = (index: number, field: keyof ProcessData, value: string) => {
    setProcesses(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const addProcess = () => {
    setProcesses(prev => [...prev, { processCode: '', processName: '', description: '' }]);
  };

  const removeProcess = (index: number) => {
    if (processes.length > 1) setProcesses(prev => prev.filter((_, i) => i !== index));
  };

  const handleAdminChange = (field: keyof AdminData, value: string) => {
    setAdmin(prev => ({ ...prev, [field]: value }));
  };

  const submitCompany = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/platform/companies', {
        method: 'POST',
        body: JSON.stringify(company),
      });
      if (res.success) {
        setCompanyId(res.data.id);
        setSuccess('Company created');
        setStep(1);
      } else {
        setError(res.message || 'Failed to create company');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitSites = async () => {
    setLoading(true);
    setError('');
    try {
      for (const site of sites) {
        if (!site.siteCode || !site.siteName) continue;
        await apiFetch('/platform/sites', {
          method: 'POST',
          body: JSON.stringify({ ...site, companyId }),
        });
      }
      setSuccess('Sites created');
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitProcesses = async () => {
    setLoading(true);
    setError('');
    try {
      for (const proc of processes) {
        if (!proc.processCode || !proc.processName) continue;
        await apiFetch('/platform/processes', {
          method: 'POST',
          body: JSON.stringify({ ...proc, companyId }),
        });
      }
      setSuccess('Processes created');
      setStep(3);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitAdmin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/platform/employees/onboard', {
        method: 'POST',
        body: JSON.stringify({ ...admin, companyId }),
      });
      if (res.success) {
        setSuccess('Admin account created! Company onboarding complete.');
        setStep(4);
      } else {
        setError(res.message || 'Failed to create admin');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (label: string, value: string, onChange: (v: string) => void, opts?: { type?: string; required?: boolean; placeholder?: string }) => (
    <div className="mb-3">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label} {opts?.required && <span className="text-red-500">*</span>}</label>
      <input
        type={opts?.type || 'text'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={opts?.placeholder || ''}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
      />
    </div>
  );

  const renderSelect = (label: string, value: string, onChange: (v: string) => void, options: { value: string; label: string }[]) => (
    <div className="mb-3">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Company Onboarding Wizard</h1>
      <p className="text-gray-600 mb-6">Set up a new company with sites, processes, and admin account</p>

      {/* Progress Bar */}
      <div className="flex items-center mb-8">
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                i < step ? 'bg-green-500 text-white' :
                i === step ? 'bg-blue-600 text-white' :
                'bg-gray-200 text-gray-600'
              }`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`ml-2 text-sm ${i === step ? 'font-medium text-blue-600' : 'text-gray-500'}`}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-4 ${i < step ? 'bg-green-500' : 'bg-gray-200'}`} />}
          </React.Fragment>
        ))}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">{success}</div>}

      {/* Step 0: Company Info */}
      {step === 0 && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Company Information</h2>
          <div className="grid grid-cols-2 gap-4">
            {renderInput('Company Name', company.name, v => handleCompanyChange('name', v), { required: true })}
            {renderInput('Legal Name', company.legalName, v => handleCompanyChange('legalName', v))}
            {renderInput('Company Code', company.code, v => handleCompanyChange('code', v), { required: true })}
            {renderInput('GSTIN', company.gstin, v => handleCompanyChange('gstin', v))}
            {renderInput('PAN', company.pan, v => handleCompanyChange('pan', v))}
            {renderSelect('Billing Model', company.billingModel, v => handleCompanyChange('billingModel', v), [
              { value: 'COMPANY', label: 'Company Level' },
              { value: 'SITE', label: 'Site Level' },
              { value: 'PROCESS', label: 'Process Level' },
            ])}
            {renderSelect('Billing Cycle', company.billingCycle, v => handleCompanyChange('billingCycle', v), [
              { value: 'MONTHLY', label: 'Monthly' },
              { value: 'QUARTERLY', label: 'Quarterly' },
            ])}
            {renderInput('Contact Email', company.contactEmail, v => handleCompanyChange('contactEmail', v), { type: 'email' })}
            {renderInput('Contact Phone', company.contactPhone, v => handleCompanyChange('contactPhone', v), { type: 'tel' })}
            {renderInput('Primary Contact Name', company.primaryContactName, v => handleCompanyChange('primaryContactName', v))}
            {renderInput('Primary Contact Email', company.primaryContactEmail, v => handleCompanyChange('primaryContactEmail', v), { type: 'email' })}
            {renderInput('Primary Contact Phone', company.primaryContactPhone, v => handleCompanyChange('primaryContactPhone', v), { type: 'tel' })}
            {renderInput('City', company.city, v => handleCompanyChange('city', v))}
            {renderSelect('Country', company.country, v => handleCompanyChange('country', v), [
              { value: 'India', label: 'India' },
              { value: 'UAE', label: 'UAE' },
              { value: 'USA', label: 'USA' },
            ])}
            {renderSelect('Timezone', company.timezone, v => handleCompanyChange('timezone', v), [
              { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
              { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
              { value: 'America/New_York', label: 'America/New_York (EST)' },
            ])}
            {renderSelect('Currency', company.currency, v => handleCompanyChange('currency', v), [
              { value: 'INR', label: 'INR (₹)' },
              { value: 'AED', label: 'AED (د.إ)' },
              { value: 'USD', label: 'USD ($)' },
            ])}
          </div>
          <div className="flex justify-end mt-6">
            <button
              onClick={submitCompany}
              disabled={loading || !company.name || !company.code}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Company & Continue'}
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Sites */}
      {step === 1 && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Add Sites</h2>
          {sites.map((site, i) => (
            <div key={i} className="border rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium">Site {i + 1}</h3>
                {sites.length > 1 && (
                  <button onClick={() => removeSite(i)} className="text-red-500 text-sm hover:underline">Remove</button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {renderInput('Site Code', site.siteCode, v => handleSiteChange(i, 'siteCode', v), { required: true })}
                {renderInput('Site Name', site.siteName, v => handleSiteChange(i, 'siteName', v), { required: true })}
                {renderInput('Address', site.address, v => handleSiteChange(i, 'address', v))}
                {renderInput('City', site.city, v => handleSiteChange(i, 'city', v))}
                {renderInput('State', site.state, v => handleSiteChange(i, 'state', v))}
                {renderInput('Latitude', String(site.latitude), v => handleSiteChange(i, 'latitude', v || ''))}
                {renderInput('Longitude', String(site.longitude), v => handleSiteChange(i, 'longitude', v || ''))}
                {renderInput('Geofence Radius (m)', String(site.geofenceRadius), v => handleSiteChange(i, 'geofenceRadius', parseInt(v) || 500))}
              </div>
            </div>
          ))}
          <button onClick={addSite} className="text-blue-600 text-sm hover:underline mb-4">+ Add another site</button>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => setStep(0)} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">Back</button>
            <button
              onClick={submitSites}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Sites & Continue'}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Processes */}
      {step === 2 && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Add Processes</h2>
          {processes.map((proc, i) => (
            <div key={i} className="border rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium">Process {i + 1}</h3>
                {processes.length > 1 && (
                  <button onClick={() => removeProcess(i)} className="text-red-500 text-sm hover:underline">Remove</button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {renderInput('Process Code', proc.processCode, v => handleProcessChange(i, 'processCode', v), { required: true })}
                {renderInput('Process Name', proc.processName, v => handleProcessChange(i, 'processName', v), { required: true })}
                {renderInput('Description', proc.description, v => handleProcessChange(i, 'description', v))}
              </div>
            </div>
          ))}
          <button onClick={addProcess} className="text-blue-600 text-sm hover:underline mb-4">+ Add another process</button>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => setStep(1)} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">Back</button>
            <button
              onClick={submitProcesses}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Processes & Continue'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Admin Account */}
      {step === 3 && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Create Admin Account</h2>
          <div className="grid grid-cols-2 gap-4 max-w-xl">
            {renderInput('Email', admin.email, v => handleAdminChange('email', v), { required: true, type: 'email' })}
            {renderInput('Name', admin.name, v => handleAdminChange('name', v), { required: true })}
            {renderInput('Phone', admin.phone, v => handleAdminChange('phone', v), { type: 'tel' })}
            {renderInput('Employee ID', admin.employeeId, v => handleAdminChange('employeeId', v), { required: true })}
            {renderInput('Password', admin.password, v => handleAdminChange('password', v), { type: 'password' })}
            {renderSelect('Gender', admin.gender, v => handleAdminChange('gender', v), [
              { value: '', label: 'Select' },
              { value: 'MALE', label: 'Male' },
              { value: 'FEMALE', label: 'Female' },
              { value: 'OTHER', label: 'Other' },
            ])}
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setStep(2)} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">Back</button>
            <button
              onClick={submitAdmin}
              disabled={loading || !admin.email || !admin.name || !admin.employeeId}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Admin & Complete'}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Complete */}
      {step === 4 && (
        <div className="bg-white rounded-lg border p-8 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Company Onboarding Complete!</h2>
          <p className="text-gray-600 mb-6">
            <strong>{company.name}</strong> has been set up with {sites.length} site(s), {processes.length} process(es), and an admin account.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 text-left max-w-md mx-auto mb-6">
            <p className="text-sm text-gray-600"><strong>Company Code:</strong> {company.code}</p>
            <p className="text-sm text-gray-600"><strong>Admin Email:</strong> {admin.email}</p>
            <p className="text-sm text-gray-600"><strong>Default Password:</strong> {admin.password}</p>
          </div>
          <button
            onClick={() => { setStep(0); setCompanyId(''); setSuccess(''); }}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Onboard Another Company
          </button>
        </div>
      )}
    </div>
  );
}
