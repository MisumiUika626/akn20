import { parse } from "yaml";

export function importMarkdown(content: string, filename: string, locale: string, today: string) {
 const clean = content.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
 const match = clean.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
 if (clean.startsWith("---\n") && !match) throw Error("文件头缺少结束的 ---。");
 const data = match ? parse(match[1]) : {};
 if (!data || typeof data !== "object" || Array.isArray(data)) throw Error("文件头必须是 YAML 字段对象。");
 const body = match ? clean.slice(match[0].length) : clean;
 if (body.length > 100000) throw Error("正文过长，最多支持 100000 字符。");
 const str = (value: unknown) => typeof value === "string" || typeof value === "number" ? String(value) : "";
 const language = data.locale ?? data.lang ?? data.language;
 const selectedLocale = language === "en" || language === "zh" ? language : locale;
 const stem = filename.replace(/\.md$/i, "");
 const slug = stem.toLowerCase().replace(/\s+/g, "-");
 const warnings: string[] = [];
 if (/!\[[^\]]*\]\(\s*(?!https?:|data:|\/\/|#)[^\s)]+/i.test(body) || /<img\b/i.test(body) || /!\[[^\]]*\]\[[^\]]*\]/.test(body)) warnings.push("文章包含图片；本地图片不会自动上传，请检查图片链接。");
 const supported = new Set(["title","description","publishDate","date","category","categories","tags","translationKey","draft","locale","lang","language"]);
 const extras = Object.keys(data).filter(key => !supported.has(key));
 if (extras.length) warnings.push(`未导入额外文件头字段：${extras.join("、")}。原文件不会修改。`);
 return {
  title: str(data.title) || body.match(/^#\s+(.+)$/m)?.[1]?.trim() || stem,
  slug: /^[a-z0-9][a-z0-9_-]{0,79}$/.test(slug) ? slug : "",
  locale: selectedLocale,
  description: str(data.description),
  publishDate: str(data.publishDate ?? data.date).slice(0,10) || today,
  category: str(data.category) || str(Array.isArray(data.categories) ? data.categories[0] : data.categories) || (selectedLocale === "zh" ? "笔记" : "Notes"),
  tags: Array.isArray(data.tags) ? data.tags.map(str).filter(Boolean).join(", ") : str(data.tags),
  translationKey: str(data.translationKey),
  draft: typeof data.draft === "boolean" ? data.draft : true,
  body, warnings,
 };
}
