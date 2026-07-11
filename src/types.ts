export interface ThemeStyles {
  imagePreview: string;
  header: any;
  footer: any;
  title: any;
  paragraph: string;
  emphasis: any;
  list: any;
  code: any;
  quote: string;
  image: string;
  link: string;
  table: any;
  hr: string;
  footnote: any;
  highlight?: string;
}

export interface YanqiTheme {
  id: string;
  name: string;
  description?: string;
  styles: ThemeStyles;
  isPreset?: boolean;
  isVisible?: boolean;
}

export interface ImageLayoutState {
  mode: "contain" | "crop";
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface TableState {
  s: number;
}

export interface BackgroundSettings {
  imageUrl: string;
  scale: number;
  position: { x: number; y: number };
}

export interface YanqiSettings {
  templateId: string;
  themeId: string;
  fontFamily: string;
  fontSize: number;
  backgroundId: string;
  coverStyle: string;
  imageLayouts: Record<string, ImageLayoutState>;
  tableScales: Record<string, TableState>;
  themes: YanqiTheme[];
  customThemes: YanqiTheme[];
  userAvatar: string;
  userName: string;
  notesTitle: string;
  userId: string;
  weiboLocation: string;
  showTime: boolean;
  showFooter?: boolean;
  timeFormat: string;
  footerLeftText: string;
  footerRightText: string;
  customFonts: FontOption[];
  backgroundSettings: BackgroundSettings;
  exportPath: string;
  exportFormat: "zip" | "png-folder";
  exportCount: number;
  lastSupportReminderExportCount: number;
  enablePostExportActions: boolean;
  uiLanguage: "en" | "zh";
  enableAiSummary: boolean;
  aiProvider: "gemini" | "agy";
  agyCommandPath: string;
  agyProxyUrl: string;
  agyNoProxy: string;
  geminiApiKey: string;
  geminiApiUrl: string;
  geminiModel: string;
  aiPromptTemplate: string;
  aiRewriteThreshold: number;
}

export interface FontOption {
  value: string;
  label: string;
  isPreset?: boolean;
}

export interface ImgTemplate {
  id: string;
  name: string;
  sections: { header: boolean; content: boolean; footer: boolean };
  render(element: HTMLElement, settings?: YanqiSettings): void;
}
