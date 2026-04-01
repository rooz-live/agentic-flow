declare module 'node-cron' {
  export interface ScheduledTask {
      start(): void;
      stop(): void;
  }
  export function validate(cronExpression: string): boolean;
  export function schedule(cronExpression: string, func: () => void): ScheduledTask;
}
declare module 'react-router-dom';
declare module 'lucide-react';
declare module 'blessed' {
  export namespace Widgets {
      interface Screen {
          key(keys: string | string[], callback: () => void): void;
          render(): void;
          destroy(): void;
      }
      interface ListElement { clearItems(): void; addItem(i: any): void; [key: string]: any; }
      interface Log { log(m: any): void; [key: string]: any; }
      interface BoxElement { setContent(c: any): void; [key: string]: any; }
      interface ProgressBarElement { setProgress(p: number): void; [key: string]: any; }
      interface Node { [key: string]: any; }
      interface ListTable { [key: string]: any; }
  }
  export function screen(options?: any): Widgets.Screen;
  export function list(options?: any): Widgets.ListElement;
  export function log(options?: any): Widgets.Log;
  export function box(options?: any): Widgets.BoxElement;
  export function progressbar(options?: any): Widgets.ProgressBarElement;
  export function listtable(options?: any): Widgets.ListTable;
}
declare module 'blessed-contrib';
