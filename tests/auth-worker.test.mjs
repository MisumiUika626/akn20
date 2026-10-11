import assert from "node:assert/strict";
import test from "node:test";
import worker, { handleRequest } from "../auth/worker.mjs";

const origin = "https://akn20-auth.example.workers.dev";
const editor = "https://misumiuika626.github.io";
const env = { PUBLIC_URL: origin, GITHUB_CLIENT_ID: "test-client", GITHUB_CLIENT_SECRET: "test-client-secret", SESSION_SECRET: "test-session-secret-with-at-least-32-characters" };
test("settings save validates avatar and preserves it for older title-only clients", async () => {
 const { message } = await callback();
 const headers = { Origin: editor, Authorization: `Bearer ${message.token}` };
 let stored = { title: "akn20", avatar: "/avatar.webp" };
 const fetcher = async (_url, options) => {
  if (!options.method) return Response.json({ sha: "a".repeat(40), content: Buffer.from(JSON.stringify(stored)).toString("base64") });
  stored = JSON.parse(Buffer.from(JSON.parse(options.body).content, "base64").toString());
  return Response.json({ content: { sha: "b".repeat(40) }, commit: { sha: "c".repeat(40) } });
 };
 const put = value => handleRequest(new Request(`${origin}/content/settings`, { method: "PUT", headers, body: JSON.stringify({ sha: "a".repeat(40), value }) }), env, fetcher);
 assert.equal((await put({title: "New"})).status, 200);
 assert.equal(stored.avatar, "/avatar.webp");
 assert.equal((await put({title: "New", avatar: "data:image/svg+xml;base64,PHN2Zz4="})).status, 400);
 assert.equal((await put({title: "New", avatar: "data:image/jpeg;base64,aGVsbG8="})).status, 400);
 assert.equal((await put({title: "New", avatar: null})).status, 200);
 assert.equal(stored.avatar, null);
});
async function begin() {
	const res = await handleRequest(new Request(`${origin}/auth`), env);
	return { res, target: new URL(res.headers.get("Location")), cookie: res.headers.get("Set-Cookie").split(";")[0] };
}
async function callback(id = 245514160, scope = "read:user,public_repo") {
	const auth = await begin();
	let calls = 0;
	const fetcher = async (url, options) => {
		calls++;
		if (url.endsWith("access_token")) {
			assert.equal(options.body.get("redirect_uri"), `${origin}/callback`);
			assert.ok(options.body.get("code_verifier").length >= 43);
			const verifier = options.body.get("code_verifier");
			const challenge = Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))).toString("base64url");
			assert.equal(challenge, auth.target.searchParams.get("code_challenge"));
			return Response.json({ access_token: "github-token-must-never-reach-client", scope });
		}
		assert.equal(url, "https://api.github.com/user");
		return Response.json({ id, login: "MisumiUika626" });
	};
	const res = await handleRequest(new Request(`${origin}/callback?code=test-code&state=${auth.target.searchParams.get("state")}`, { headers: { Cookie: auth.cookie } }), env, fetcher);
	const html = await res.text();
	const message = JSON.parse(html.match(/postMessage\((\{.*?\}),/s)[1]);
	return { res, html, message, calls };
}

test("unconfigured login fails closed and never makes an OAuth request", async () => {
	assert.equal((await handleRequest(new Request(`${origin}/auth`), {})).status, 503);
	assert.equal((await worker.fetch(new Request(`${origin}/health`), {}, { waitUntil() {} })).status, 200);
});

test("OAuth uses secure state cookie, PKCE, a fixed callback and identity-only scope", async () => {
	const { res, target } = await begin();
	assert.equal(res.status, 302);
	assert.equal(target.origin, "https://github.com");
	assert.equal(target.searchParams.get("scope"), "read:user public_repo");
	assert.equal(target.searchParams.get("code_challenge_method"), "S256");
	assert.equal(target.searchParams.get("code_challenge").length, 43);
	assert.match(res.headers.get("Set-Cookie"), /HttpOnly; Secure; SameSite=Lax; Max-Age=600/);
});

