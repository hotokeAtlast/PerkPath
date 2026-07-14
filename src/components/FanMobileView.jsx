import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Ticket, MapPin, Zap, X, Globe, Volume2, Shield, Timer, CheckCircle, ChevronDown } from 'lucide-react';

const translations = {
  English: { welcome: 'Welcome, Fan', matchDay: 'Match Day: Final', navTarget: 'Navigation Target', walking: 'Walking towards', exclusive: 'PerkPath Exclusive', accept: 'Accept Offer & Reroute', dismiss: 'Dismiss', audio: 'Play Audio', qrAlt: 'QR Code for redemption', expires: 'Expires', accessible: 'Screen reader active', gate: 'Gate', offerFor: 'Offer for', rerouteTo: 'Reroute to' },
  Spanish: { welcome: 'Bienvenido, Fan', matchDay: 'Día de Partido: Final', navTarget: 'Objetivo de Navegación', walking: 'Caminando hacia', exclusive: 'Exclusivo PerkPath', accept: 'Aceptar Oferta', dismiss: 'Descartar', audio: 'Reproducir Audio', qrAlt: 'Código QR para canjear', expires: 'Expira', accessible: 'Lector de pantalla activo', gate: 'Puerta', offerFor: 'Oferta para', rerouteTo: 'Redirigir a' },
  French: { welcome: 'Bienvenue, Fan', matchDay: 'Jour de Match: Finale', navTarget: 'Cible de Navigation', walking: 'En marchant vers', exclusive: 'Exclusivité PerkPath', accept: "Accepter l'Offre", dismiss: 'Ignorer', audio: 'Lire Audio', qrAlt: 'Code QR pour échange', expires: 'Expire', accessible: 'Lecteur d\'écran actif', gate: 'Porte', offerFor: 'Offre pour', rerouteTo: 'Rediriger vers' },
  German: { welcome: 'Willkommen, Fan', matchDay: 'Spieltag: Finale', navTarget: 'Navigationsziel', walking: 'Gehend zum', exclusive: 'PerkPath Exklusiv', accept: 'Angebot annehmen', dismiss: 'Abbrechen', audio: 'Audio abspielen', qrAlt: 'QR-Code zur Einlösung', expires: 'Läuft ab', accessible: 'Screenreader aktiv', gate: 'Tor', offerFor: 'Angebot für', rerouteTo: 'Umleiten zu' },
  Japanese: { welcome: 'ようこそ、ファンの皆様', matchDay: '試合当日: 決勝', navTarget: 'ナビゲーション先', walking: 'に向かって歩行中', exclusive: 'PerkPath限定', accept: 'オファーを受ける', dismiss: '閉じる', audio: '音声再生', qrAlt: '引換用QRコード', expires: '期限', accessible: 'スクリーンリーダー対応', gate: 'ゲート', offerFor: 'オファー対象', rerouteTo: '経路変更先' },
  Portuguese: { welcome: 'Bem-vindo, Fã', matchDay: 'Dia do Jogo: Final', navTarget: 'Destino de Navegação', walking: 'Caminhando para', exclusive: 'Exclusivo PerkPath', accept: 'Aceitar Oferta', dismiss: 'Dispensar', audio: 'Tocar Áudio', qrAlt: 'Código QR para resgate', expires: 'Expira', accessible: 'Leitor de tela ativo', gate: 'Portão', offerFor: 'Oferta para', rerouteTo: 'Redirecionar para' },
  Arabic: { welcome: 'أهلاً بك يا مشجع', matchDay: 'يوم المباراة: النهائي', navTarget: 'هدف التنقل', walking: 'يسير نحو', exclusive: 'حصري PerkPath', accept: 'قبول العرض', dismiss: 'تجاهل', audio: 'تشغيل الصوت', qrAlt: 'رمز QR للاستبدال', expires: 'ينتهي', accessible: 'قارئ الشاشة نشط', gate: 'بوابة', offerFor: 'عرض لـ', rerouteTo: 'إعادة توجيه إلى' },
};

const RTL_LANGUAGES = ['Arabic'];

function generateQRCodeData(gateFrom, gateTo, perk) {
  const payload = { type: 'PERKPATH_REDEEM', from: gateFrom, to: gateTo, perk, ts: Date.now(), nonce: Math.random().toString(36).slice(2, 10) };
  return `https://perkpath.fifa2026.com/redeem?data=${btoa(JSON.stringify(payload))}`;
}

