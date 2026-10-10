const OWNER_ID = 245514160;
const EDITOR_ORIGIN = "https://misumiuika626.github.io";
const COOKIE = "__Host-akn20-oauth";
const encoder = new TextEncoder();

function base64url(bytes) {
	return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}
function decode(value) {
	return Uint8Array.from(atob(value.replaceAll("-", "+").replaceAll("_", "/")), (c) => c.charCodeAt(0));
}
async function key(secret) {
	return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
async function sign(value, secret) {
	const body = base64url(encoder.encode(JSON.stringify(value)));
	const signature = await crypto.subtle.sign("HMAC", await key(secret), encoder.encode(body));
	return `${body}.${base64url(new Uint8Array(signature))}`;
}
async function verify(token, secret, purpose) {
	try {
		const parts = token.split(".");
		if (parts.length !== 2) return null;
		const [body, signature] = parts;
		if (!(await crypto.subtle.verify("HMAC", await key(secret), decode(signature), encoder.encode(body)))) return null;
		const value = JSON.parse(new TextDecoder().decode(decode(body)));
		if (value.purpose !== purpose || !Number.isFinite(value.exp) || value.exp <= Date.now()) return null;
		return value;
	} catch { return null; }
}
function random() { return base64url(crypto.getRandomValues(new Uint8Array(32))); }
async function sessionKey(secret) {
	const hash = await crypto.subtle.digest("SHA-256", encoder.encode(`akn20-session:${secret}`));
	return crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["encrypt", "decrypt"]);
}
async function sealSession(value, secret) {
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await sessionKey(secret), encoder.encode(JSON.stringify(value)));
	return `${base64url(iv)}.${base64url(new Uint8Array(ciphertext))}`;
}
async function openSession(token, secret) {
	try {
		const parts = token.split(".");
		if (parts.length !== 2 || decode(parts[0]).length !== 12) return null;
		const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: decode(parts[0]) }, await sessionKey(secret), decode(parts[1]));
		const value = JSON.parse(new TextDecoder().decode(plain));
		return value.purpose === "session" && Number.isFinite(value.exp) && value.exp > Date.now() ? value : null;
	} catch { return null; }
}
function response(body, status = 200, extra = {}) {
	return new Response(body, { status, headers: {
		"Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff",
		...extra,
	} });
}
function cookie(value, maxAge = 600) {
	return `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
function cors() { return { "Access-Control-Allow-Origin": EDITOR_ORIGIN, "Vary": "Origin" }; }

function popup(message) {
	const nonce = random();
	const data = JSON.stringify(message).replaceAll("<", "\\u003c");
	return response(`<!doctype html><html lang="en"><meta charset="utf-8"><title>akn20 sign-in</title><p>Return to the blog to continue. / 请返回博客继续。</p><script nonce="${nonce}">if(window.opener){window.opener.postMessage(${data},${JSON.stringify(EDITOR_ORIGIN)});window.close();}</script></html>`, 200, {
		"Content-Type": "text/html; charset=utf-8", "Set-Cookie": cookie("", 0),
		"Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; frame-ancestors 'none'; base-uri 'none'`,
	});
}