test("missing, mismatched and tampered OAuth state is rejected before token exchange", async () => {
	const auth = await begin();
	for (const [state, cookie] of [["", auth.cookie], ["wrong", auth.cookie], [auth.target.searchParams.get("state"), `${auth.cookie}x`]]) {
		const result = await handleRequest(new Request(`${origin}/callback?code=test-code&state=${state}`, { headers: { Cookie: cookie } }), env, () => { throw new Error("must not call GitHub"); });
		assert.equal(result.status, 400);
	}
});

test("owner receives only a signed local session, not a GitHub access token", async () => {
	const { res, html, message, calls } = await callback();
	assert.equal(calls, 2);
	assert.ok(message.token);
	assert.doesNotMatch(html, /github-token-must-never-reach-client|test-client-secret/);
	assert.match(html, /https:\/\/misumiuika626.github.io/);
	assert.match(res.headers.get("Content-Security-Policy"), /frame-ancestors 'none'/);
	const session = await handleRequest(new Request(`${origin}/session`, { headers: { Origin: editor, Authorization: `Bearer ${message.token}` } }), env);
	assert.equal(session.status, 200);
	assert.equal((await session.json()).id, 245514160);
});

test("same displayed username with a different immutable ID cannot sign in", async () => {
	const { message } = await callback(999);
	assert.equal(message.error, "forbidden");
	assert.equal(message.token, undefined);
});

test("session endpoint rejects anonymous, forged and cross-origin requests", async () => {
	const { message } = await callback();
	for (const token of ["", `${message.token}x`, "fake.session"]) {
		assert.equal((await handleRequest(new Request(`${origin}/session`, { headers: { Origin: editor, Authorization: `Bearer ${token}` } }), env)).status, 401);
	}
	assert.equal((await handleRequest(new Request(`${origin}/session`, { headers: { Origin: "https://attacker.example", Authorization: `Bearer ${message.token}` } }), env)).status, 403);
	assert.equal((await handleRequest(new Request(`${origin}/session`, { method: "POST", headers: { Origin: editor } }), env)).status, 405);
});

test("signed sessions expire and cannot cross signing keys", async () => {
	const { message } = await callback();
	const request = new Request(`${origin}/session`, { headers: { Origin: editor, Authorization: `Bearer ${message.token}` } });
	assert.equal((await handleRequest(request, { ...env, SESSION_SECRET: "different-test-secret-of-more-than-32-characters" })).status, 401);
	const now = Date.now;
	try {
		Date.now = () => message.expiresAt + 1;
		assert.equal((await handleRequest(request, env)).status, 401);
	} finally { Date.now = now; }
});

test("expired OAuth cookies cannot be exchanged", async () => {
	const auth = await begin();
	const now = Date.now;
	try {
		const expired = now() + 601_000;
		Date.now = () => expired;
		const res = await handleRequest(new Request(`${origin}/callback?code=test&state=${auth.target.searchParams.get("state")}`, { headers: { Cookie: auth.cookie } }), env);
		assert.equal(res.status, 400);
	} finally { Date.now = now; }
});

test("editing requires a fresh repository-write grant", async () => {
	const { message } = await callback(245514160, "read:user");
	let called = false;
	const result = await handleRequest(new Request(`${origin}/content/settings`, { headers: { Origin: editor, Authorization: `Bearer ${message.token}` } }), env, () => { called = true; });
	assert.equal(result.status, 403);
	assert.equal(called, false);
});

test("content API rejects path traversal and workflow edits before GitHub is called", async () => {
	const { message } = await callback();
	for (const path of [".github/workflows/deploy.yml", "src/content/post/../../site.config.ts", "src/content/post/zh/../wrong.md", "src/content/post/a.js", "src/content/post/%2e%2e/secret.md"]) {
		let called = false;
		const result = await handleRequest(new Request(`${origin}/content/post`, { method: "PUT", headers: { Origin: editor, Authorization: `Bearer ${message.token}` }, body: JSON.stringify({ path, sha: null }) }), env, () => { called = true; });
		assert.equal(result.status, 400);
		assert.equal(called, false);
	}
});

