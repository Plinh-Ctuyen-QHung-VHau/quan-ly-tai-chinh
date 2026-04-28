import { JwtPayload } from "jsonwebtoken";
export interface SupabaseJwtPayload extends JwtPayload {
    sub: string;
    email: string;
    role: string;
}