function QRCodeCanvas({ data, size = 128 }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const qrSize = size;
    canvas.width = qrSize;
    canvas.height = qrSize;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, qrSize, qrSize);
    ctx.fillStyle = '#CCFF00';
    
    // Generate deterministic pattern from data
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash) + data.charCodeAt(i);
      hash |= 0;
    }
    
    const modules = 25;
    const moduleSize = qrSize / modules;
    const rng = (seed) => {
      let x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };
    
    // Finder patterns (corners)
    const drawFinder = (cx, cy) => {
      [7, 5, 3].forEach((s, i) => {
        ctx.fillStyle = i % 2 === 0 ? '#CCFF00' : '#000';
        ctx.fillRect((cx - s/2) * moduleSize, (cy - s/2) * moduleSize, s * moduleSize, s * moduleSize);
      });
    };
    drawFinder(3.5, 3.5);
    drawFinder(modules - 4.5, 3.5);
    drawFinder(3.5, modules - 4.5);

    // Timing patterns
    for (let i = 8; i < modules - 8; i++) {
      if ((i + hash) % 2 === 0) {
        ctx.fillRect(i * moduleSize, 6 * moduleSize, moduleSize, moduleSize);
        ctx.fillRect(6 * moduleSize, i * moduleSize, moduleSize, moduleSize);
      }
    }

    // Data modules
    for (let y = 0; y < modules; y++) {
      for (let x = 0; x < modules; x++) {
        if ((x < 9 && y < 9) || (x > modules - 9 && y < 9) || (x < 9 && y > modules - 9) || x === 6 || y === 6) continue;
        if (rng(hash + x * 31 + y * 17) > 0.5) {
          ctx.fillRect(x * moduleSize, y * moduleSize, moduleSize, moduleSize);
        }
      }
    }

    // Center logo
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(qrSize/2, qrSize/2, qrSize/8, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#CCFF00';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PP', qrSize/2, qrSize/2 + 6);
  }, [data, size]);
  return <canvas ref={canvasRef} width={size} height={size} style={{ borderRadius: '8px', border: '2px solid #000' }} />;
}

