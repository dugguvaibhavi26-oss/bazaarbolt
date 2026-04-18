import { NextRequest, NextResponse } from "next/server";
import { sendToUser, sendToMultiple, sendToTopic } from "@/lib/notifications";
import { adminAuth } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { token, tokens, topic, title, body, data } = await req.json();

    // In a real app, you'd want to verify the user making this request
    // or use a secret key for internal service-to-service calls.
    // For this implementation, we'll assume it's called from our business logic.

    if (token) {
      await sendToUser(token, title, body, data);
    } else if (tokens && Array.isArray(tokens)) {
      await sendToMultiple(tokens, title, body, data);
    } else if (topic) {
      await sendToTopic(topic, title, body, data);
    } else {
      return NextResponse.json({ error: "Missing recipient (token, tokens, or topic)" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("API Notification Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