test("article creation writes timestamps and project links to UTF-8 Markdown only in the fixed content path", async () => {
	const { message } = await callback();
	let payload;
	const result = await handleRequest(new Request(`${origin}/content/post`, { method: "PUT", headers: { Origin: editor, Authorization: `Bearer ${message.token}` }, body: JSON.stringify({ path: "src/content/post/zh/test-note.md", sha: null, repo: "attacker/repo", article: { title: "标题", description: "这是用于验证中文文章写入的摘要。", category: "笔记", publishDate: "2026-10-10T09:18:05.000Z", tags: ["测试"], projects: ["bloomingtensor"], body: "正文内容", draft: true } }) }), env, async (url, options) => {
		assert.equal(url, "https://api.github.com/repos/MisumiUika626/akn20/contents/src/content/post/zh/test-note.md");
		assert.equal(options.method, "PUT");
		assert.equal(options.headers.Authorization, "Bearer github-token-must-never-reach-client");
		payload = JSON.parse(options.body);
		return Response.json({ content: { sha: "a".repeat(40) }, commit: { sha: "b".repeat(40) } });
	});
	assert.equal(result.status, 200);
	assert.equal(payload.branch, "main");
	const file = Buffer.from(payload.content, "base64").toString("utf8");
	assert.match(file, /title: "标题"/);
	assert.match(file, /draft: true/);
	assert.match(file, /publishDate: "2026-10-10T09:18:05.000Z"/);
	assert.match(file, /projects: \["bloomingtensor"\]/);
	assert.match(file, /正文内容/);
});

test("invalid content and optimistic-concurrency conflicts do not overwrite files", async () => {
	const { message } = await callback();
	const headers = { Origin: editor, Authorization: `Bearer ${message.token}` };
	assert.equal((await handleRequest(new Request(`${origin}/content/settings`, { method: "PUT", headers, body: JSON.stringify({ sha: "a".repeat(40), value: { title: "" } }) }), env)).status, 400);
	const conflict = await handleRequest(new Request(`${origin}/content/settings`, { method: "PUT", headers, body: JSON.stringify({ sha: "a".repeat(40), value: { title: "New name" } }) }), env, async () => Response.json({}, { status: 409 }));
	assert.equal(conflict.status, 409);
});

test("project links must be web URLs and deleting settings is forbidden", async () => {
	const { message } = await callback();
	const headers = { Origin: editor, Authorization: `Bearer ${message.token}` };
	const result = await handleRequest(new Request(`${origin}/content/projects`, { method: "PUT", headers, body: JSON.stringify({ sha: null, value: [{ name: "bad", href: "javascript:alert(1)", stack: "", desc: { en: "", zh: "" }, priority: 0 }] }) }), env);
	assert.equal(result.status, 400);
	assert.equal((await handleRequest(new Request(`${origin}/content/settings`, { method: "DELETE", headers, body: JSON.stringify({ sha: "a".repeat(40) }) }), env)).status, 403);
});

test("project IDs are stable, unique and safe for article associations", async () => {
	const { message } = await callback();
	const headers = { Origin: editor, Authorization: `Bearer ${message.token}` };
	const project = { id: "bloomingtensor", name: "BloomingTensor", href: "https://github.com/example/project", stack: "Python", desc: { en: "", zh: "" }, priority: 1 };
	const request = (value) => new Request(`${origin}/content/projects`, { method: "PUT", headers, body: JSON.stringify({ sha: null, value }) });
	assert.equal((await handleRequest(request([{ ...project, id: "Bad ID" }]), env)).status, 400);
	assert.equal((await handleRequest(request([project, project]), env)).status, 400);
});

test("duplicate published translation keys are rejected before committing", async () => {
	const { message } = await callback();
	let writes = 0;
	const result = await handleRequest(new Request(`${origin}/content/post`, { method: "PUT", headers: { Origin: editor, Authorization: `Bearer ${message.token}` }, body: JSON.stringify({ path: "src/content/post/zh/new.md", sha: null, article: { title: "New", description: "A sufficiently long description.", publishDate: "2026-10-10", category: "Notes", tags: [], body: "Body", translationKey: "existing-key" } }) }), env, async (url, options) => {
		if (options.method) { writes++; return Response.json({}); }
		if (url.includes("existing.md")) return Response.json({ sha: "a".repeat(40), content: Buffer.from('---\ntranslationKey: "existing-key"\ndraft: false\n---\n').toString("base64") });
		return Response.json([{ type: "file", name: "existing.md", path: "src/content/post/zh/existing.md" }]);
	});
	assert.equal(result.status, 400);
	assert.equal(writes, 0);
});
