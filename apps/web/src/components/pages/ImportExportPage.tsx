'use client';
import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';

import { API_URL } from '../../lib/config';

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '24px', fontFamily: 'Inter, system-ui, sans-serif', maxWidth: '1400px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  title: { fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 },
  subtitle: { fontSize: '14px', color: '#6B7280', marginTop: '4px' },
  tabs: { display: 'flex', gap: '0', marginBottom: '24px', borderBottom: '2px solid #E5E7EB' },
  tab: { padding: '10px 24px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', border: 'none', background: 'none', color: '#6B7280', borderBottom: '2px solid transparent', marginBottom: '-2px' },
  tabActive: { color: '#2563EB', borderBottomColor: '#2563EB', fontWeight: 600 },
  btn: { padding: '8px 16px', borderRadius: '6px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', border: 'none', transition: 'all 0.15s' },
  btnPrimary: { backgroundColor: '#2563EB', color: '#fff' },
  btnOutline: { backgroundColor: '#fff', color: '#374151', border: '1px solid #D1D5DB' },
  btnGreen: { backgroundColor: '#059669', color: '#fff' },
  btnSm: { padding: '4px 10px', fontSize: '12px' },
  input: { padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '14px' },
  select: { padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '14px', backgroundColor: '#fff' },
  toolbar: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' },
  uploadArea: { border: '2px dashed #D1D5DB', borderRadius: '10px', padding: '40px', textAlign: 'center', cursor: 'pointer', backgroundColor: '#F9FAFB', transition: 'all 0.15s' },
  uploadAreaActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  uploadText: { fontSize: '16px', color: '#6B7280', fontWeight: 500 },
  uploadSub: { fontSize: '13px', color: '#9CA3AF', marginTop: '4px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' as const, borderBottom: '2px solid #E5E7EB', backgroundColor: '#F9FAFB' },
  td: { padding: '10px 12px', borderBottom: '1px solid #E5E7EB', fontSize: '14px' },
  progressBar: { backgroundColor: '#E5E7EB', borderRadius: '6px', height: '8px', overflow: 'hidden', width: '200px' },
  progressFill: { height: '100%', borderRadius: '6px', backgroundColor: '#2563EB', transition: 'width 0.3s' },
  badge: { display: 'inline-block', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 },
  badgeGreen: { backgroundColor: '#D1FAE5', color: '#065F46' },
  badgeYellow: { backgroundColor: '#FEF3C7', color: '#92400E' },
  badgeRed: { backgroundColor: '#FEE2E2', color: '#991B1B' },
  badgeBlue: { backgroundColor: '#DBEAFE', color: '#1E40AF' },
  empty: { textAlign: 'center', padding: '60px 20px', color: '#9CA3AF' },
  emptyIcon: { fontSize: '48px', marginBottom: '12px' },
  emptyText: { fontSize: '16px', fontWeight: 500, color: '#6B7280' },
  emptySub: { fontSize: '14px', color: '#9CA3AF', marginTop: '4px' },
  loading: { display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px', color: '#6B7280' },
  previewTable: { marginTop: '16px', border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden' },
  section: { backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '20px', marginBottom: '20px' },
  sectionTitle: { fontSize: '16px', fontWeight: 700, color: '#111827', marginBottom: '12px' },
};

interface ImportJob {
  id: string;
  fileName: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  totalRows: number;
  successRows: number;
  failedRows: number;
  createdAt: string;
}

interface ParsedRow {
  employeeId: string;
  date: string;
  loginTime: string;
  logoutTime: string;
  status: string;
  rowNumber: number;
  weeklyOffs?: string;
  errors?: string[];
}

export default function ImportExportPage({ token }: { token: string }) {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [importJobs, setImportJobs] = useState<ImportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [processingRow, setProcessingRow] = useState<{ current: number; total: number } | null>(null);
  const [currentJob, setCurrentJob] = useState<ImportJob | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');

  // Export states
  const [exportType, setExportType] = useState<'schedules' | 'teams' | 'pickupDrops'>('schedules');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0]; });
  const [siteFilter, setSiteFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [sites, setSites] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { fetchJobs(); fetchFilters(); }, [token]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/schedule-import-export/import/jobs`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setImportJobs(data.data || []); }
    } catch { /* ignored */ }
    setLoading(false);
  };

  const fetchFilters = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/sites`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setSites(data.data || []); }
    } catch { /* ignored */ }
    try {
      const res = await fetch(`${API_URL}/api/employee-teams`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setTeams(data.data || []); }
    } catch { /* ignored */ }
  };

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setError('');
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();

    if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
        const rows: ParsedRow[] = jsonData.map((obj, i) => {
          const get = (key: string) => {
            const match = Object.keys(obj).find(k => k.toLowerCase().replace(/\s+/g, '') === key);
            return match ? String(obj[match]).trim() : '';
          };
          return {
            rowNumber: i + 2,
            employeeId: get('employeeid'),
            date: get('date'),
            loginTime: get('logintime'),
            logoutTime: get('logouttime'),
            status: get('status') || 'SCHEDULED',
            weeklyOffs: get('weeklyoffs'),
          };
        });
        setParsedRows(rows);
      };
      reader.readAsArrayBuffer(selectedFile);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(l => l.trim());
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const rows: ParsedRow[] = lines.slice(1).map((line, i) => {
          const values = line.split(',').map(v => v.trim());
          return {
            rowNumber: i + 2,
            employeeId: values[headers.indexOf('employeeid')] || values[0] || '',
            date: values[headers.indexOf('date')] || values[1] || '',
            loginTime: values[headers.indexOf('logintime')] || values[2] || '',
            logoutTime: values[headers.indexOf('logouttime')] || values[3] || '',
            status: values[headers.indexOf('status')] || values[4] || 'SCHEDULED',
            weeklyOffs: values[headers.indexOf('weeklyoffs')] || '',
          };
        });
        setParsedRows(rows);
      };
      reader.readAsText(selectedFile);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
  };

  const startImport = async () => {
    if (!parsedRows.length) return;
    setImporting(true); setImportProgress(0); setError('');
    setProcessingRow({ current: 0, total: parsedRows.length });
    try {
      for (let i = 0; i < parsedRows.length; i++) {
        setProcessingRow({ current: i + 1, total: parsedRows.length });
        setImportProgress(Math.round(((i + 1) / parsedRows.length) * 100));
        if (i % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      const res = await fetch(`${API_URL}/api/schedule-import-export/import`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rows: parsedRows, fileName: file?.name || 'manual' }),
      });
      if (res.ok) {
        const data = await res.json();
        const jobId = data.data?.jobId;
        if (jobId) {
          setCurrentJob(data.data);
          setImportProgress(100);
          const pollRes = await fetch(`${API_URL}/api/schedule-import-export/import/jobs/${jobId}/rows`, { headers: { Authorization: `Bearer ${token}` } });
          if (pollRes.ok) { setImportProgress(100); }
        }
        setParsedRows([]); setFile(null); fetchJobs();
      } else {
        const e = await res.json(); setError(e.message || 'Import failed');
      }
    } catch { setError('Import failed'); }
    setImporting(false);
    setProcessingRow(null);
  };

  const handleExport = async () => {
    setExporting(true); setError('');
    try {
      let url = '';
      const params = new URLSearchParams();
      if (exportType === 'schedules') {
        params.set('startDate', startDate); params.set('endDate', endDate);
        if (siteFilter) params.set('siteId', siteFilter);
        if (teamFilter) params.set('teamId', teamFilter);
        url = `${API_URL}/api/schedule-import-export/export/schedules?${params}`;
      } else if (exportType === 'teams') {
        if (siteFilter) params.set('siteId', siteFilter);
        url = `${API_URL}/api/schedule-import-export/export/teams?${params}`;
      } else {
        params.set('startDate', startDate); params.set('endDate', endDate);
        url = `${API_URL}/api/schedule-import-export/export/pickup-drops?${params}`;
      }
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const blob = await res.blob();
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = `${exportType}-export-${new Date().toISOString().split('T')[0]}.csv`;
        a.click(); URL.revokeObjectURL(a.href);
      } else { setError('Export failed'); }
    } catch { setError('Export failed'); }
    setExporting(false);
  };

  const downloadTemplate = () => {
    const headers = ['Employee ID', 'Date', 'Login Time', 'Logout Time', 'Status', 'Weekly Offs'];
    const csvContent = headers.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'schedule-import-template.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handlePrint = () => {
    if (!parsedRows.length) return;
    const headers = ['Row', 'Employee ID', 'Date', 'Login', 'Logout', 'Status', 'Weekly Offs', 'Errors'];
    const csvLines = [headers.join(',')];
    for (const row of parsedRows) {
      csvLines.push([
        row.rowNumber,
        row.employeeId,
        row.date,
        row.loginTime,
        row.logoutTime,
        row.status,
        row.weeklyOffs || '',
        (row.errors || []).join('; '),
      ].join(','));
    }
    const csvContent = csvLines.join('\n');
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html><head><title>Import Preview</title>
        <style>body{font-family:sans-serif;padding:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5;font-weight:600}.error{color:#dc2626}</style>
        </head><body>
        <h2>Import Preview</h2>
        <p>Total rows: ${parsedRows.length}</p>
        <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>
        ${parsedRows.map(row => `<tr>
          <td>${row.rowNumber}</td><td>${row.employeeId}</td><td>${row.date}</td>
          <td>${row.loginTime}</td><td>${row.logoutTime}</td><td>${row.status}</td>
          <td>${row.weeklyOffs || ''}</td>
          <td class="error">${(row.errors || []).join('; ')}</td>
        </tr>`).join('')}
        </tbody></table>
        <script>window.onload=function(){window.print()}</script>
        </body></html>
      `);
      printWindow.document.close();
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, React.CSSProperties> = { PENDING: styles.badgeYellow, PROCESSING: styles.badgeBlue, COMPLETED: styles.badgeGreen, FAILED: styles.badgeRed };
    return <span style={{ ...styles.badge, ...map[status] || styles.badgeYellow }}>{status}</span>;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Import / Export</h1>
          <p style={styles.subtitle}>Bulk import and export schedules, teams, and pickup/drops</p>
        </div>
      </div>

      <div style={styles.tabs}>
        <button style={{ ...styles.tab, ...(activeTab === 'import' ? styles.tabActive : {}) }} onClick={() => setActiveTab('import')}>Import</button>
        <button style={{ ...styles.tab, ...(activeTab === 'export' ? styles.tabActive : {}) }} onClick={() => setActiveTab('export')}>Export</button>
      </div>

      {activeTab === 'import' ? (
        <>
          <div style={styles.section}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={styles.sectionTitle}>Upload File</div>
              <button style={{ ...styles.btn, ...styles.btnOutline }} onClick={downloadTemplate}>Download Template</button>
            </div>
            <div
              style={{ ...styles.uploadArea, ...(dragActive ? styles.uploadAreaActive : {}) }}
              onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
              <div style={styles.uploadText}>{file ? file.name : 'Drop CSV/XLSX file here or click to browse'}</div>
              <div style={styles.uploadSub}>Supported formats: .csv, .xlsx, .xls with headers (employeeId, date, loginTime, logoutTime, status)</div>
            </div>
          </div>

          {parsedRows.length > 0 && (
            <div style={styles.section}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={styles.sectionTitle}>Preview ({parsedRows.length} rows)</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={{ ...styles.btn, ...styles.btnOutline }} onClick={handlePrint} disabled={importing}>Print</button>
                  <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={startImport} disabled={importing}>{importing ? 'Importing...' : 'Start Import'}</button>
                </div>
              </div>
              {importing && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={styles.progressBar}><div style={{ ...styles.progressFill, width: `${importProgress}%` }} /></div>
                  <span style={{ fontSize: '13px', color: '#6B7280' }}>
                    {processingRow ? `Processing row ${processingRow.current} of ${processingRow.total}...` : `${importProgress}%`}
                  </span>
                </div>
              )}
              {error && <div style={{ ...styles.badge, ...styles.badgeRed, display: 'block', padding: '8px', marginBottom: '12px' }}>{error}</div>}
              <div style={styles.previewTable}>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Row</th>
                        <th style={styles.th}>Employee ID</th>
                        <th style={styles.th}>Date</th>
                        <th style={styles.th}>Login</th>
                        <th style={styles.th}>Logout</th>
                        <th style={styles.th}>Status</th>
                        <th style={styles.th}>Errors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.slice(0, 50).map(row => (
                        <tr key={row.rowNumber} style={row.errors?.length ? { backgroundColor: '#FEF2F2' } : undefined}>
                          <td style={styles.td}>{row.rowNumber}</td>
                          <td style={styles.td}>{row.employeeId}</td>
                          <td style={styles.td}>{row.date}</td>
                          <td style={styles.td}>{row.loginTime}</td>
                          <td style={styles.td}>{row.logoutTime}</td>
                          <td style={styles.td}>{row.status}</td>
                          <td style={{ ...styles.td, color: '#DC2626', fontSize: '12px' }}>
                            {row.errors?.length ? row.errors.join('; ') : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedRows.length > 50 && <div style={{ padding: '8px', fontSize: '13px', color: '#6B7280', textAlign: 'center' }}>Showing 50 of {parsedRows.length} rows</div>}
              </div>
            </div>
          )}

          {currentJob && (
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Import Job Status</div>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', color: '#6B7280' }}>Job ID</div>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>{currentJob.id}</div>
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: '#6B7280' }}>Status</div>
                  {statusBadge(currentJob.status)}
                </div>
                <div>
                  <div style={{ fontSize: '13px', color: '#6B7280' }}>Progress</div>
                  <div style={{ fontSize: '14px' }}>{currentJob.successRows} / {currentJob.totalRows} rows</div>
                </div>
              </div>
            </div>
          )}

          <div style={styles.section}>
            <div style={styles.sectionTitle}>Import Job History</div>
            {loading ? (
              <div style={styles.loading}>Loading...</div>
            ) : importJobs.length === 0 ? (
              <div style={{ ...styles.empty, padding: '30px' }}>
                <div style={styles.emptyText}>No import jobs yet</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>File</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Total</th>
                      <th style={styles.th}>Success</th>
                      <th style={styles.th}>Failed</th>
                      <th style={styles.th}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importJobs.map(job => (
                      <tr key={job.id}>
                        <td style={styles.td}>{job.fileName}</td>
                        <td style={styles.td}>{statusBadge(job.status)}</td>
                        <td style={styles.td}>{job.totalRows}</td>
                        <td style={styles.td}><span style={{ ...styles.badge, ...styles.badgeGreen }}>{job.successRows}</span></td>
                        <td style={styles.td}>{job.failedRows > 0 ? <span style={{ ...styles.badge, ...styles.badgeRed }}>{job.failedRows}</span> : '—'}</td>
                        <td style={styles.td}>{new Date(job.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div style={styles.toolbar}>
            <select style={styles.select} value={exportType} onChange={e => setExportType(e.target.value as any)}>
              <option value="schedules">Schedule Export</option>
              <option value="teams">Team Export</option>
              <option value="pickupDrops">Pickup/Drop Export</option>
            </select>
          </div>

          {exportType !== 'teams' && (
            <div style={styles.toolbar}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151', marginRight: '8px' }}>From</label>
                <input style={styles.input} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: '#374151', marginRight: '8px' }}>To</label>
                <input style={styles.input} type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>
          )}

          {(exportType === 'schedules' || exportType === 'teams') && (
            <div style={styles.toolbar}>
              <select style={styles.select} value={siteFilter} onChange={e => setSiteFilter(e.target.value)}>
                <option value="">All Sites</option>
                {sites.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {exportType === 'schedules' && (
                <select style={styles.select} value={teamFilter} onChange={e => setTeamFilter(e.target.value)}>
                  <option value="">All Teams</option>
                  {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              )}
            </div>
          )}

          {error && <div style={{ ...styles.badge, ...styles.badgeRed, display: 'block', padding: '8px', marginBottom: '12px', width: 'fit-content' }}>{error}</div>}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={{ ...styles.btn, ...styles.btnGreen }} onClick={handleExport} disabled={exporting}>
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>

          <div style={{ ...styles.section, marginTop: '20px' }}>
            <div style={styles.sectionTitle}>Export Summary</div>
            <div style={{ fontSize: '14px', color: '#374151', lineHeight: 1.8 }}>
              <div><strong>Type:</strong> {exportType === 'schedules' ? 'Employee Schedules' : exportType === 'teams' ? 'Teams & Members' : 'Pickup/Drop Entries'}</div>
              {exportType !== 'teams' && <div><strong>Date Range:</strong> {startDate} to {endDate}</div>}
              <div><strong>Site:</strong> {siteFilter ? sites.find((s: any) => s.id === siteFilter)?.name || siteFilter : 'All'}</div>
              {exportType === 'schedules' && <div><strong>Team:</strong> {teamFilter ? teams.find((t: any) => t.id === teamFilter)?.name || teamFilter : 'All'}</div>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
