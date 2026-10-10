import assert from 'node:assert/strict';
import test from 'node:test';
test('imports metadata and preserves Markdown body', async () => {
 const { importMarkdown } = await import('../src/scripts/markdown-import.ts');
 const result = importMarkdown('---\ntitle: 测试\ndate: 2026-10-11\ntags: [算法, Python]\nlang: en\n---\n# Body\n![image](./image.png)', 'Example.md', 'zh', '2026-10-10');
 assert.equal(result.title, '测试'); assert.equal(result.publishDate, '2026-10-11');
 assert.equal(result.slug, 'example'); assert.equal(result.locale, 'en');
 assert.equal(result.tags, '算法, Python'); assert.match(result.body, /# Body/);
 assert.ok(result.warnings.some(value => value.includes('图片')));
});
test('plain Markdown derives heading and handles Chinese filenames', async () => {
 const { importMarkdown } = await import('../src/scripts/markdown-import.ts');
 const result = importMarkdown('\uFEFF# 我的笔记\r\n\r\n正文', '我的笔记.md', 'zh', '2026-10-11');
 assert.equal(result.title, '我的笔记'); assert.equal(result.slug, '');
 assert.equal(result.publishDate, '2026-10-11'); assert.equal(result.category, '笔记');
 assert.match(result.body, /正文/); assert.equal(result.draft, true);
});
test('rejects invalid metadata and oversized body without a partial result', async () => {
 const { importMarkdown } = await import('../src/scripts/markdown-import.ts');
 assert.throws(() => importMarkdown('---\n- item\n---\nbody', 'a.md', 'zh', '2026-10-11'), /文件头/);
 assert.throws(() => importMarkdown('x'.repeat(100001), 'a.md', 'zh', '2026-10-11'), /过长/);
});
