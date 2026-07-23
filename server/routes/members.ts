import { Router } from "express";
import { createClerkClient } from "@clerk/backend";
import { requireClerkAuth } from "../middleware/auth.js";
import { MAX_TEAM_USERS } from "../lib/task-service.js";

const router = Router();

router.use(requireClerkAuth);

export interface MemberDto {
  id: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  email: string | null;
  imageUrl: string | null;
}

export interface MembersResponse {
  members: MemberDto[];
  maxUsers: number;
  teamFull: boolean;
}

async function fetchMembers(): Promise<MemberDto[]> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Clerk not configured");
  }

  const clerk = createClerkClient({ secretKey });
  const result = await clerk.users.getUserList({ limit: 100 });
  return result.data.map((user) => {
    const email =
      user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress ??
      user.emailAddresses[0]?.emailAddress ??
      null;
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || null;
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName,
      email,
      imageUrl: user.imageUrl ?? null,
    };
  });
}

router.get("/", async (_req, res) => {
  try {
    const members = await fetchMembers();
    const response: MembersResponse = {
      members,
      maxUsers: MAX_TEAM_USERS,
      teamFull: members.length >= MAX_TEAM_USERS,
    };
    res.json(response);
  } catch (err) {
    console.error("GET /members error:", err);
    res.status(503).json({ error: "Unable to load members" });
  }
});

export { fetchMembers, MAX_TEAM_USERS };
export default router;
