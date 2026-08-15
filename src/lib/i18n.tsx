import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type LanguageCode = "en" | "ja" | "de" | "es" | "fr";

export interface LanguageInfo {
  code: LanguageCode;
  label: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: "en", label: "English", nativeName: "English", flag: "🇺🇸" },
  { code: "ja", label: "Japanese", nativeName: "日本語", flag: "🇯🇵" },
  { code: "de", label: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "es", label: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "fr", label: "French", nativeName: "Français", flag: "🇫🇷" },
];

export const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  en: {
    // Nav
    "nav.discover": "Discover",
    "nav.radio": "Radio",
    "nav.community": "Community",
    "nav.store": "Master Store",
    "nav.artists": "Creators",
    "nav.library": "My Library",
    "nav.upload": "Publish Master",
    "nav.dashboard": "Creator Hub",
    // Player & DSP
    "player.console": "Audio Console",
    "player.queue": "Play Queue",
    "player.bitperfect": "Bit-Perfect Lossless",
    "player.spatial": "3D Spatial Audio",
    "player.stems": "Multi-Track Stems",
    "player.lufs": "LUFS & Dynamics",
    "player.lyrics": "Synced Lyrics",
    // Actions & Commerce
    "action.play": "Play",
    "action.pause": "Pause",
    "action.buy": "Buy Master",
    "action.tip": "Tip Artist",
    "action.export": "Export Format",
    "action.provenance": "Provenance Proof",
    "action.offline": "Save Offline",
    // Library & Rooms
    "rooms.title": "Live Listening Rooms",
    "rooms.sync": "Sync Audio",
    "rooms.vote": "Up Next Voting",
    "rooms.host": "Host a Room",
    "lib.smartmix": "Smart Mix Generator",
    "lib.duplicate": "Duplicate Cleaner",
  },
  ja: {
    // Nav
    "nav.discover": "ディスカバー",
    "nav.radio": "ラジオ",
    "nav.community": "コミュニティ",
    "nav.store": "マスターストア",
    "nav.artists": "アーティスト",
    "nav.library": "マイライブラリ",
    "nav.upload": "マスター公開",
    "nav.dashboard": "クリエイターハブ",
    // Player & DSP
    "player.console": "オーディオコンソール",
    "player.queue": "再生キュー",
    "player.bitperfect": "ビットパーフェクト・ロスレス",
    "player.spatial": "3D空間オーディオ",
    "player.stems": "マルチトラック・ステム",
    "player.lufs": "LUFS音圧・ダイナミクス",
    "player.lyrics": "同期歌詞",
    // Actions & Commerce
    "action.play": "再生",
    "action.pause": "一時停止",
    "action.buy": "マスター購入",
    "action.tip": "アーティスト応援",
    "action.export": "フォーマット変換",
    "action.provenance": "所有権証明書",
    "action.offline": "オフライン保存",
    // Library & Rooms
    "rooms.title": "ライブリスニングルーム",
    "rooms.sync": "同期再生",
    "rooms.vote": "選曲リクエスト投票",
    "rooms.host": "ルームを開設",
    "lib.smartmix": "スマート選曲エンジン",
    "lib.duplicate": "重複スキャン＆クリーン",
  },
  de: {
    // Nav
    "nav.discover": "Entdecken",
    "nav.radio": "Radio",
    "nav.community": "Community",
    "nav.store": "Master-Store",
    "nav.artists": "Künstler",
    "nav.library": "Meine Bibliothek",
    "nav.upload": "Master veröffentlichen",
    "nav.dashboard": "Creator-Hub",
    // Player & DSP
    "player.console": "Audio-Konsole",
    "player.queue": "Wiedergabewarteschlange",
    "player.bitperfect": "Bit-Perfect Lossless",
    "player.spatial": "3D-Raumklang",
    "player.stems": "Mehrspur-Stems",
    "player.lufs": "LUFS & Dynamik",
    "player.lyrics": "Synchronisierte Lyrics",
    // Actions & Commerce
    "action.play": "Abspielen",
    "action.pause": "Pause",
    "action.buy": "Master kaufen",
    "action.tip": "Künstler unterstützen",
    "action.export": "Format exportieren",
    "action.provenance": "Echtheitszertifikat",
    "action.offline": "Offline speichern",
    // Library & Rooms
    "rooms.title": "Live-Hörräume",
    "rooms.sync": "Audio synchronisieren",
    "rooms.vote": "Titel-Abstimmung",
    "rooms.host": "Raum hosten",
    "lib.smartmix": "Smart-Mix-Generator",
    "lib.duplicate": "Duplikat-Bereinigung",
  },
  es: {
    // Nav
    "nav.discover": "Descubrir",
    "nav.radio": "Radio",
    "nav.community": "Comunidad",
    "nav.store": "Tienda Máster",
    "nav.artists": "Creadores",
    "nav.library": "Mi Biblioteca",
    "nav.upload": "Publicar Máster",
    "nav.dashboard": "Panel de Creador",
    // Player & DSP
    "player.console": "Consola de Audio",
    "player.queue": "Cola de Reproducción",
    "player.bitperfect": "Bit-Perfect Sin Pérdidas",
    "player.spatial": "Audio Espacial 3D",
    "player.stems": "Pistas Stems",
    "player.lufs": "LUFS y Dinámica",
    "player.lyrics": "Letras Sincronizadas",
    // Actions & Commerce
    "action.play": "Reproducir",
    "action.pause": "Pausa",
    "action.buy": "Comprar Máster",
    "action.tip": "Propina al Artista",
    "action.export": "Exportar Formato",
    "action.provenance": "Certificado de Procedencia",
    "action.offline": "Guardar Offline",
    // Library & Rooms
    "rooms.title": "Salas de Escucha en Vivo",
    "rooms.sync": "Sincronizar Audio",
    "rooms.vote": "Votación de Canción",
    "rooms.host": "Crear una Sala",
    "lib.smartmix": "Generador Smart Mix",
    "lib.duplicate": "Limpiador de Duplicados",
  },
  fr: {
    // Nav
    "nav.discover": "Découvrir",
    "nav.radio": "Radio",
    "nav.community": "Communauté",
    "nav.store": "Boutique Master",
    "nav.artists": "Créateurs",
    "nav.library": "Ma Bibliothèque",
    "nav.upload": "Publier un Master",
    "nav.dashboard": "Hub Créateur",
    // Player & DSP
    "player.console": "Console Audio",
    "player.queue": "File d'attente",
    "player.bitperfect": "Bit-Perfect Sans Perte",
    "player.spatial": "Audio Spatial 3D",
    "player.stems": "Stems Multi-Pistes",
    "player.lufs": "LUFS & Dynamique",
    "player.lyrics": "Paroles Synchronisées",
    // Actions & Commerce
    "action.play": "Lecture",
    "action.pause": "Pause",
    "action.buy": "Acheter le Master",
    "action.tip": "Soutenir l'Artiste",
    "action.export": "Exporter Format",
    "action.provenance": "Preuve de Propriété",
    "action.offline": "Sauvegarder Hors-ligne",
    // Library & Rooms
    "rooms.title": "Salons d'Écoute en Direct",
    "rooms.sync": "Synchroniser l'Audio",
    "rooms.vote": "Vote du Prochain Titre",
    "rooms.host": "Créer un Salon",
    "lib.smartmix": "Générateur Smart Mix",
    "lib.duplicate": "Nettoyeur de Doublons",
  },
};

interface I18nContextValue {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string, fallback?: string) => string;
  languages: LanguageInfo[];
}

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = "layam_selected_language";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>("en");

  useEffect(() => {
    // Enforce English by default
    try {
      localStorage.setItem(STORAGE_KEY, "en");
      setLanguageState("en");
    } catch {
      // ignore
    }
  }, []);

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore
    }
  };

  const t = (key: string, fallback?: string): string => {
    return TRANSLATIONS[language]?.[key] ?? TRANSLATIONS.en[key] ?? fallback ?? key;
  };

  return (
    <I18nContext.Provider
      value={{
        language,
        setLanguage,
        t,
        languages: SUPPORTED_LANGUAGES,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    return {
      language: "en",
      setLanguage: () => {},
      t: (key: string, fallback?: string) => fallback ?? key,
      languages: SUPPORTED_LANGUAGES,
    };
  }
  return context;
}
