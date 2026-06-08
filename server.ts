import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { syncWorldCupFixtures, getApiUsageStats } from "./src/services/apiFootball";
import { supabaseAdmin } from "./src/lib/supabase-admin";

let syncInterval: NodeJS.Timeout | null = null;
let syncStatus = {
  lastSync: null as Date | null,
  nextSync: null as Date | null,
  intervalMinutes: 360,
  liveMatches: 0,
  totalRequestsToday: 0
};

async function checkAndSync() {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0,0,0,0);
  const endOfDay = new Date();
  endOfDay.setUTCHours(23,59,59,999);
  const todayStr = startOfDay.toISOString().split('T')[0];

  try {
    // 1. Sync today's matches only to save data
    await syncWorldCupFixtures(todayStr);
    syncStatus.lastSync = new Date();
  } catch (e) {
    console.error("[Auto-Sync Error]", e);
  }

  // 2. Determine next interval based on today's matches
  try {
    const { data: todayMatches } = await supabaseAdmin
      .from('matches')
      .select('status')
      .gte('match_date', startOfDay.toISOString())
      .lte('match_date', endOfDay.toISOString());

    let intervalMinutes = 360; // 6 hours default
    let liveMatches = 0;

    if (todayMatches && todayMatches.length > 0) {
      const liveStatuses = ['LIVE', '1H', 'HT', '2H', 'ET', 'BT', 'P'];
      const notStartedStatuses = ['NS', 'TBD'];
      
      const hasLive = todayMatches.some(m => liveStatuses.includes(m.status));
      const hasNotStarted = todayMatches.some(m => notStartedStatuses.includes(m.status));
      liveMatches = todayMatches.filter(m => liveStatuses.includes(m.status)).length;

      if (hasLive) {
        intervalMinutes = 10;
      } else if (hasNotStarted) {
        intervalMinutes = 60;
      } else {
        intervalMinutes = 360; // all finished
      }
    }

    // Refresh Usage
    const { data: usageLog } = await supabaseAdmin
      .from('api_usage_logs')
      .select('requests_count')
      .eq('request_date', todayStr);
    
    syncStatus.totalRequestsToday = usageLog ? usageLog.reduce((acc, log) => acc + log.requests_count, 0) : 0;
    
    // Stop syncing if usage is maxed out
    if (syncStatus.totalRequestsToday >= 100) {
      intervalMinutes = 60 * 24; // Wait 24h
    }

    syncStatus.intervalMinutes = intervalMinutes;
    syncStatus.liveMatches = liveMatches;
    syncStatus.nextSync = new Date(Date.now() + intervalMinutes * 60 * 1000);

    console.log(`[Auto-Sync] Scheduled next sync in ${intervalMinutes} minutes`);
    
    if (syncInterval) clearTimeout(syncInterval);
    syncInterval = setTimeout(checkAndSync, intervalMinutes * 60 * 1000);

  } catch (e) {
    console.error("[Auto-Sync DB Error]", e);
  }
}

function setupAutomatedSync() {
  console.log("[Auto-Sync] Starting background sync process...");
  checkAndSync();
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Football API Sync endpoints
  app.post("/api/sync/football", async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const result = await syncWorldCupFixtures(today);
      await checkAndSync(); // Recalculate intervals based on manual trigger
      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error("[Football API Sync Error]", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get("/api/admin/usage", async (req, res) => {
    try {
      const stats = await getApiUsageStats();
      res.json({ success: true, data: stats, status: syncStatus });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  setupAutomatedSync();

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
