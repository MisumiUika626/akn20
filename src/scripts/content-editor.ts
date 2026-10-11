import { parse } from "yaml";
import { authOrigin } from "@/data/auth";
import { importMarkdown } from "./markdown-import";
import { withBase } from "@/utils/path";

export function initContentEditor() {
	const root = document.getElementById("content-editor");
	if (!root) return;
	const status = document.getElementById("editor-status");
	const say = (value: string) => { if (status) status.textContent = value; };
	const form = document.getElementById("article-form") as HTMLFormElement;
	const list = document.getElementById("article-list") as HTMLSelectElement;
	const input = (name: string) => form.elements.namedItem(name) as HTMLInputElement;
	const projectSelect = form.elements.namedItem("projects") as HTMLSelectElement;
	let articlePath = "", articleSha: string | null = null;
	let projectsSha: string | null = null, aboutSha: string | null = null, titleSha: string | null = null;
	let projectValues: Array<Record<string, unknown>> = [];
	let initialized = false;
	let busy = false;
	const buttonDelete = document.getElementById("delete-article") as HTMLButtonElement;
	function toDateTimeInput(value: string | Date = new Date()) {
		const date = value instanceof Date ? value : new Date(value);
		if (Number.isNaN(date.valueOf())) return "";
		const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
		return localDate.toISOString().slice(0, 16);
	}
	function split(content: string) {
		const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
		return { data: match ? parse(match[1]) : {}, body: match ? content.slice(match[0].length).replace(/^\s*\n/, "") : content };
	}
	async function api(path: string, method = "GET", data?: unknown) {
		const token = sessionStorage.getItem("akn20-owner-session");
		if (!token) throw Error("请重新登录 / Please sign in again");
		const res = await fetch(`${authOrigin}/content/${path}`, { method, cache: "no-store", headers: { Authorization: `Bearer ${token}`, ...(data !== undefined && { "Content-Type": "application/json" }) }, ...(data !== undefined && { body: JSON.stringify(data) }) });
		if (!res.ok) throw Error(await res.text());
		return res.json();
	}
	async function run(action: () => Promise<void>, save = false) {
		if (busy) return;
		busy = true;
		root?.querySelectorAll<HTMLButtonElement>("button").forEach((button) => { button.disabled = true; });
		root?.querySelectorAll<HTMLInputElement>("input, textarea, select").forEach((field) => { field.disabled = true; });
		say(save ? "正在保存到 GitHub…" : "正在加载…");
		try { await action(); say(save ? "已保存。网站正在自动更新，可稍后刷新博客查看。" : "已加载。"); }
		catch (error) { say(error instanceof Error ? error.message : "操作失败，请重试。"); }
		finally { busy = false; root?.querySelectorAll<HTMLButtonElement>("button").forEach((button) => { button.disabled = false; }); root?.querySelectorAll<HTMLInputElement>("input, textarea, select").forEach((field) => { field.disabled = false; }); input("slug").disabled = !!articlePath; input("locale").disabled = !!articlePath; buttonDelete.disabled = !articlePath; }
	}
	function newArticle() {
		form.reset(); articlePath = ""; articleSha = null; list.value = "";
		input("slug").disabled = false; input("locale").disabled = false;
		input("locale").value = root?.dataset.locale ?? "zh";
		input("publishDate").value = toDateTimeInput();
		input("category").value = input("locale").value === "zh" ? "笔记" : "Notes";
		buttonDelete.disabled = true;
	}
	function refreshProjectChoices(selected: string[] = []) {
		const wanted = new Set(selected);
		projectSelect.replaceChildren(...projectValues.map((project) => {
			const option = new Option(String(project.name ?? project.id), String(project.id ?? ""));
			option.selected = wanted.has(option.value);
			return option;
		}));
	}
	async function refreshArticles() {
		const result = await api("posts");
		list.replaceChildren(new Option("新建文章 / New article", ""));
		for (const file of result.files) list.add(new Option(file.path.startsWith("src/content/post/zh/") ? `中文 · ${file.name}` : `EN · ${file.name}`, file.path));
		list.value = articlePath;
	}
	list.addEventListener("change", () => { void run(async () => {
		if (!list.value) { newArticle(); return; }
		const file = await api(`post?path=${encodeURIComponent(list.value)}`);
		const { data, body } = split(file.content);
		articlePath = list.value; articleSha = file.sha;
		for (const name of ["title","description","category","translationKey"]) input(name).value = data[name] ?? "";
		input("publishDate").value = toDateTimeInput(String(data.publishDate ?? ""));
		input("tags").value = (data.tags ?? []).join(", "); input("draft").checked = data.draft === true;
		refreshProjectChoices(Array.isArray(data.projects) ? data.projects : []);
		input("body").value = body; input("slug").value = articlePath.split("/").at(-1)?.replace(/\.md$/, "") ?? "";
		input("locale").value = articlePath.includes("/zh/") ? "zh" : "en";
		input("slug").disabled = true; input("locale").disabled = true;
	}); });
	form.addEventListener("submit", (event) => { event.preventDefault(); void run(async () => {
		const path = articlePath || `src/content/post/${input("locale").value === "zh" ? "zh/" : ""}${input("slug").value}.md`;
		const article = { title: input("title").value, description: input("description").value, publishDate: new Date(input("publishDate").value).toISOString(), category: input("category").value, tags: input("tags").value.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean), projects: [...projectSelect.selectedOptions].map((option) => option.value), translationKey: input("translationKey").value, draft: input("draft").checked, body: input("body").value };
		const saved = await api("post", "PUT", { path, sha: articleSha, article });
		articlePath = path; articleSha = saved.sha;
		input("slug").disabled = true; input("locale").disabled = true;
		await refreshArticles();
	}, true); });
	document.getElementById("new-article")?.addEventListener("click", () => { if (!formDirty() || confirm("放弃当前未保存的文章修改？")) newArticle(); });
	function formDirty() { return !!input("title").value || !!input("body").value; }
	const markdownFile = document.getElementById("markdown-file") as HTMLInputElement;
	document.getElementById("import-markdown")?.addEventListener("click", () => { if (!busy) markdownFile.click(); });
	markdownFile.addEventListener("change", async () => {
		const file = markdownFile.files?.[0]; markdownFile.value = "";
		if (!file || busy) return;
		try {
			if (!/\.md$/i.test(file.name)) throw Error("请选择 .md 文件。");
			if (file.size > 400000) throw Error("文件过大，最多支持 400 KB。");
			const token = sessionStorage.getItem("akn20-owner-session");
			const imported = importMarkdown(await file.text(), file.name, input("locale").value, new Date().toISOString());
			if (busy || !token || sessionStorage.getItem("akn20-owner-session") !== token) return;
			if (formDirty() && !confirm("导入为新文章会替换当前编辑表单，未保存的修改会丢失。继续？")) return;
			newArticle();
			for (const name of ["title","slug","locale","description","category","tags","translationKey","body"] as const) input(name).value = imported[name];
			input("publishDate").value = toDateTimeInput(imported.publishDate);
			refreshProjectChoices(imported.projects);
			input("draft").checked = imported.draft;
			say(["已导入为新文章，尚未保存。请检查摘要、文件名等必填项后点击保存。", ...imported.warnings].join(" "));
		} catch (error) { say(error instanceof Error ? error.message : "导入失败，当前内容未修改。"); }
	});
	document.getElementById("refresh-articles")?.addEventListener("click", () => { void run(refreshArticles); });
	buttonDelete.addEventListener("click", () => { if (articlePath && confirm("确定删除这篇文章？删除会同步到 GitHub 和网站。")) void run(async () => { await api("post", "DELETE", { path: articlePath, sha: articleSha }); newArticle(); await refreshArticles(); }, true); });
	const cards = document.getElementById("project-items") as HTMLElement;
	function addProject(value: Record<string, unknown> = {}) {
		const card = document.createElement("div"); card.className = "project-card";
		const desc = (value.desc ?? {}) as Record<string, string>;
		const fields = [["id","项目 ID（英文或数字，保存后不要修改）",value.id],["name","项目名称",value.name],["href","项目链接（https://…）",value.href],["stack","技术栈",value.stack],["en","English description",desc.en],["zh","中文简介",desc.zh],["priority","排序优先级",value.priority ?? 0],["badge","状态（可选）",(value.badge as {label?:string})?.label]];
		for (const [key,label,initial] of fields) {
			const row = document.createElement("label"); row.textContent = String(label);
			const field = document.createElement("input"); field.dataset.field = String(key); field.value = String(initial ?? "");
			if (key === "priority") field.type = "number";
			row.append(field); card.append(row);
		}
		const remove = document.createElement("button"); remove.type = "button"; remove.textContent = "移除项目";
		remove.addEventListener("click", () => { if (confirm("从当前列表移除此项目？点击保存后才会生效。")) card.remove(); });
		card.append(remove); cards.append(card);
	}
	document.getElementById("add-project")?.addEventListener("click", () => addProject());
	document.getElementById("save-projects")?.addEventListener("click", () => { void run(async () => {
		const value = [...cards.children].map((card) => {
			const get = (key: string) => (card.querySelector(`[data-field="${key}"]`) as HTMLInputElement).value;
			return { id: get("id"), name: get("name"), href: get("href"), stack: get("stack"), desc: { en: get("en"), zh: get("zh") }, priority: Number(get("priority")), ...(get("badge") && { badge: { label: get("badge") } }) };
		});
		const saved = await api("projects", "PUT", { sha: projectsSha, value }); projectsSha = saved.sha; projectValues = value; refreshProjectChoices();
	}, true); });
	const aboutLocale = document.getElementById("about-locale") as HTMLSelectElement;
	const about = document.getElementById("about-body") as HTMLTextAreaElement;
	async function loadAbout() { const file = await api(`about?locale=${aboutLocale.value}`); aboutSha = file.sha; about.value = split(file.content).body; }
	aboutLocale.addEventListener("change", () => { void run(loadAbout); });
	document.getElementById("save-about")?.addEventListener("click", () => { void run(async () => { const saved = await api("about", "PUT", { locale: aboutLocale.value, body: about.value, sha: aboutSha }); aboutSha = saved.sha; }, true); });
	const title = document.getElementById("site-title") as HTMLInputElement;
	let avatar: string | null = null;
	const preview = document.getElementById("avatar-preview") as HTMLImageElement;
	const avatarFile = document.getElementById("avatar-file") as HTMLInputElement;
	function showAvatar() { preview.hidden = !avatar; if (avatar) preview.src = avatar.startsWith("data:") ? avatar : withBase(avatar); else preview.removeAttribute("src"); }
	avatarFile.addEventListener("change", () => { const file = avatarFile.files?.[0]; avatarFile.value = ""; if (!file || busy) return; void run(async () => {
		if (!["image/jpeg","image/png","image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) throw Error("请选择 5 MB 以内的 JPG、PNG 或 WebP 图片。");
		const image = await createImageBitmap(file);
		try { const canvas = document.createElement("canvas"); canvas.width = 256; canvas.height = 256; const ctx = canvas.getContext("2d"); if (!ctx) throw Error("当前浏览器不支持图片处理。"); const size = Math.min(image.width, image.height); ctx.fillStyle = "#ffffff"; ctx.fillRect(0,0,256,256); ctx.drawImage(image,(image.width-size)/2,(image.height-size)/2,size,size,0,0,256,256); const result = canvas.toDataURL("image/jpeg", 0.85); if (result.length > 120000) throw Error("图片压缩后仍过大，请换一张图片。"); avatar = result; showAvatar(); } finally { image.close(); }
	}); });
	document.getElementById("remove-avatar")?.addEventListener("click", () => { avatar = null; showAvatar(); say("头像已从预览移除，点击保存后生效。"); });
	document.getElementById("save-settings")?.addEventListener("click", () => { void run(async () => { const saved = await api("settings", "PUT", { value: { title: title.value, avatar }, sha: titleSha }); titleSha = saved.sha; }, true); });
	root.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach((button) => { button.addEventListener("click", () => { root.querySelectorAll<HTMLElement>("[data-panel]").forEach((panel) => { panel.hidden = panel.dataset.panel !== button.dataset.tab; }); }); });
	const updateEditor = () => {
		if (!sessionStorage.getItem("akn20-owner-session")) { root.hidden = true; initialized = false; return; }
		void run(async () => {
			const token = sessionStorage.getItem("akn20-owner-session");
			const response = await fetch(`${authOrigin}/session`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
			if (!response.ok) return;
			const owner = await response.json();
			if (sessionStorage.getItem("akn20-owner-session") !== token) return;
			if (owner.id !== 245514160 || !owner.canEdit) { root.hidden = true; say("请退出后重新登录，授权文章编辑权限。"); return; }
			root.hidden = false;
			if (initialized) return;
			await refreshArticles();
			const projects = await api("projects"); projectsSha = projects.sha; projectValues = projects.value; cards.replaceChildren(); projectValues.forEach(addProject); refreshProjectChoices();
			const settings = await api("settings"); titleSha = settings.sha; title.value = settings.value.title; avatar = settings.value.avatar ?? null; showAvatar();
			aboutLocale.value = root.dataset.locale ?? "zh"; await loadAbout(); newArticle(); initialized = true;
		});
	};
	document.addEventListener("akn20-session-change", updateEditor);
	updateEditor();
}
