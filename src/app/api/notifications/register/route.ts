import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { subscribeToTopic } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { userId, fcmToken } = await req.json();

    if (!userId || !fcmToken) {
      return NextResponse.json({ error: "Missing userId or fcmToken" }, { status: 400 });
    }

    // 1. Update user document with token
    await adminDb.collection("users").doc(userId).set({
      fcmToken,
      lastTokenUpdate: new Date().toISOString()
    }, { merge: true });

    // 2. Fetch user role to determine topic subscriptions
    const userDoc = await adminDb.collection("users").doc(userId).get();
    const role = userDoc.data()?.role || "customer";

    // 3. Subscribe to relevant topics
    // All users are in the customers topic for general announcements
    await subscribeToTopic(fcmToken, "customers");

    // Riders also subscribe to the riders topic for new delivery alerts
    if (role === "rider") {
      await subscribeToTopic(fcmToken, "riders");
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Token Registration Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
