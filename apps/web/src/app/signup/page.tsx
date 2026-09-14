'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    companyName: '', adminEmail: '', adminName: '', password: '', phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Signup failed');
      setSuccess(true);
      setTimeout(() => router.push('/'), 3000);
    } catch (e: any) {
      setError(e.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div style={{ background: 'white', borderRadius: 16, padding: 48, textAlign: 'center', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 12px', color: '#111827' }}>Welcome to NAVIRA!</h2>
          <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 8px' }}>Your company has been created with a 14-day free trial.</p>
          <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 40, maxWidth: 440, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 16 }}>🚀</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px', color: '#111827' }}>Get Started</h1>
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Start your 14-day free trial — no credit card required</p>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#991b1b' }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Company Name *</label>
            <input value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} required placeholder="e.g. Acme Corp" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Work Email *</label>
            <input type="email" value={form.adminEmail} onChange={e => setForm({ ...form, adminEmail: e.target.value })} required placeholder="you@company.com" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Your Name *</label>
            <input value={form.adminName} onChange={e => setForm({ ...form, adminName: e.target.value })} required placeholder="Full name" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Password *</label>
            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={8} placeholder="Minimum 8 characters" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Phone (optional)</label>
            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: loading ? '#9ca3af' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Creating...' : 'Start Free Trial'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', marginTop: 20, margin: '20px 0 0' }}>
          Already have an account? <a href="/" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>Sign in</a>
        </p>
      </div>
    </div>
  );
}