export default function FanMobileView({
  fanLanguage,
  setFanLanguage,
  targetGate,
  offer,
  onAcceptOffer,
  onDismissOffer
}) {
  const isRTL = RTL_LANGUAGES.includes(fanLanguage);
  const t = translations[fanLanguage];
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef(null);

  const LANG_OPTIONS = [
    { value: 'English', label: 'English', flag: '🇬🇧' },
    { value: 'Spanish', label: 'Español', flag: '🇪🇸' },
    { value: 'French', label: 'Français', flag: '🇫🇷' },
    { value: 'German', label: 'Deutsch', flag: '🇩🇪' },
    { value: 'Japanese', label: '日本語', flag: '🇯🇵' },
    { value: 'Portuguese', label: 'Português', flag: '🇧🇷' },
    { value: 'Arabic', label: 'العربية', flag: '🇸🇦' },
  ];

  const currentLang = LANG_OPTIONS.find(l => l.value === fanLanguage) || LANG_OPTIONS[0];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const speakOffer = useCallback(() => {
    if (!offer) return;
    const utterance = new SpeechSynthesisUtterance(offer);
    utterance.lang = fanLanguage === 'English' ? 'en-US' : 
                     fanLanguage === 'Spanish' ? 'es-ES' :
                     fanLanguage === 'French' ? 'fr-FR' :
                     fanLanguage === 'German' ? 'de-DE' :
                     fanLanguage === 'Japanese' ? 'ja-JP' :
                     fanLanguage === 'Portuguese' ? 'pt-BR' : 'ar-SA';
    utterance.rate = 0.95;
    utterance.pitch = 1.1;
    speechSynthesis.speak(utterance);
  }, [offer, fanLanguage]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onDismissOffer();
    if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') onAcceptOffer();
    if (e.key === ' ' && e.target === document.body) speakOffer();
  }, [onDismissOffer, onAcceptOffer, speakOffer]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Parse offer for QR data
  const offerData = offer ? {
    from: targetGate,
    to: offer.includes('Gate A') ? 'Gate A' : offer.includes('Gate B') ? 'Gate B' : 'Gate C',
    perk: offer.match(/(\d+% off [^.]+|[^.]+)/)?.[0] || 'Exclusive Offer'
  } : null;

  const qrData = offerData ? generateQRCodeData(offerData.from, offerData.to, offerData.perk) : null;

  return (
    <div className="mobile-view-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100%' }}>
      <div style={{ 
        width: '375px', height: '812px', 
        background: '#121212', borderRadius: '40px',
        border: '8px solid #333', overflow: 'hidden',
        position: 'relative', boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column',
        direction: isRTL ? 'rtl' : 'ltr'
      }} role="region" aria-label={t.accessible} aria-live="polite">
        
        {/* Header */}
        <div style={{ padding: '40px 20px 20px', background: 'linear-gradient(180deg, #1a1a1a 0%, transparent 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: '24px', marginBottom: '4px' }}>{t.welcome}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{t.matchDay}</p>
          </div>
          <div ref={langRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setLangOpen(!langOpen)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '20px',
                border: 'none', color: 'white', fontSize: '12px', cursor: 'pointer',
                outline: 'none', fontFamily: 'inherit'
              }}
              aria-label="Select language"
              aria-expanded={langOpen}
            >
              <Globe size={14} color="var(--primary-accent)" />
              <span>{currentLang.flag} {currentLang.label}</span>
              <ChevronDown size={12} style={{ transform: langOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
            </button>
            {langOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 100,
                background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '12px', padding: '6px', minWidth: '160px',
                boxShadow: '0 12px 40px rgba(0,0,0,0.6)'
              }}>
                {LANG_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setFanLanguage(opt.value); setLangOpen(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      width: '100%', padding: '8px 12px', border: 'none', borderRadius: '8px',
                      background: fanLanguage === opt.value ? 'rgba(204,255,0,0.15)' : 'transparent',
                      color: fanLanguage === opt.value ? 'var(--primary-accent)' : 'white',
                      fontSize: '13px', cursor: 'pointer', textAlign: 'left',
                      fontFamily: 'inherit', transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => { if (fanLanguage !== opt.value) e.target.style.background = 'rgba(255,255,255,0.08)'; }}
                    onMouseLeave={(e) => { if (fanLanguage !== opt.value) e.target.style.background = 'transparent'; }}
                  >
                    <span style={{ fontSize: '14px' }}>{opt.flag}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Ticket */}
        <div style={{ margin: '0 20px', padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <Ticket color="var(--primary-accent)" />
            <span style={{ fontWeight: '600' }}>Block 112, Row 4</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t.navTarget}</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{targetGate}</div>
        </div>

        {/* Map Snippet */}
        <div style={{ margin: '20px', flex: 1, background: 'rgba(204, 255, 0, 0.03)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '10px', color: 'var(--text-secondary)' }}>
          <MapPin size={32} opacity={0.5} />
          {t.walking} {targetGate}...
        </div>

        {/* AI Offer Overlay */}
        {offer && (
          <div 
            className="animate-slide-up" 
            style={{ 
              position: 'absolute', bottom: '20px', left: '20px', right: '20px',
              background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)',
              WebkitBackdropFilter: 'var(--glass-blur)',
              border: '1px solid var(--primary-accent)', borderRadius: '24px',
              padding: '24px', boxShadow: '0 10px 30px rgba(204,255,0,0.2)',
              color: 'white', zIndex: 10
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="offer-title"
          >
            <button 
              onClick={onDismissOffer}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '8px', borderRadius: '8px' }}
              aria-label={t.dismiss}
            >
              <X size={20} />
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Zap color="var(--primary-accent)" size={20} />
              <span style={{ color: 'var(--primary-accent)', fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {t.exclusive}
              </span>
              <Shield size={14} color="var(--success)" style={{ marginLeft: 'auto' }} />
            </div>
            
            <h3 id="offer-title" style={{ fontSize: '18px', lineHeight: '1.4', marginBottom: '16px' }}>
              {offer}
            </h3>

            {/* QR Code Section */}
            {qrData && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', border: '1px solid rgba(204,255,0,0.2)' }}>
                <QRCodeCanvas data={qrData} size={96} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Scan to Redeem</div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--primary-accent)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {offerData.from} → {offerData.to}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {offerData.perk}
                  </div>
                </div>
                <Timer size={16} color="var(--warning)" />
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={speakOffer}
                style={{ 
                  flex: 1, padding: '14px', borderRadius: '12px',
                  background: 'rgba(255,255,255,0.1)', color: 'white',
                  fontWeight: 'bold', fontSize: '14px', border: '1px solid rgba(255,255,255,0.2)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
                aria-label={t.audio}
              >
                <Volume2 size={18} />
                {t.audio}
              </button>
              <button 
                onClick={onAcceptOffer}
                style={{ 
                  flex: 2, padding: '16px', borderRadius: '12px',
                  background: 'var(--primary-accent)', color: 'black',
                  fontWeight: 'bold', fontSize: '16px', border: 'none',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                <CheckCircle size={20} />
                {t.accept}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}