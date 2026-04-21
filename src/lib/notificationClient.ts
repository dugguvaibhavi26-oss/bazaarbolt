export async function triggerNotification(params: {
  userId?: string;
  token?: string;
  topic?: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}) {
  try {
    // If we have a userId but no token, we need to fetch the token from Firestore
    // This could also be handled by the API itself to keep the client logic simple.
    // For now, let's assume we pass what we have.
    
    let targetParams: any = { 
        title: params.title, 
        body: params.body, 
        data: params.data 
    };
    
    if (params.token) {
        targetParams.token = params.token;
    } else if (params.topic) {
        targetParams.topic = params.topic;
    } else if (params.userId) {
        try {
            const { db } = await import("@/lib/firebase");
            const { getDoc, doc } = await import("firebase/firestore");
            try {
                const userSnap = await getDoc(doc(db, "users", params.userId));
                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    if (userData.fcmToken) {
                        targetParams.token = userData.fcmToken;
                    } else {
                        return; 
                    }
                }
            } catch (err: any) {
                if (err.code === 'permission-denied') {
                    return null;
                }
                throw err;
            }
        } catch (err: any) {
            if (err.message?.includes("permission")) {
                console.log("Skipping notification lookup (restricted permission)");
                return;
            }
            throw err;
        }
    }

    const response = await fetch("/api/notifications/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(targetParams),
    });

    return await response.json();
  } catch (error) {
    console.error("Failed to trigger notification:", error);
  }
}
