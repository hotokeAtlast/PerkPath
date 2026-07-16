import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket, MapPin, Zap, X, Globe, Volume2, Timer, CheckCircle, ChevronDown, Settings } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

const LANG_OPTIONS = [
  { value: 'English', label: 'English', flag: '🇬🇧' },
  { value: 'Spanish', label: 'Español', flag: '🇪🇸' },
  { value: 'French', label: 'Français', flag: '🇫🇷' },
  { value: 'German', label: 'Deutsch', flag: '🇩🇪' },
  { value: 'Japanese', label: '日本語', flag: '🇯🇵' },
  { value: 'Portuguese', label: 'Português', flag: '🇧🇷' },
  { value: 'Arabic', label: 'العربية', flag: '🇸🇦' },
];

const RTL_LANGUAGES = ['Arabic'];

const translations = {
  English: {
    welcome: 'Welcome', matchDay: 'Match Day: Final', navTarget: 'Your Gate', walking: 'Walking towards',
    exclusive: 'PerkPath Exclusive', accept: 'Accept & Reroute', dismiss: 'Dismiss', audio: 'Listen',
    qrAlt: 'Scan to Redeem', expires: 'Expires', gate: 'Gate', offerFor: 'Offer for', rerouteTo: 'Reroute to',
    seat: 'Block 112, Row 4', capacity: 'capacity', generating: 'Generating...', requestOffer: 'Request VIP Reroute Offer',
    ops: 'Ops',
    zones: { North: 'North', East: 'East', South: 'South', West: 'West' },
    types: { 'Public Entry': 'Public Entry', 'VIP Entry': 'VIP Entry', 'Transit Hub': 'Transit Hub', Accessible: 'Accessible', 'Parking Entry': 'Parking Entry', Premium: 'Premium', 'Media/VIP': 'Media/VIP', General: 'General' },
  },
  Spanish: {
    welcome: 'Bienvenido', matchDay: 'Día de Partido: Final', navTarget: 'Tu Puerta', walking: 'Caminando hacia',
    exclusive: 'Exclusivo PerkPath', accept: 'Aceptar y Redirigir', dismiss: 'Descartar', audio: 'Escuchar',
    qrAlt: 'Escanear para canjear', expires: 'Expira', gate: 'Puerta', offerFor: 'Oferta para', rerouteTo: 'Redirigir a',
    seat: 'Bloque 112, Fila 4', capacity: 'capacidad', generating: 'Generando...', requestOffer: 'Solicitar Oferta VIP',
    ops: 'Ops',
    zones: { North: 'Norte', East: 'Este', South: 'Sur', West: 'Oeste' },
    types: { 'Public Entry': 'Entrada Pública', 'VIP Entry': 'Entrada VIP', 'Transit Hub': 'Hub de Tránsito', Accessible: 'Accesible', 'Parking Entry': 'Entrada de Estacionamiento', Premium: 'Premium', 'Media/VIP': 'Medios/VIP', General: 'General' },
  },
  French: {
    welcome: 'Bienvenue', matchDay: 'Jour de Match: Finale', navTarget: 'Votre Porte', walking: 'En marchant vers',
    exclusive: 'Exclusivité PerkPath', accept: 'Accepter et Rediriger', dismiss: 'Ignorer', audio: 'Écouter',
    qrAlt: 'Scanner pour échanger', expires: 'Expire', gate: 'Porte', offerFor: 'Offre pour', rerouteTo: 'Rediriger vers',
    seat: 'Bloc 112, Rang 4', capacity: 'capacité', generating: 'Génération...', requestOffer: 'Demander une Offre VIP',
    ops: 'Ops',
    zones: { North: 'Nord', East: 'Est', South: 'Sud', West: 'Ouest' },
    types: { 'Public Entry': 'Entrée Publique', 'VIP Entry': 'Entrée VIP', 'Transit Hub': 'Hub de Transit', Accessible: 'Accessible', 'Parking Entry': 'Entrée Parking', Premium: 'Premium', 'Media/VIP': 'Médias/VIP', General: 'Général' },
  },
  German: {
    welcome: 'Willkommen', matchDay: 'Spieltag: Finale', navTarget: 'Ihr Tor', walking: 'Gehend zum',
    exclusive: 'PerkPath Exklusiv', accept: 'Annehmen & Umleiten', dismiss: 'Abbrechen', audio: 'Anhören',
    qrAlt: 'Scannen zum Einlösen', expires: 'Läuft ab', gate: 'Tor', offerFor: 'Angebot für', rerouteTo: 'Umleiten zu',
    seat: 'Block 112, Reihe 4', capacity: 'Kapazität', generating: 'Generierung...', requestOffer: 'VIP-Angebot anfordern',
    ops: 'Ops',
    zones: { North: 'Norden', East: 'Osten', South: 'Süden', West: 'Westen' },
    types: { 'Public Entry': 'Öffentlicher Eingang', 'VIP Entry': 'VIP-Eingang', 'Transit Hub': 'Transit-Hub', Accessible: 'Barrierefrei', 'Parking Entry': 'Parkplatz-Eingang', Premium: 'Premium', 'Media/VIP': 'Medien/VIP', General: 'Allgemein' },
  },
  Japanese: {
    welcome: 'ようこそ', matchDay: '試合当日: 決勝', navTarget: 'あなたのゲート', walking: 'に向かって歩行中',
    exclusive: 'PerkPath限定', accept: '受け取ってルート変更', dismiss: '閉じる', audio: '再生',
    qrAlt: '引換用スキャン', expires: '期限', gate: 'ゲート', offerFor: 'オファー対象', rerouteTo: '経路変更先',
    seat: 'ブロック112、4列', capacity: '収容', generating: '生成中...', requestOffer: 'VIPルートオファーをリクエスト',
    ops: ' Ops',
    zones: { North: '北', East: '東', South: '南', West: '西' },
    types: { 'Public Entry': '一般入口', 'VIP Entry': 'VIP入口', 'Transit Hub': '交通ハブ', Accessible: 'バリアフリー', 'Parking Entry': '駐車場入口', Premium: 'プレミアム', 'Media/VIP': 'メディア/VIP', General: '一般' },
  },
  Portuguese: {
    welcome: 'Bem-vindo', matchDay: 'Dia do Jogo: Final', navTarget: 'Seu Portão', walking: 'Caminhando para',
    exclusive: 'Exclusivo PerkPath', accept: 'Aceitar e Redirecionar', dismiss: 'Dispensar', audio: 'Ouvir',
    qrAlt: 'Escanear para resgatar', expires: 'Expira', gate: 'Portão', offerFor: 'Oferta para', rerouteTo: 'Redirecionar para',
    seat: 'Bloco 112, Fileira 4', capacity: 'capacidade', generating: 'Gerando...', requestOffer: 'Solicitar Oferta VIP',
    ops: 'Ops',
    zones: { North: 'Norte', East: 'Leste', South: 'Sul', West: 'Oeste' },
    types: { 'Public Entry': 'Entrada Pública', 'VIP Entry': 'Entrada VIP', 'Transit Hub': 'Hub de Trânsito', Accessible: 'Acessível', 'Parking Entry': 'Entrada de Estacionamento', Premium: 'Premium', 'Media/VIP': 'Mídia/VIP', General: 'Geral' },
  },
  Arabic: {
    welcome: 'أهلاً بك', matchDay: 'يوم المباراة: النهائي', navTarget: 'بوابتك', walking: 'يسير نحو',
    exclusive: 'حصري PerkPath', accept: 'قبول وإعادة توجيه', dismiss: 'تجاهل', audio: 'استماع',
    qrAlt: 'امسح للاستبدال', expires: 'ينتهي', gate: 'بوابة', offerFor: 'عرض لـ', rerouteTo: 'إعادة توجيه إلى',
    seat: 'بلوك 112، صف 4', capacity: 'السعة', generating: 'جاري التوليد...', requestOffer: 'طلب عرض VIP',
    ops: 'إدارة',
    zones: { North: 'شمال', East: 'شرق', South: 'جنوب', West: 'غرب' },
    types: { 'Public Entry': 'مدخل عام', 'VIP Entry': 'مدخل كبار الشخصيات', 'Transit Hub': 'مركز النقل', Accessible: 'متاح للجميع', 'Parking Entry': 'مدخل السيارات', Premium: 'مميز', 'Media/VIP': 'إعلام/كبار الشخصيات', General: 'عام' },
  },
};

