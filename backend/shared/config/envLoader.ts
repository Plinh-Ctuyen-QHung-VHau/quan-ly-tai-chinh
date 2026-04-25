import * as dotenv from "dotenv";
import * as path from "path";

export const loadEnv = () => {
  const envPath = path.resolve(process.cwd(), ".env");
  dotenv.config({ path: envPath });
};
