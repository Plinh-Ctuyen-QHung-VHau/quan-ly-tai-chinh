import { JwtPayload } from "jsonwebtoken";

export interface SupabaseJwtPayload extends JwtPayload {
  sub: string; // user_id
  email: string;
  role: string;
  // ... other claims
}