function QRCodeCanvas({ data, size = 100 }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = size;
    canvas.height = size;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#ccff00';

    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash) + data.charCodeAt(i);
      hash |= 0;
    }

    const modules = 21;
    const ms = size / modules;
    const rng = (seed) => { let x = Math.sin(seed) * 10000; return x - Math.floor(x); };

    const drawFinder = (cx, cy) => {
      [7, 5, 3].forEach((s, i) => {
        ctx.fillStyle = i % 2 === 0 ? '#ccff00' : '#000';
        ctx.fillRect((cx - s / 2) * ms, (cy - s / 2) * ms, s * ms, s * ms);
      });
    };
    drawFinder(4, 4);
    drawFinder(modules - 4, 4);
    drawFinder(4, modules - 4);

    for (let y = 0; y < modules; y++) {
      for (let x = 0; x < modules; x++) {
        if ((x < 9 && y < 9) || (x > modules - 9 && y < 9) || (x < 9 && y > modules - 9) || x === 6 || y === 6) continue;
        if (rng(hash + x * 31 + y * 17) > 0.5) {
          ctx.fillRect(x * ms, y * ms, ms, ms);
        }
      }
    }

    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ccff00';
    ctx.font = `bold ${size / 7}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PP', size / 2, size / 2 + 1);
  }, [data, size]);

  return <canvas ref={canvasRef} width={size} height={size} style={{ borderRadius: '8px', border: '2px solid #333' }} />;
}

export default function FanPage() {
  const { gates, targetGate, offer, offerMeta, fanLanguage, setFanLanguage, fanId, triggerAI, handleAcceptOffer, dismissOffer, isGenerating, errorMsg, setErrorMsg } = useApp();
  const navigate = useNavigate();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef(null);

  const isRTL = RTL_LANGUAGES.includes(fanLanguage);
  const t = translations[fanLanguage];
  const currentLang = LANG_OPTIONS.find(l => l.value === fanLanguage) || LANG_OPTIONS[0];
  const targetData = gates[targetGate];

  useEffect(() => {
    const handleClickOutside = (e) => { if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const speakOffer = useCallback(() => {
    if (!offer) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(offer);
    utterance.lang = fanLanguage === 'English' ? 'en-US' : fanLanguage === 'Spanish' ? 'es-ES' : fanLanguage === 'French' ? 'fr-FR' : fanLanguage === 'German' ? 'de-DE' : fanLanguage === 'Japanese' ? 'ja-JP' : fanLanguage === 'Portuguese' ? 'pt-BR' : 'ar-SA';
    utterance.rate = 0.95;
    speechSynthesis.speak(utterance);
  }, [offer, fanLanguage]);

  const qrData = offerMeta ? `https://perkpath.fifa2026.com/redeem?f=${targetGate}&t=${offerMeta.optimalGate}&p=${encodeURIComponent(offerMeta.optimalPerk)}` : null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-color)', direction: isRTL ? 'rtl' : 'ltr' }}>
      {errorMsg && (
        <div role="alert" aria-live="assertive" style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', background: 'var(--danger)', color: 'white', padding: '10px 20px', borderRadius: '8px', zIndex: 9999, fontSize: '13px' }}>
          {errorMsg}
          <button onClick={() => setErrorMsg('')} style={{ background: 'none', border: 'none', color: 'white', marginLeft: '12px', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* Header */}
      <header role="banner" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--surface-border)' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '700' }}>
            <span style={{ color: 'var(--primary-accent)' }}>Perk</span>Path
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{fanId}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div ref={langRef} style={{ position: 'relative' }}>
            <button onClick={() => setLangOpen(!langOpen)} aria-label="Select language" aria-expanded={langOpen} aria-haspopup="listbox" style={{
              display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)',
              padding: '6px 12px', borderRadius: '20px', border: 'none', color: 'white', fontSize: '12px',
              cursor: 'pointer', fontFamily: 'inherit'
            }}>
              <Globe size={14} color="var(--primary-accent)" />
              <span>{currentLang.flag} {currentLang.label}</span>
              <ChevronDown size={12} style={{ transform: langOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
            {langOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 100,
                background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '12px', padding: '6px', minWidth: '160px', boxShadow: '0 12px 40px rgba(0,0,0,0.6)'
              }}>
                {LANG_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => { setFanLanguage(opt.value); setLangOpen(false); }} style={{
                    display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px',
                    border: 'none', borderRadius: '8px',
                    background: fanLanguage === opt.value ? 'rgba(204,255,0,0.15)' : 'transparent',
                    color: fanLanguage === opt.value ? 'var(--primary-accent)' : 'white',
                    fontSize: '13px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit'
                  }}>
                    <span>{opt.flag}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => navigate('/')} style={{
            display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(138,43,226,0.15)',
            padding: '6px 12px', borderRadius: '20px', border: 'none', color: 'var(--secondary-accent)',
            fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit'
          }}>
            <Settings size={14} />
            {t.ops}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" role="main" aria-label="Fan dashboard" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: '24px', maxWidth: '480px', margin: '0 auto', width: '100%' }}>
        {/* Ticket Card */}
        <div className="glass-panel" style={{ width: '100%', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <Ticket color="var(--primary-accent)" size={20} />
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t.seat}</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{t.navTarget}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={18} color="var(--primary-accent)" />
            <span style={{ fontSize: '20px', fontWeight: '700' }}>{targetData?.name || targetGate}</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {t.zones[targetData?.zone] || targetData?.zone} · {t.types[targetData?.type] || targetData?.type} · {targetData?.congestion}% {t.capacity}
          </div>
        </div>

        {/* Status Bar */}
        <div style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {Object.entries(gates).slice(0, 4).map(([id, g]) => (
            <div key={id} className="glass-panel" style={{ padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{g.name}</div>
              <div style={{
                fontSize: '18px', fontWeight: '700',
                color: g.congestion > 75 ? 'var(--danger)' : g.congestion > 50 ? 'var(--warning)' : 'var(--success)'
              }}>
                {g.congestion}%
              </div>
            </div>
          ))}
        </div>

        {/* Trigger Button */}
        <button className="btn-primary" onClick={triggerAI} disabled={isGenerating} style={{ width: '100%', padding: '16px', fontSize: '16px' }}>
          {isGenerating ? t.generating : t.requestOffer}
        </button>
      </main>

      {/* Offer Overlay */}
      {offer && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)',
          borderTop: '2px solid var(--primary-accent)', borderRadius: '24px 24px 0 0',
          padding: '24px', boxShadow: '0 -10px 40px rgba(0,0,0,0.5)', animation: 'slideUp 0.4s cubic-bezier(0.16,1,0.3,1)'
        }} role="dialog" aria-modal="true" aria-labelledby="offer-title">
          <button onClick={dismissOffer} aria-label={t.dismiss} style={{
            position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.1)',
            border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', width: '32px', height: '32px',
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <X size={20} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Zap color="var(--primary-accent)" size={20} />
            <span style={{ color: 'var(--primary-accent)', fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {t.exclusive}
            </span>
            <Timer size={14} color="var(--warning)" style={{ marginLeft: 'auto' }} />
          </div>

          <h3 id="offer-title" style={{ fontSize: '18px', lineHeight: '1.5', marginBottom: '16px' }}>{offer}</h3>

          {qrData && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', border: '1px solid rgba(204,255,0,0.2)' }}>
              <QRCodeCanvas data={qrData} size={80} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{t.qrAlt}</div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--primary-accent)' }}>
                  {targetGate} → {offerMeta?.optimalGate}
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={speakOffer} style={{
              flex: 1, padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)',
              color: 'white', fontWeight: 'bold', fontSize: '14px', border: '1px solid rgba(255,255,255,0.2)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}>
              <Volume2 size={18} /> {t.audio}
            </button>
            <button onClick={handleAcceptOffer} style={{
              flex: 2, padding: '16px', borderRadius: '12px', background: 'var(--primary-accent)',
              color: 'black', fontWeight: 'bold', fontSize: '16px', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}>
              <CheckCircle size={20} /> {t.accept}
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </div>
  );
}
