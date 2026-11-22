const IGNORED_NAMES = new Set(['.ds_store', 'thumbs.db', 'desktop.ini']);

function isIgnoredFile(name: string): boolean {
  return IGNORED_NAMES.has(name.toLowerCase());
}

function readAllDirectoryEntries(entry: FileSystemDirectoryEntry): Promise<FileSystemEntry[]> {
  return new Promise((resolve) => {
    const reader = entry.createReader();
    const collected: FileSystemEntry[] = [];
    const readNext = () => {
      reader.readEntries(
        (batch) => {
          if (batch.length === 0) return resolve(collected);
          collected.push(...batch);
          readNext();
        },
        () => resolve(collected)
      );
    };
    readNext();
  });
}

async function collectEntryFiles(entry: FileSystemEntry): Promise<File[]> {
  if (entry.isFile) {
    if (isIgnoredFile(entry.name)) return [];
    const fileEntry = entry as FileSystemFileEntry;
    return new Promise((resolve) => {
      fileEntry.file(
        (file) => resolve(file.size > 0 ? [file] : []),
        () => resolve([])
      );
    });
  }
  if (entry.isDirectory) {
    const children = await readAllDirectoryEntries(entry as FileSystemDirectoryEntry);
    const nested = await Promise.all(children.map((child) => collectEntryFiles(child)));
    return nested.flat();
  }
  return [];
}

export async function extractDroppedFiles(dataTransfer: DataTransfer): Promise<File[]> {
  const items = Array.from(dataTransfer.items ?? []);
  const entries = items
    .map((item) => (typeof item.webkitGetAsEntry === 'function' ? item.webkitGetAsEntry() : null))
    .filter((entry): entry is FileSystemEntry => entry !== null);

  if (entries.length > 0) {
    const collected = await Promise.all(entries.map((entry) => collectEntryFiles(entry)));
    return collected.flat();
  }
  return Array.from(dataTransfer.files ?? []).filter((f) => !isIgnoredFile(f.name) && f.size > 0);
}
