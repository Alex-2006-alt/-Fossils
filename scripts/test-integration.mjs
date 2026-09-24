import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runDir = path.join(root, ".test-data", "run-" + Date.now());
fs.mkdirSync(runDir, { recursive: true });
const origin = "http://localhost:3101";
const env = {
  ...process.env,
  DATABASE_URL: "file:" + path.join(runDir, "test.db").replaceAll("\\", "/"),
  PRIVATE_UPLOAD_DIR: path.join(runDir, "uploads"),
  STORAGE_PROVIDER: "local",
  AUTH_SECRET: randomBytes(32).toString("hex"),
  AUTH_TRUST_HOST: "true",
  NEXTAUTH_URL: origin,
  APP_URL: origin,
  NODE_ENV: "production",
  WORKER_ONCE: "true",
};
function run(file, args = []) {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [file, ...args], {
      cwd: root,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    p.stdout.on("data", (b) => (out += b));
    p.stderr.on("data", (b) => (out += b));
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve(out) : reject(Error(out))));
  });
}
await run("scripts/prepare-db.mjs");
const server = spawn(
  process.execPath,
  [
    path.join(root, "frontend/node_modules/next/dist/bin/next"),
    "start",
    "-p",
    "3101",
  ],
  { cwd: path.join(root, "frontend"), env, stdio: ["ignore", "pipe", "pipe"] },
);
let log = "";
server.stdout.on("data", (b) => (log += b));
server.stderr.on("data", (b) => (log += b));
const password = "Test-only-" + randomBytes(12).toString("hex");
let passed = 0;
async function check(name, fn) {
  await fn();
  passed++;
  console.log("PASS", name);
}
function client() {
  const jar = new Map();
  return {
    async send(route, { method = "GET", body, headers = {} } = {}) {
      const h = {
        ...headers,
        Origin: origin,
        Cookie: [...jar].map(([k, v]) => k + "=" + v).join("; "),
      };
      if (
        body !== undefined &&
        !(body instanceof FormData) &&
        !(body instanceof URLSearchParams)
      ) {
        h["Content-Type"] = "application/json";
        body = JSON.stringify(body);
      }
      const r = await fetch(origin + route, {
        method,
        body,
        headers: h,
        redirect: "manual",
      });
      for (const value of r.headers.getSetCookie()) {
        const pair = value.split(";")[0],
          i = pair.indexOf("=");
        jar.set(pair.slice(0, i), pair.slice(i + 1));
      }
      return r;
    },
    async login(email) {
      const csrf = await (await this.send("/api/auth/csrf")).json();
      const r = await this.send("/api/auth/callback/credentials", {
        method: "POST",
        body: new URLSearchParams({
          csrfToken: csrf.csrfToken,
          email,
          password,
          callbackUrl: origin + "/home",
        }),
        headers: { "X-Auth-Return-Redirect": "1" },
      });
      assert.equal(r.status, 200);
      const session = await (await this.send("/api/auth/session")).json();
      assert.ok(session.user?.id, "Login must establish a session");
      return session.user;
    },
  };
}
const anonymous = client(),
  a = client(),
  b = client(),
  viewer = client();
