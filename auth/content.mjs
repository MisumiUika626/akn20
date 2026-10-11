const REPO = "MisumiUika626/akn20";
const TITLE_PATH = "src/data/site-settings.json";
const PROJECT_PATH = "src/data/projects.json";
const enc = new TextEncoder();
function encode(value) {
	const bytes = enc.encode(value);
	let raw = "";
	for (let i = 0; i < bytes.length; i += 8192) raw += String.fromCharCode(...bytes.subarray(i, i + 8192));
	return btoa(raw);
}
function decode(value) {
	const raw = atob(value.replaceAll("\n", ""));
	const bytes = new Uint8Array(raw.length);
	for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
	return new TextDecoder().decode(bytes);
}
function fail(message, status = 400) { const error = new Error(message); error.status = status; throw error; }
function text(value, label, max, min = 0) {
	if (typeof value !== "string" || value.trim().length < min || value.length > max) fail(`Invalid ${label}`);
	return value;
}
function locale(value) { if (value !== "en" && value !== "zh") fail("Invalid locale"); return value; }
function postPath(value) {
	if (typeof value !== "string" || !/^src\/content\/post\/(?:zh\/)?[a-z0-9][a-z0-9_-]{0,79}\.md$/.test(value)) fail("Invalid article path");
	return value;
}
function postData(data) {
	if (!data || typeof data !== "object") fail("Invalid article");
	if (data.draft !== undefined && typeof data.draft !== "boolean") fail("Invalid draft flag");
	const result = {
		title: text(data.title, "title", 120, 1),
		publishDate: text(data.publishDate, "date", 40, 10),
		description: text(data.description, "description", 160, 10),
		category: text(data.category, "category", 50, 1),
		tags: data.tags,
		projects: data.projects ?? [],
		draft: data.draft === true,
	};
	const published = new Date(result.publishDate);
	if (Number.isNaN(published.valueOf())) fail("Invalid date");
	result.publishDate = published.toISOString();
	if (!Array.isArray(result.tags) || result.tags.length > 30 || result.tags.some((tag) => typeof tag !== "string" || !tag.trim() || tag.length > 50)) fail("Invalid tags");
	if (!Array.isArray(result.projects) || result.projects.length > 20 || new Set(result.projects).size !== result.projects.length || result.projects.some((id) => typeof id !== "string" || !/^[a-z0-9][a-z0-9_-]{0,79}$/.test(id))) fail("Invalid projects");
	if (data.translationKey) result.translationKey = text(data.translationKey, "translation key", 100, 1);
	text(data.body, "body", 100_000);
	return result;
}
export function articleFile(data) {
	const fields = postData(data);
	return `---\n${Object.entries(fields).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join("\n")}\n---\n\n${data.body}\n`;
}
function projectsData(data) {
	if (!Array.isArray(data) || data.length > 100) fail("Invalid projects");
	const ids = new Set();
	return data.map((p) => {
		if (!p || typeof p !== "object" || Array.isArray(p)) fail("Invalid project");
		const id = text(p.id, "project ID", 80, 1);
		if (!/^[a-z0-9][a-z0-9_-]{0,79}$/.test(id) || ids.has(id)) fail("Invalid project ID");
		ids.add(id);
		const href = text(p.href, "project link", 2048, 1);
		try { const url = new URL(href); if (!["https:","http:"].includes(url.protocol) || url.username || url.password) fail("Invalid project link"); } catch { fail("Invalid project link"); }
		const project = { id, name: text(p.name, "project name", 120, 1), href, stack: text(p.stack, "stack", 200), desc: { en: text(p.desc?.en, "English project description", 1000), zh: text(p.desc?.zh, "Chinese project description", 1000) }, priority: p.priority };
		if (!Number.isFinite(p.priority) || Math.abs(p.priority) > 10000) fail("Invalid priority");
		if (p.badge?.label) project.badge = { label: text(p.badge.label, "status", 50, 1) };
		return project;
	});
}

