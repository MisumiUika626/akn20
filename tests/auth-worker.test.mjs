import assert from "node:assert/strict";
import test from "node:test";
import worker, { handleRequest } from "../auth/worker.mjs";

const origin = "https://akn20-auth.example.workers.dev";
const editor = "https://misumiuika626.github.io";
const env = { PUBLIC_URL: origin, GITHUB_CLIENT_ID: "test-client", GITHUB_CLIENT_SECRET: "test-client-secret", SESSION_SECRET: "test-session-secret-with-at-least-32-characters" };
async function begin() {
	const res = await handleRequest(new Request(`${origin}/auth`), env);
	return { res, target: new URL(res.headers.get("Location")), cookie: res.headers.get("Set-Cookie").split(";")[0] };
}
async function callback(id = 245514160) {
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
			return Response.json({ access_token: "github-token-must-never-reach-client" });
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
	assert.equal(target.searchParams.get("scope"), "read:user");
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
