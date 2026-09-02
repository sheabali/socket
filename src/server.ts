import http, { Server } from "http";
import app from "./app";
import config from "./config";
import { socketHelper } from "./helpers/socketHelper";

let server: Server;

async function main() {
  try {
    // 1. Connect to database
    // 2. Initialize data in DB ( if there any , ex: admin or super admin)

    // 1. Create HTTP server wrapping express app
    server = http.createServer(app);

    // 2. Initialize Socket.io
    socketHelper.initializeSocket(server);

    // 3. Start HTTP server
    server.listen(config.port, () => {
      console.log(`Server is running on port ${config.port}`);
    });

    // Handle server errors
    server.on("error", (error: any) => {
      if (error.code === "EADDRINUSE") {
        console.error(`❌ Port 8000 is already in use`);
      } else {
        console.error("❌ Server error:", error);
      }
      process.exit(1);
    });
  } catch (error) {
    console.error("Failed to start server", error);
    process.exit(1);
  }
}

main();
