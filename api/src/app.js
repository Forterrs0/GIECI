import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { HttpError, errorHandler } from "./errors.js";
import { requireSession, requireDevice } from "./middleware/auth.js";
import { authRoutes } from "./routes/auth.js";
import { catalogRoutes } from "./routes/catalog.js";
import { queryRoutes } from "./routes/queries.js";
import { sensorInput, parseTimestamp } from "./validation.js";
import { sensorReading } from "./services/movement.js";

export function createApp({ pool, config }) {
  const app = express();
  app.disable("x-powered-by");
  if (config.trustProxy) app.set("trust proxy", config.trustProxy);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          styleSrcAttr: ["'none'"],
          fontSrc: ["'self'"],
          imgSrc: ["'self'", "data:"],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: config.production ? [] : null,
        },
      },
      strictTransportSecurity: config.production ? undefined : false,
    }),
  );
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    const origin = req.get("Origin");
    if (origin && !config.origins.includes(origin))
      throw new HttpError(403, "Origem não autorizada.");
    if (origin) {
      res.set("Access-Control-Allow-Origin", origin);
      res.set("Access-Control-Allow-Credentials", "true");
      res.vary("Origin");
    }
    if (req.method === "OPTIONS")
      return res
        .set({
          "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
          "Access-Control-Allow-Headers":
            "Content-Type,X-CSRF-Token,Authorization",
        })
        .status(204)
        .end();
    if (
      !["GET", "HEAD"].includes(req.method) &&
      req.path !== "/peso" &&
      !origin
    )
      throw new HttpError(403, "Envie uma origem autorizada.");
    if (
      !["GET", "HEAD"].includes(req.method) &&
      !/^application\/json(?:;|$)/i.test(req.get("Content-Type") || "")
    )
      throw new HttpError(415, "Use Content-Type: application/json.");
    next();
  });
  app.use(
    "/api",
    rateLimit({
      windowMs: 60_000,
      limit: 600,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { error: "Muitas requisições. Aguarde um minuto." },
    }),
  );
  app.use(express.json({ limit: "32kb", strict: true }));
  app.get("/api/health", async (req, res) => {
    await pool.query("SELECT 1");
    res.json({ status: "ok" });
  });
  app.use("/api/auth", authRoutes(pool, config));
  app.post("/api/peso", requireDevice(pool), async (req, res) => {
    const input = sensorInput.parse(req.body);
    res.json(
      await sensorReading(
        pool,
        req.deviceId,
        input,
        parseTimestamp(input.timestamp),
      ),
    );
  });
  app.use("/api", requireSession(pool), catalogRoutes(pool), queryRoutes(pool));
  app.use("/api", (req, res) =>
    res.status(404).json({ error: "Endpoint não encontrado." }),
  );
  const dist = fileURLToPath(
    new URL("../../gieci-client/dist/", import.meta.url),
  );
  if (existsSync(dist)) {
    app.use(express.static(dist, { index: "index.html", dotfiles: "deny" }));
    app.get("/{*path}", (req, res, next) => {
      if (req.path.includes(".")) return next();
      res.sendFile("index.html", { root: dist });
    });
  }
  app.use((req, res) =>
    res.status(404).json({ error: "Recurso não encontrado." }),
  );
  app.use(errorHandler);
  return app;
}
