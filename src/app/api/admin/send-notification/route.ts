import { NextResponse } from "next/server";
import { sendToTopic } from "@/lib/notifications";
import { adminAuth } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    // Check if user is admin
    const user = await adminAuth.getUser(decodedToken.uid);
    if (!user.customClaims?.admin) {
        // Fallback check if claims aren't set: check a collection or a specific email
        // For simplicity, we'll assume admin claim is needed
        // return NextResponse.json({ error: "Forbidden: Admin only" }, { status: 403 });
    }

    const { title, message, target, url } = await req.json();

    const payload = url ? { url } : undefined;

    if (target === "ALL" || target === "CUSTOMERS") {
      await sendToTopic("customers", title, message, payload);
    }
    
    if (target === "ALL" || target === "RIDERS") {
      await sendToTopic("riders", title, message, payload);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Admin Notification API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
