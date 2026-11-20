export interface DocsApiEditorInstance {
  destroyEditor?: () => void;
}

export interface DocsApiNamespace {
  DocEditor: new (placeholderId: string, config: Record<string, unknown>) => DocsApiEditorInstance;
}

declare global {
  interface Window {
    DocsAPI?: DocsApiNamespace;
  }
}

const LOADED_SCRIPTS = new Map<string, Promise<DocsApiNamespace>>();

export function normalizeServerUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

export function loadOnlyOfficeScript(documentServerUrl: string): Promise<DocsApiNamespace> {
  if (window.DocsAPI) {
    return Promise.resolve(window.DocsAPI);
  }

  const base = normalizeServerUrl(documentServerUrl);
  const scriptSrc = `${base}/web-apps/apps/api/documents/api.js`;

  const existing = LOADED_SCRIPTS.get(scriptSrc);
  if (existing) return existing;

  const promise = new Promise<DocsApiNamespace>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = scriptSrc;
    script.async = true;
    script.onload = () => {
      if (window.DocsAPI) {
        resolve(window.DocsAPI);
      } else {
        LOADED_SCRIPTS.delete(scriptSrc);
        reject(new Error('ONLYOFFICE DocsAPI did not initialize.'));
      }
    };
    script.onerror = () => {
      LOADED_SCRIPTS.delete(scriptSrc);
      reject(new Error(`Failed to load ONLYOFFICE script from ${scriptSrc}`));
    };
    document.head.appendChild(script);
  });

  LOADED_SCRIPTS.set(scriptSrc, promise);
  return promise;
}

export function resetOnlyOfficeLoaderCache(): void {
  LOADED_SCRIPTS.clear();
}
