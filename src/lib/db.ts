
import { Pool } from "pg";

export const pool = new Pool({
  host: process.env.DB_HOST || "db",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "weather_app",
  user: process.env.DB_USER || "manik",
  password: process.env.DB_PASSWORD || "devpassword",
});
