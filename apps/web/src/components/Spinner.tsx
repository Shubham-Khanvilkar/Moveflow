export default function Spinner({ size = 24 }: { size?: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
      <div style={{
        width: size, height: size, border: '3px solid #e5e7eb',
        borderTop: '3px solid #3b82f6', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
