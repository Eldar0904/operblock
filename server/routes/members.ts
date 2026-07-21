import { Router } from "express";
import { createClerkClient } from "@clerk/backend";
import { requireClerkAuth } from "../middleware/auth.js";

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

router.get("/", async (_req, res) => {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    return res.status(503).json({ error: "Clerk not configured" });
  }

  try {
    const clerk = createClerkClient({ secretKey });
    const result = await clerk.users.getUserList({ limit: 100 });
    const members: MemberDto[] = result.data.map((user) => {
      const email =
        user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
          ?.emailAddress ??
        user.emailAddresses[0]?.emailAddress ??
        null;
      const fullName =
        [user.firstName, user.lastName].filter(Boolean).join(" ") || null;
      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName,
        email,
        imageUrl: user.imageUrl ?? null,
      };
    });
    res.json(members);
  } catch (err) {
    console.error("GET /members error:", err);
    res.status(503).json({ error: "Unable to load members" });
  }
});

export default router;
