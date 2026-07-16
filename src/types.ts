export interface ThemeStyles {
  imagePreview: string;
  header: {
    avatar?: { container?: string; image?: string; placeholder?: string };
    container?: string;
    nameContainer?: string;
    postTime?: string;
    userId?: string;
    userInfo?: string;
    userLeft?: string;
    userName?: string;
    verifiedIcon?: string;
  };
  footer: { container?: string; separator?: string; text?: string };
  title: {
    base?: ThemeTitleStyle;
    h1?: ThemeTitleStyle;
    h2?: ThemeTitleStyle;
    h3?: ThemeTitleStyle;
  };
  paragraph: string;
  emphasis: { del?: string; em?: string; strong?: string };
  list: { container?: string; item?: string; taskList?: string };
  code: { block?: string; inline?: string };
  quote: string;
  image: string;
  link: string;
  table: { cell?: string; container?: string; header?: string };
  hr: string;
  footnote: { backref?: string; ref?: string };
  highlight?: string;
}

export interface ThemeTitleStyle {
  after?: string;
  base?: string;
  content?: string;
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
  activationCode: string;
  activationValidationStatus: "unchecked" | "valid" | "invalid" | "unavailable";
  activationLastCheckedAt: string;
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