/** Owner-only content API; GitHub tokens remain inside encrypted server sessions. */
export async function handleRequest(request, env, fetcher = fetch) {
	const url = new URL(request.url);
	if (url.pathname === "/health") return response(JSON.stringify({ service: "akn20-auth" }), 200, { "Content-Type": "application/json" });
	if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.SESSION_SECRET || env.SESSION_SECRET.length < 32 || !env.PUBLIC_URL) {
		return response("Authentication is not configured.", 503);
	}
	let publicOrigin;
	try {
		const configured = new URL(env.PUBLIC_URL);
		if (configured.protocol !== "https:" || configured.pathname !== "/" || configured.search || configured.hash || configured.username || configured.password) throw new Error("origin");
		publicOrigin = configured.origin;
	} catch { return response("Invalid authentication configuration.", 503); }
	if (url.origin !== publicOrigin) return response("Invalid authentication host.", 400);

	if (url.pathname === "/session" || url.pathname.startsWith("/content/")) {
		if (request.headers.get("Origin") !== EDITOR_ORIGIN) return response("Forbidden origin.", 403);
		if (request.method === "OPTIONS") return response(null, 204, { ...cors(), "Access-Control-Allow-Methods": "GET, PUT, DELETE", "Access-Control-Allow-Headers": "Authorization, Content-Type" });
		if (url.pathname === "/session" && request.method !== "GET") return response("Method not allowed.", 405, cors());
		const token = request.headers.get("Authorization")?.replace(/^Bearer /, "") ?? "";
		const session = await openSession(token, env.SESSION_SECRET);
		if (!session || session.uid !== OWNER_ID || session.aud !== EDITOR_ORIGIN || session.iss !== publicOrigin) {
			return response("Unauthorized.", 401, cors());
		}
		if (url.pathname.startsWith("/content/")) {
			try {
				return response(JSON.stringify(await handleContent(request, session, fetcher)), 200, { ...cors(), "Content-Type": "application/json" });
			} catch (error) { return response(error.status ? error.message : "Content request failed.", error.status ?? 500, cors()); }
		}
		return response(JSON.stringify({ id: OWNER_ID, login: session.login, expiresAt: session.exp, canEdit: session.canEdit === true }), 200, { ...cors(), "Content-Type": "application/json" });
	}
	if (request.method !== "GET") return response("Method not allowed.", 405);
	if (url.pathname === "/auth") {
		const state = random();
		const verifier = random();
		const challenge = base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(verifier))));
		const pending = await sign({ purpose: "oauth", state, verifier, exp: Date.now() + 600_000 }, env.SESSION_SECRET);
		const target = new URL("https://github.com/login/oauth/authorize");
		target.search = new URLSearchParams({
			client_id: env.GITHUB_CLIENT_ID, redirect_uri: `${publicOrigin}/callback`,
			state, code_challenge: challenge, code_challenge_method: "S256",
			scope: "read:user public_repo", login: "MisumiUika626", allow_signup: "false",
		}).toString();
		return response(null, 302, { Location: target.href, "Set-Cookie": cookie(pending) });
	}
	if (url.pathname === "/callback") {
		const stored = request.headers.get("Cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1) ?? "";
		const pending = await verify(stored, env.SESSION_SECRET, "oauth");
		if (!pending || !url.searchParams.get("state") || pending.state !== url.searchParams.get("state")) return response("Invalid or expired login request.", 400, { "Set-Cookie": cookie("", 0) });
		if (url.searchParams.has("error")) return popup({ type: "akn20-auth", error: "cancelled" });
		const code = url.searchParams.get("code");
		if (!code) return response("Missing authorization code.", 400, { "Set-Cookie": cookie("", 0) });
		try {
			const exchange = await fetcher("https://github.com/login/oauth/access_token", {
				method: "POST", headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
				body: new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code, redirect_uri: `${publicOrigin}/callback`, code_verifier: pending.verifier }),
			});
			if (!exchange.ok) throw new Error("exchange");
			const grant = await exchange.json();
			if (typeof grant.access_token !== "string") throw new Error("grant");
			const identity = await fetcher("https://api.github.com/user", { headers: {
				Authorization: `Bearer ${grant.access_token}`, Accept: "application/vnd.github+json", "User-Agent": "akn20-auth", "X-GitHub-Api-Version": "2022-11-28",
			} });
			if (!identity.ok) throw new Error("identity");
			const user = await identity.json();
			if (user.id !== OWNER_ID) return popup({ type: "akn20-auth", error: "forbidden" });
			const expiresAt = Date.now() + 3_600_000;
			const scopes = (grant.scope ?? "").split(/[ ,]+/);
			const token = await sealSession({ purpose: "session", uid: OWNER_ID, login: user.login, exp: expiresAt, aud: EDITOR_ORIGIN, iss: publicOrigin, github: grant.access_token, canEdit: scopes.includes("public_repo") || scopes.includes("repo") }, env.SESSION_SECRET);
			return popup({ type: "akn20-auth", token, expiresAt });
		} catch { return popup({ type: "akn20-auth", error: "unavailable" }); }
	}
	return response("Not found.", 404);
}

export default {
	fetch(request, env) { return handleRequest(request, env); },
};
import { handleContent } from "./content.mjs";
