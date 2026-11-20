import { describe, expect, it } from 'vitest';
import {
  classifyFileEditor,
  getCodeMirrorLanguage,
  getFileExtension,
  isMarkdownFile,
} from './fileEditorRegistry';

describe('fileEditorRegistry', () => {
  it('extracts normalized file extensions safely', () => {
    expect(getFileExtension('README.MD')).toBe('md');
    expect(getFileExtension('archive.tar.gz')).toBe('gz');
    expect(getFileExtension('.gitignore')).toBe('');
    expect(getFileExtension('Dockerfile')).toBe('');
    expect(getFileExtension('trailing.')).toBe('');
  });

  it('classifies Office, Text/Code, and unsupported files', () => {
    expect(classifyFileEditor('proposal.docx')).toBe('OFFICE');
    expect(classifyFileEditor('budget.xlsx')).toBe('OFFICE');
    expect(classifyFileEditor('deck.pptx')).toBe('OFFICE');
    expect(classifyFileEditor('legacy.doc')).toBe('OFFICE');
    expect(classifyFileEditor('legacy.xls')).toBe('OFFICE');
    expect(classifyFileEditor('legacy.ppt')).toBe('OFFICE');

    expect(classifyFileEditor('notes.md')).toBe('TEXT');
    expect(classifyFileEditor('data.csv')).toBe('TEXT');
    expect(classifyFileEditor('service.ts')).toBe('TEXT');
    expect(classifyFileEditor('Main.java')).toBe('TEXT');
    expect(classifyFileEditor('schema.sql')).toBe('TEXT');
    expect(classifyFileEditor('Dockerfile')).toBe('TEXT');
    expect(classifyFileEditor('.gitignore')).toBe('TEXT');

    expect(classifyFileEditor('photo.png', 'image/png')).toBe('NONE');
    expect(classifyFileEditor('archive.zip', 'application/zip')).toBe('NONE');
    expect(classifyFileEditor('manual.pdf', 'application/pdf')).toBe('NONE');
  });

  it('falls back to MIME type when filename has no known extension', () => {
    expect(classifyFileEditor('untitled', 'text/plain; charset=utf-8')).toBe('TEXT');
    expect(classifyFileEditor('payload', 'application/json')).toBe('TEXT');
    expect(
      classifyFileEditor(
        'document',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      )
    ).toBe('OFFICE');
  });

  it('detects Markdown files by extension or MIME type', () => {
    expect(isMarkdownFile('guide.md')).toBe(true);
    expect(isMarkdownFile('CHANGELOG.MARKDOWN')).toBe(true);
    expect(isMarkdownFile('notes', 'text/markdown')).toBe(true);
    expect(isMarkdownFile('notes.txt', 'text/plain')).toBe(false);
  });

  it('returns CodeMirror language extensions for supported code files', () => {
    expect(getCodeMirrorLanguage('doc.md')).toHaveLength(1);
    expect(getCodeMirrorLanguage('app.tsx')).toHaveLength(1);
    expect(getCodeMirrorLanguage('config.json')).toHaveLength(1);
    expect(getCodeMirrorLanguage('index.html')).toHaveLength(1);
    expect(getCodeMirrorLanguage('styles.css')).toHaveLength(1);
    expect(getCodeMirrorLanguage('script.py')).toHaveLength(1);
    expect(getCodeMirrorLanguage('App.java')).toHaveLength(1);
    expect(getCodeMirrorLanguage('query.sql')).toHaveLength(1);
    expect(getCodeMirrorLanguage('pom.xml')).toHaveLength(1);
    expect(getCodeMirrorLanguage('plain.txt')).toHaveLength(0);
  });
});