/** No arbitrary repo, branch, file path, or proxy URL is accepted from a client. */
export async function handleContent(request, session, fetcher = fetch) {
	const url = new URL(request.url);
	async function github(path, options = {}) {
		const res = await fetcher(`https://api.github.com/repos/${REPO}/${path}`, { ...options, headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${session.github}`, "User-Agent": "akn20-editor", "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" }, signal: AbortSignal.timeout(15000) });
		if (res.status === 404 && !options.method) return null;
		if (!res.ok) fail(res.status === 409 || res.status === 422 ? "Content changed or already exists; reload before saving." : "GitHub request failed. Check authorization and retry.", res.status === 409 || res.status === 422 ? 409 : 502);
		return res.json();
	}
	async function read(path) { const file = await github(`contents/${path}?ref=main`); return file ? { sha: file.sha, content: decode(file.content) } : { sha: null, content: "" }; }
	async function save(path, content, sha) {
		if (sha !== null && (typeof sha !== "string" || !/^[a-f0-9]{40}$/.test(sha))) fail("Invalid revision");
		const result = await github(`contents/${path}`, { method: "PUT", body: JSON.stringify({ message: `content: update ${path}`, branch: "main", content: encode(content), ...(sha && { sha }) }) });
		return { sha: result.content.sha, commit: result.commit.sha };
	}
	if (!session.github || !session.canEdit) fail("Sign in again and authorize content editing.", 403);
	if (request.method === "GET") {
		if (url.pathname === "/content/posts") {
			const files = [];
			for (const dir of ["src/content/post", "src/content/post/zh"]) {
				const entries = await github(`contents/${dir}?ref=main`);
				if (Array.isArray(entries)) files.push(...entries.filter((entry) => entry.type === "file" && entry.name.endsWith(".md")).map(({ path, name, sha }) => ({ path, name, sha })));
			}
			return { files };
		}
		if (url.pathname === "/content/post") return read(postPath(url.searchParams.get("path")));
		if (url.pathname === "/content/about") return read(`src/content/page/${locale(url.searchParams.get("locale")) === "zh" ? "zh/" : ""}about.md`);
		if (url.pathname === "/content/projects") { const file = await read(PROJECT_PATH); return { sha: file.sha, value: JSON.parse(file.content || "[]") }; }
		if (url.pathname === "/content/settings") { const file = await read(TITLE_PATH); return { sha: file.sha, value: JSON.parse(file.content || '{"title":"akn20"}') }; }
		fail("Not found", 404);
	}
	if (!["PUT", "DELETE"].includes(request.method)) fail("Method not allowed", 405);
	const raw = await request.text();
	if (raw.length > 400_000) fail("Content too large", 413);
	let data;
	try { data = JSON.parse(raw); } catch { fail("Invalid JSON"); }
	if (!data || typeof data !== "object") fail("Invalid content");
	if (request.method === "DELETE") {
		if (url.pathname !== "/content/post") fail("Deletion is limited to articles", 403);
		const path = postPath(data.path);
		if (typeof data.sha !== "string" || !/^[a-f0-9]{40}$/.test(data.sha)) fail("Invalid revision");
		await github(`contents/${path}`, { method: "DELETE", body: JSON.stringify({ message: `content: delete ${path}`, branch: "main", sha: data.sha }) });
		return { deleted: true };
	}
	if (url.pathname === "/content/post") {
		const path = postPath(data.path);
		const content = articleFile(data.article);
		if (data.article.translationKey && data.article.draft !== true) {
			const dir = path.slice(0, path.lastIndexOf("/"));
			const entries = await github(`contents/${dir}?ref=main`);
			for (const entry of Array.isArray(entries) ? entries : []) {
				if (entry.type !== "file" || !entry.name.endsWith(".md") || entry.path === path) continue;
				const sibling = await read(postPath(entry.path));
				const metadata = sibling.content.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
				if (/^draft:\s*true\s*$/m.test(metadata)) continue;
				const match = metadata.match(/^translationKey:\s*("(?:[^"\\]|\\.)*"|'(?:[^']|'')*'|[^#\r\n]+)\s*$/m);
				let value = match?.[1]?.trim();
				if (value?.startsWith('"')) { try { value = JSON.parse(value); } catch { value = undefined; } }
				else if (value?.startsWith("'")) value = value.slice(1,-1).replaceAll("''", "'");
				if (value === data.article.translationKey) fail("Translation key already used by another published article in this language.");
			}
		}
		return save(path, content, data.sha);
	}
	if (url.pathname === "/content/about") {
		const language = locale(data.locale);
		return save(`src/content/page/${language === "zh" ? "zh/" : ""}about.md`, `---\ntitle: ${JSON.stringify(language === "zh" ? "关于" : "About")}\n---\n\n${text(data.body, "About body", 100_000)}\n`, data.sha);
	}
	if (url.pathname === "/content/projects") return save(PROJECT_PATH, `${JSON.stringify(projectsData(data.value), null, 2)}\n`, data.sha);
	if (url.pathname === "/content/settings") {
		const title = text(data.value?.title, "site title", 60, 1);
		let avatar = data.value.avatar;
		if (avatar === undefined) { const current = await read(TITLE_PATH); avatar = JSON.parse(current.content || "{}").avatar ?? null; }
		if (avatar !== null && avatar !== "/avatar.webp") {
			if (typeof avatar !== "string" || avatar.length > 120000 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(avatar)) fail("Invalid avatar: use a compressed JPEG image.");
			let bytes; try { bytes = atob(avatar.split(",")[1]); } catch { fail("Invalid avatar"); }
			if (bytes.length < 4 || bytes.charCodeAt(0) !== 255 || bytes.charCodeAt(1) !== 216 || bytes.charCodeAt(bytes.length - 2) !== 255 || bytes.charCodeAt(bytes.length - 1) !== 217) fail("Invalid avatar image");
		}
		return save(TITLE_PATH, `${JSON.stringify({ title, avatar }, null, 2)}\n`, data.sha);
	}
	fail("Not found", 404);
}
