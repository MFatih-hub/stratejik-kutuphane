// Uygulama ikonu çizimi (ImageResponse ile PNG'ye dönüşür): koyu deniz,
// metalik disk, ufuk çizgisi ve minik bir ışık.
export function IconArt({ size }: { size: number }) {
  const disc = Math.round(size * 0.62);
  return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(180deg, #11151b 0%, #0a0c0f 60%, #07090b 100%)' }}>
      <div style={{ width: disc, height: disc, borderRadius: disc, display: 'flex', position: 'relative',
        background: 'linear-gradient(135deg, #e9ecef 0%, #9ea7af 42%, #eef1f3 55%, #6d7780 100%)' }}>
        <div style={{ position: 'absolute', left: disc * 0.08, right: disc * 0.08, top: disc * 0.6, height: Math.max(2, size * 0.012), background: '#3c454e', display: 'flex' }} />
        <div style={{ position: 'absolute', left: disc * 0.27, right: disc * 0.27, top: disc * 0.7, height: Math.max(1, size * 0.007), background: 'rgba(60,69,78,0.5)', display: 'flex' }} />
        <div style={{ position: 'absolute', left: disc * 0.62, top: disc * 0.3, width: size * 0.05, height: size * 0.05, borderRadius: size,
          background: '#fff8e6', boxShadow: `0 0 ${size * 0.04}px ${size * 0.015}px rgba(255,236,190,0.9)`, display: 'flex' }} />
      </div>
    </div>
  );
}
