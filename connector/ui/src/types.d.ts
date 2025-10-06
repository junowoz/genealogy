export {}; // ensure this is a module

declare global {
  interface Window {
    openai?: {
      toolInput?: any;
      toolOutput?: any;
      widgetState?: any;
      setWidgetState?: (state: any) => Promise<void> | void;
      callTool?: (name: string, args: any) => Promise<any>;
      sendFollowupTurn?: (opts: { prompt: string }) => Promise<void>;
      requestDisplayMode?: (opts: { mode: 'inline' | 'pip' | 'fullscreen' }) => Promise<void>;
      displayMode?: 'inline' | 'pip' | 'fullscreen';
      maxHeight?: number;
      locale?: string;
      theme?: 'light' | 'dark' | string;
    };
  }
}

