const express = require("express"),
  crypto = require("crypto"),
  fs = require("fs"),
  path = require("path");
const PORT = process.env.PORT || 9871,
  PASS = process.env.ADMIN_PASSWORD,
  SECRET = process.env.SECRET || crypto.randomBytes(32).toString("hex"),
  DB = path.join(__dirname, "data", "db.json"),
  FILES = path.join(__dirname, "data", "files"),
  DAY = 86400;
if (!PASS) {
  console.error("Set ADMIN_PASSWORD dulu (lihat README.md).");
  process.exit(1);
}
fs.mkdirSync(FILES, { recursive: true });
const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
const sign = (e) =>
  e + "." + crypto.createHmac("sha256", SECRET).update(String(e)).digest("hex");
const ok = (req) => {
  const m = /(?:^|; )tok=([^;]+)/.exec(req.headers.cookie || "");
  if (!m) return false;
  const e = m[1].split(".")[0],
    a = Buffer.from(m[1]),
    b = Buffer.from(sign(e));
  return (
    Number(e) > Date.now() &&
    a.length === b.length &&
    crypto.timingSafeEqual(a, b)
  );
};
const cookie = (v, age) =>
  `tok=${v}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${process.env.HTTPS ? "; Secure" : ""}`;
const tries = {};
app.use("/api", (q, r, n) => {
  r.set("Cache-Control", "no-store");
  n();
});
app.get("/api/state", (q, r) => {
  const s = JSON.parse(fs.readFileSync(DB));
  if (!ok(q)) s.a = s.a.filter((p) => p.st !== "draf");
  r.json(s);
});
app.get("/api/me", (q, r) => r.json({ admin: ok(q) }));
app.post("/api/login", express.json(), (q, r) => {
  const t = (tries[q.ip] = (tries[q.ip] || []).filter(
    (x) => x > Date.now() - 9e5,
  ));
  if (t.length >= 10) return r.status(429).end();
  const a = Buffer.from(String(q.body?.password || "")),
    b = Buffer.from(PASS);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    t.push(Date.now());
    return r.status(401).end();
  }
  r.set("Set-Cookie", cookie(sign(Date.now() + 7 * DAY * 1000), 7 * DAY)).json({
    ok: 1,
  });
});
app.post("/api/logout", (q, r) =>
  r.set("Set-Cookie", cookie("", 0)).json({ ok: 1 }),
);
app.put("/api/state", express.json({ limit: "25mb" }), (q, r) => {
  if (!ok(q)) return r.status(401).end();
  const s = q.body;
  if (
    !s ||
    typeof s.p !== "object" ||
    !Array.isArray(s.c) ||
    !Array.isArray(s.a)
  )
    return r.status(400).end();
  fs.writeFileSync(DB + ".tmp", JSON.stringify(s));
  fs.renameSync(DB + ".tmp", DB);
  const used = new Set(s.a.map((p) => p.f && p.f.id));
  for (const f of fs.readdirSync(FILES))
    if (
      !used.has(f) &&
      Date.now() - fs.statSync(path.join(FILES, f)).mtimeMs > 36e5
    )
      fs.unlinkSync(path.join(FILES, f));
  r.json({ ok: 1 });
});
const EXT = [
    ".pdf",
    ".doc",
    ".docx",
    ".ppt",
    ".pptx",
    ".xls",
    ".xlsx",
    ".odt",
    ".txt",
  ],
  esc = (s) =>
    String(s == null ? "" : s).replace(
      /[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
    );
app.post(
  "/api/upload",
  (q, r, n) => (ok(q) ? n() : r.status(401).end()),
  express.raw({ type: () => true, limit: "50mb" }),
  (q, r) => {
    const n = path.basename(String(q.query.n || "")),
      e = path.extname(n).toLowerCase();
    if (!EXT.includes(e) || !Buffer.isBuffer(q.body) || !q.body.length)
      return r.status(400).end();
    const id = crypto.randomBytes(8).toString("hex") + e;
    fs.writeFileSync(path.join(FILES, id), q.body);
    r.json({ id, n, z: q.body.length });
  },
);
app.get("/files/:id/:n", (q, r) => {
  const id = q.params.id,
    f = path.join(FILES, id);
  if (
    !/^[a-f0-9]{16}\.(pdf|docx?|pptx?|xlsx?|odt|txt)$/.test(id) ||
    !fs.existsSync(f)
  )
    return r.status(404).end();
  r.set("X-Content-Type-Options", "nosniff");
  if (q.query.view && id.endsWith(".pdf"))
    return r.type("pdf").set("Content-Disposition", "inline").sendFile(f);
  r.download(f, path.basename(q.params.n));
});
app.get("/t/:id", (q, r) => {
  let h = fs.readFileSync(path.join(__dirname, "public", "index.html"), "utf8");
  try {
    const s = JSON.parse(fs.readFileSync(DB)),
      p = s.a.find((x) => x.id == q.params.id && x.st !== "draf");
    if (p) {
      const t = esc(p.t + " — " + (s.p.n || "")),
        d = esc(p.s);
      h = h
        .replace(
          "<!--OG-->",
          () =>
            `<meta name="description" content="${d}"><meta property="og:type" content="article"><meta property="og:title" content="${t}"><meta property="og:description" content="${d}">`,
        )
        .replace(/<title>.*?<\/title>/, () => `<title>${t}</title>`);
    }
  } catch (_) {}
  r.type("html").send(h);
});
app.use(express.static(path.join(__dirname, "public")));
app.listen(PORT, () => console.log("Web jalan di port " + PORT));
