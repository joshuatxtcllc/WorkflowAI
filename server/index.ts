import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { registerRoutes } from "./routes";
import { logger } from "./logger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '5000', 10);

  // Basic middleware
  app.use(cors({
    origin: true,
    credentials: true
  }));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Setup API routes
  await registerRoutes(app);

  // Serve static files
  const staticPath = path.join(__dirname, "../client/dist");
  app.use(express.static(staticPath));

  // Catch-all handler for client-side routing
  app.get("*", (req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  // Start server
  app.listen(PORT, "0.0.0.0", () => {
    logger.info(`🚀 Server running on http://0.0.0.0:${PORT}`);
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  });

  return app;
}

// Start the server
startServer().catch(console.error);

export default startServer;