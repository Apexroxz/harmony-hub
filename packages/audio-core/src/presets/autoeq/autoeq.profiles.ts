/**
 * @layam/audio-core — AutoEq Curated Headphone Compensation Profiles
 * 
 * Target: Harman Target 2020 Over-Ear / In-Ear acoustic standard.
 * Gains mapped to Layam's 10 ISO Equalizer Bands:
 * [32Hz, 64Hz, 125Hz, 250Hz, 500Hz, 1000Hz, 2000Hz, 4000Hz, 8000Hz, 16000Hz]
 */

export interface AutoEqProfile {
  id: string;
  brand: string;
  model: string;
  fullName: string;
  type: "over-ear" | "in-ear" | "wireless";
  gains: [number, number, number, number, number, number, number, number, number, number];
  preampDb: number;
}

export const AUTOEQ_PROFILES: AutoEqProfile[] = [
  // --- Sennheiser ---
  {
    id: "sennheiser-hd650",
    brand: "Sennheiser",
    model: "HD 650 / HD 6XX",
    fullName: "Sennheiser HD 650 / 6XX",
    type: "over-ear",
    gains: [5.2, 4.1, 1.8, -0.4, 0.2, 0.0, 1.4, -2.1, 2.8, -1.2],
    preampDb: -5.5,
  },
  {
    id: "sennheiser-hd600",
    brand: "Sennheiser",
    model: "HD 600",
    fullName: "Sennheiser HD 600",
    type: "over-ear",
    gains: [6.1, 4.5, 1.5, -0.2, 0.1, 0.0, 1.1, -1.8, 2.2, -0.8],
    preampDb: -6.2,
  },
  {
    id: "sennheiser-hd800s",
    brand: "Sennheiser",
    model: "HD 800 S",
    fullName: "Sennheiser HD 800 S",
    type: "over-ear",
    gains: [6.8, 4.2, 1.2, -0.5, 0.0, 0.2, 1.8, -4.5, 1.2, -1.5],
    preampDb: -7.0,
  },
  {
    id: "sennheiser-hd560s",
    brand: "Sennheiser",
    model: "HD 560S",
    fullName: "Sennheiser HD 560S",
    type: "over-ear",
    gains: [4.2, 2.5, 0.8, -0.3, 0.0, 0.2, 0.8, -2.2, 1.5, -1.0],
    preampDb: -4.5,
  },
  {
    id: "sennheiser-momentum-4",
    brand: "Sennheiser",
    model: "Momentum 4 Wireless",
    fullName: "Sennheiser Momentum 4 Wireless",
    type: "wireless",
    gains: [-3.8, -2.5, -1.2, 0.4, 0.8, 0.2, -1.0, 2.4, 1.8, 0.5],
    preampDb: -1.0,
  },

  // --- Sony ---
  {
    id: "sony-wh1000xm5",
    brand: "Sony",
    model: "WH-1000XM5",
    fullName: "Sony WH-1000XM5",
    type: "wireless",
    gains: [-4.2, -3.1, -1.5, 0.6, 1.2, 0.4, -0.8, 3.2, 2.1, 1.0],
    preampDb: -1.5,
  },
  {
    id: "sony-wh1000xm4",
    brand: "Sony",
    model: "WH-1000XM4",
    fullName: "Sony WH-1000XM4",
    type: "wireless",
    gains: [-5.0, -3.8, -2.1, 0.8, 1.5, 0.5, -1.2, 3.8, 2.5, 1.2],
    preampDb: -1.8,
  },
  {
    id: "sony-mdr7506",
    brand: "Sony",
    model: "MDR-7506",
    fullName: "Sony MDR-7506",
    type: "over-ear",
    gains: [3.5, 2.0, 0.5, -0.8, -0.4, 0.0, 1.2, -3.5, -2.1, 0.8],
    preampDb: -3.8,
  },
  {
    id: "sony-ier-m9",
    brand: "Sony",
    model: "IER-M9",
    fullName: "Sony IER-M9",
    type: "in-ear",
    gains: [2.1, 1.4, 0.5, -0.2, 0.0, 0.4, 0.8, -1.2, 1.5, 0.5],
    preampDb: -2.3,
  },

  // --- Apple ---
  {
    id: "apple-airpods-max",
    brand: "Apple",
    model: "AirPods Max",
    fullName: "Apple AirPods Max",
    type: "wireless",
    gains: [1.2, 0.8, -0.4, 0.2, 0.0, 0.4, 1.1, -2.4, 0.8, -0.5],
    preampDb: -1.5,
  },
  {
    id: "apple-airpods-pro-2",
    brand: "Apple",
    model: "AirPods Pro 2",
    fullName: "Apple AirPods Pro 2",
    type: "in-ear",
    gains: [1.8, 1.0, 0.0, -0.3, 0.2, 0.5, 0.8, -1.5, 1.2, 0.2],
    preampDb: -2.0,
  },

  // --- Beyerdynamic ---
  {
    id: "beyerdynamic-dt770-80",
    brand: "Beyerdynamic",
    model: "DT 770 Pro (80Ω)",
    fullName: "Beyerdynamic DT 770 Pro (80Ω)",
    type: "over-ear",
    gains: [-1.5, -0.8, 0.2, 0.6, 0.4, 0.0, 1.5, -3.8, -5.2, 1.0],
    preampDb: -2.0,
  },
  {
    id: "beyerdynamic-dt990-250",
    brand: "Beyerdynamic",
    model: "DT 990 Pro (250Ω)",
    fullName: "Beyerdynamic DT 990 Pro (250Ω)",
    type: "over-ear",
    gains: [4.5, 2.8, 0.8, -0.4, 0.2, 0.0, 1.2, -4.8, -6.5, 0.5],
    preampDb: -5.0,
  },
  {
    id: "beyerdynamic-dt1990",
    brand: "Beyerdynamic",
    model: "DT 1990 Pro (A-Pads)",
    fullName: "Beyerdynamic DT 1990 Pro",
    type: "over-ear",
    gains: [3.8, 2.2, 0.5, -0.3, 0.1, 0.0, 1.4, -4.2, -5.8, 0.8],
    preampDb: -4.2,
  },

  // --- Audio-Technica ---
  {
    id: "audiotechnica-ath-m50x",
    brand: "Audio-Technica",
    model: "ATH-M50x",
    fullName: "Audio-Technica ATH-M50x",
    type: "over-ear",
    gains: [-2.8, -2.1, -0.8, 0.4, 0.6, 0.0, 0.8, -1.8, -3.2, 1.5],
    preampDb: -1.5,
  },
  {
    id: "audiotechnica-ath-r70x",
    brand: "Audio-Technica",
    model: "ATH-R70x",
    fullName: "Audio-Technica ATH-R70x",
    type: "over-ear",
    gains: [5.8, 3.9, 1.2, -0.3, 0.0, 0.2, 1.1, -1.5, 1.8, -0.8],
    preampDb: -6.0,
  },

  // --- Focal ---
  {
    id: "focal-clear",
    brand: "Focal",
    model: "Clear / Clear Mg",
    fullName: "Focal Clear / Clear Mg",
    type: "over-ear",
    gains: [3.2, 2.0, 0.5, -0.2, 0.0, 0.4, 0.8, -2.5, 1.2, -0.5],
    preampDb: -3.5,
  },
  {
    id: "focal-bathys",
    brand: "Focal",
    model: "Bathys (Wireless)",
    fullName: "Focal Bathys",
    type: "wireless",
    gains: [-1.2, -0.5, 0.2, 0.0, 0.2, 0.5, 0.8, -1.8, 1.0, 0.2],
    preampDb: -1.0,
  },

  // --- HiFiMAN ---
  {
    id: "hifiman-sundara",
    brand: "HiFiMAN",
    model: "Sundara",
    fullName: "HiFiMAN Sundara",
    type: "over-ear",
    gains: [5.5, 3.8, 1.0, -0.4, 0.0, 0.2, 1.8, -2.4, 1.1, -0.8],
    preampDb: -5.8,
  },
  {
    id: "hifiman-ananda",
    brand: "HiFiMAN",
    model: "Ananda",
    fullName: "HiFiMAN Ananda",
    type: "over-ear",
    gains: [4.8, 3.2, 0.8, -0.5, 0.0, 0.4, 1.6, -3.1, 0.8, -1.0],
    preampDb: -5.0,
  },
  {
    id: "hifiman-edition-xs",
    brand: "HiFiMAN",
    model: "Edition XS",
    fullName: "HiFiMAN Edition XS",
    type: "over-ear",
    gains: [4.2, 2.8, 0.6, -0.3, 0.0, 0.2, 1.4, -2.8, 1.0, -0.8],
    preampDb: -4.5,
  },

  // --- Audeze ---
  {
    id: "audeze-lcd-x",
    brand: "Audeze",
    model: "LCD-X (2021+)",
    fullName: "Audeze LCD-X",
    type: "over-ear",
    gains: [2.5, 1.8, 0.4, -0.2, 0.0, 0.8, 2.4, -1.5, 1.8, -0.5],
    preampDb: -3.0,
  },
  {
    id: "audeze-maxwell",
    brand: "Audeze",
    model: "Maxwell Wireless",
    fullName: "Audeze Maxwell",
    type: "wireless",
    gains: [0.8, 0.4, -0.2, 0.0, 0.2, 0.4, 0.8, -1.2, 0.5, 0.0],
    preampDb: -1.0,
  },

  // --- Moondrop / IEMs ---
  {
    id: "moondrop-blessing-2",
    brand: "Moondrop",
    model: "Blessing 2 / Dusk",
    fullName: "Moondrop Blessing 2 / Dusk",
    type: "in-ear",
    gains: [1.5, 0.8, 0.0, -0.2, 0.1, 0.4, 0.6, -1.0, 0.8, 0.0],
    preampDb: -1.8,
  },
  {
    id: "moondrop-aria",
    brand: "Moondrop",
    model: "Aria / Chu II",
    fullName: "Moondrop Aria / Chu II",
    type: "in-ear",
    gains: [0.8, 0.2, -0.2, 0.0, 0.2, 0.5, 0.8, -1.4, 1.0, 0.2],
    preampDb: -1.2,
  },

  // --- Shure ---
  {
    id: "shure-se215",
    brand: "Shure",
    model: "SE215",
    fullName: "Shure SE215",
    type: "in-ear",
    gains: [-3.5, -2.4, -1.0, 0.4, 0.8, 0.2, -0.8, 2.8, 3.2, 1.5],
    preampDb: -1.0,
  },
];

export function getAutoEqProfileById(id: string): AutoEqProfile | undefined {
  return AUTOEQ_PROFILES.find((p) => p.id === id);
}
