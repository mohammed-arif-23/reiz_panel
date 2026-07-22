import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "reiz-pulse-jwt-super-secret-key-2026-attendance-task-system-token-jwt";
const secretKey = new TextEncoder().encode(JWT_SECRET);

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
}

// JWT utilities
export async function signToken(payload: TokenPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as TokenPayload;
  } catch (error) {
    return null;
  }
}
