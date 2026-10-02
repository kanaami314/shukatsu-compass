declare namespace Cloudflare {
  interface Env {
    GEMINI_API_KEY?: string;
    COMPASS_SERVICE_TOKEN?: string;
    COMPASS_BACKUP_OWNER?: string;
    TAVILY_API_KEY?: string;
    GEMINI_MODEL?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