let ownerA, ownerB, photoId, albumId, inviteToken, treeId;
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw Error(log);
    try {
      if ((await fetch(origin + "/api/auth/csrf")).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  assert.ok(ready, "Server must start");
  await check(
    "Create two independent families and authenticated sessions",
    async () => {
      for (const [email, name] of [
        ["a@example.test", "Family A"],
        ["b@example.test", "Family B"],
      ]) {
        const r = await anonymous.send("/api/auth/signup", {
          method: "PUT",
          body: { name: "Owner", email, password, familyName: name },
        });
        assert.equal(r.status, 201, await r.text());
      }
      ownerA = await a.login("a@example.test");
      ownerB = await b.login("b@example.test");
    },
  );
  await check(
    "Private media rejects anonymous reads and legacy public paths",
    async () => {
      assert.equal(
        (await anonymous.send("/api/media?key=originals/guess.jpg")).status,
        401,
      );
      assert.equal((await anonymous.send("/uploads/guess.jpg")).status, 404);
    },
  );
  await check("Mutations reject a foreign origin", async () => {
    const r = await fetch(origin + "/api/auth/signup", {
      method: "PUT",
      headers: {
        Origin: "https://evil.example",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    assert.equal(r.status, 403);
  });
  await check("Spoofed image is rejected", async () => {
    const form = new FormData();
    form.append(
      "files",
      new Blob(["not an image"], { type: "image/jpeg" }),
      "fake.jpg",
    );
    assert.equal(
      (await a.send("/api/photos", { method: "POST", body: form })).status,
      400,
    );
  });
  await check(
    "Upload commits durable work; worker produces protected previews",
    async () => {
      const png = await sharp({
        create: { width: 64, height: 48, channels: 3, background: "#e69b52" },
      })
        .png()
        .toBuffer();
      const form = new FormData();
      form.append(
        "files",
        new Blob([png], { type: "image/png" }),
        "memory.png",
      );
      const r = await a.send("/api/photos", { method: "POST", body: form });
      assert.equal(r.status, 201);
      photoId = (await r.json()).uploaded[0].id;
      await run("node_modules/tsx/dist/cli.mjs", ["workers/src/index.ts"]);
      const detail = await (await a.send("/api/photos/" + photoId)).json();
      assert.equal(detail.processingStatus, "READY");
      assert.equal(detail.width, 64);
      assert.equal((await a.send(detail.thumbUrl)).status, 200);
      assert.equal((await b.send(detail.thumbUrl)).status, 404);
      assert.equal((await b.send("/api/photos/" + photoId)).status, 404);
      assert.equal(
        (
          await b.send("/api/photos/" + photoId, {
            method: "PATCH",
            body: { placeName: "stolen" },
          })
        ).status,
        404,
      );
    },
  );
  await check(
    "Favorites, albums and metadata persist and reject foreign references",
    async () => {
      assert.equal(
        (
          await a.send("/api/photos/" + photoId + "/favorite", {
            method: "POST",
          })
        ).status,
        200,
      );
      assert.equal(
        (await (await a.send("/api/photos?favorite=true")).json()).items.length,
        1,
      );
      const r = await a.send("/api/albums", {
        method: "POST",
        body: { title: "Summer", photoIds: [photoId] },
      });
      assert.equal(r.status, 201);
      albumId = (await r.json()).id;
      assert.equal(
        (
          await b.send("/api/albums", {
            method: "POST",
            body: { title: "Foreign", photoIds: [photoId] },
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await b.send("/api/albums/" + albumId, {
            method: "PATCH",
            body: { title: "No" },
          })
        ).status,
        404,
      );
      assert.equal(
        (
          await a.send("/api/albums/" + albumId, {
            method: "PATCH",
            body: { title: "Our Summer", coverMediaId: photoId },
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await a.send("/api/photos/" + photoId, {
            method: "PATCH",
            body: { placeName: "Kolkata" },
          })
        ).status,
        200,
      );
      assert.equal(
        (await (await a.send("/api/places")).json()).items[0].placeName,
        "Kolkata",
      );
    },
  );
  await check(
    "Invitation tokens are single use under concurrent redemption",
    async () => {
      const r = await a.send("/api/invitations", {
        method: "POST",
        body: { role: "VIEWER" },
      });
      assert.equal(r.status, 201);
      inviteToken = (await r.json()).token;
      const results = await Promise.all(
        ["v1@example.test", "v2@example.test"].map((email) =>
          anonymous.send("/api/auth/signup", {
            method: "POST",
            body: { name: "Viewer", email, password, inviteCode: inviteToken },
          }),
        ),
      );
      assert.equal(results.filter((r) => r.status === 201).length, 1);
      const winner =
        results[0].status === 201 ? "v1@example.test" : "v2@example.test";
      await viewer.login(winner);
      const list = await (await a.send("/api/invitations")).json();
      assert.equal(list.items[0].token, undefined);
    },
  );
  await check(
    "Viewer cannot mutate shared collections or trigger generation",
    async () => {
      assert.equal(
        (
          await viewer.send("/api/albums", {
            method: "POST",
            body: { title: "No" },
          })
        ).status,
        403,
      );
      assert.equal(
        (await viewer.send("/api/memories/generate", { method: "POST" }))
          .status,
        403,
      );
      assert.equal(
        (await viewer.send("/api/photos/" + photoId, { method: "DELETE" }))
          .status,
        403,
      );
      assert.equal(
        (
          await viewer.send("/api/photos/" + photoId + "/favorite", {
            method: "POST",
          })
        ).status,
        200,
      );
    },
  );
  await check("Tree rejects cycles and foreign-family parents", async () => {
    const r = await a.send("/api/family/tree", {
      method: "POST",
      body: { displayName: "Parent", relationship: "PARENT" },
    });
    assert.equal(r.status, 200);
    treeId = (await r.json()).id;
    const c = await (
      await a.send("/api/family/tree", {
        method: "POST",
        body: {
          displayName: "Child",
          relationship: "CHILD",
          parentIds: [treeId],
        },
      })
    ).json();
    assert.equal(
      (
        await a.send("/api/family/tree", {
          method: "POST",
          body: {
            id: treeId,
            displayName: "Parent",
            relationship: "PARENT",
            parentIds: [c.id],
          },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await b.send("/api/family/tree", {
          method: "POST",
          body: {
            displayName: "Other",
            relationship: "CHILD",
            parentIds: [treeId],
          },
        })
      ).status,
      400,
    );
  });
  await check(
    "Deleted media disappears from lists, search, places, albums and protected delivery",
    async () => {
      const detail = await (await a.send("/api/photos/" + photoId)).json();
      assert.equal(
        (await a.send("/api/photos/" + photoId, { method: "DELETE" })).status,
        200,
      );
      assert.equal((await a.send(detail.thumbUrl)).status, 404);
      assert.equal(
        (await (await a.send("/api/photos")).json()).items.length,
        0,
      );
      assert.equal(
        (await (await a.send("/api/search?q=memory")).json()).photos.length,
        0,
      );
      assert.equal(
        (await (await a.send("/api/places")).json()).items.length,
        0,
      );
      assert.equal(
        (await (await a.send("/api/albums")).json()).items[0].photoCount,
        0,
      );
      assert.equal(
        (
          await a.send("/api/photos/" + photoId, {
            method: "PATCH",
            body: { restore: true },
          })
        ).status,
        200,
      );
      assert.equal((await a.send(detail.thumbUrl)).status, 200);
    },
  );
  await check("Member removal revokes an existing session", async () => {
    const members = (await (await a.send("/api/family/members")).json()).items;
    const member = members.find((m) => m.role === "VIEWER");
    assert.ok(member);
    assert.equal(
      (
        await a.send("/api/family/members", {
          method: "PATCH",
          body: { userId: member.id, remove: true },
        })
      ).status,
      200,
    );
    assert.equal((await viewer.send("/api/photos")).status, 401);
  });
  await check("Security response headers and session revocation", async () => {
    const r = await a.send("/home");
    assert.equal(r.status, 200);
    assert.ok(
      r.headers
        .get("content-security-policy")
        ?.includes("frame-ancestors 'none'"),
    );
    assert.equal(
      (
        await a.send("/api/account", {
          method: "PATCH",
          body: { revokeSessions: true },
        })
      ).status,
      200,
    );
    assert.equal((await a.send("/api/photos")).status, 401);
  });
  console.log(
    passed +
      " integration checks passed. Isolated fixture retained at " +
      runDir,
  );
} catch (error) {
  console.error(log.slice(-6000));
  throw error;
} finally {
  server.kill();
  await Promise.race([
    once(server, "exit"),
    new Promise((r) => setTimeout(r, 3000)),
  ]);
}
