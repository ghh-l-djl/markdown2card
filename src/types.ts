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

export interface ImageState {
  s: number;
  x: number;
  y: number;
  w?: number;
  h?: number;
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
  imageScales: Record<string, ImageState>;
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
