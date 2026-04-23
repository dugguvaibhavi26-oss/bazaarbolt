import * as admin from "firebase-admin";
import "./firebaseAdmin"; // Ensure admin is initialized

export async function sendToUser(token: string, title: string, body: string, data?: Record<string, string>) {
  if (!token) return;

  const message = {
    notification: {
      title,
      body,
    },
    token,
    data: data || {},
    android: {
      notification: {
        sound: "default",
      },
    },
  };

  try {
    const response = await admin.messaging().send(message);
    console.log("Successfully sent message:", response);
    return response;
  } catch (error: any) {
    console.error("Error sending message:", error);
    // If token is invalid or not registered, we should ideally handle it
    if (error.code === 'messaging/registration-token-not-registered' || error.code === 'messaging/invalid-registration-token') {
       // Code to remove token from DB could go here if we had the userId
    }
    throw error;
  }
}

export async function sendToMultiple(tokens: string[], title: string, body: string, data?: Record<string, string>) {
  if (!tokens || tokens.length === 0) return;

  const message: admin.messaging.MulticastMessage = {
    notification: {
      title,
      body,
    },
    tokens,
    data: data || {},
    android: {
      notification: {
        sound: "default",
      },
    },
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`${response.successCount} messages were sent successfully`);
    
    // Handle failures/invalid tokens
    if (response.failureCount > 0) {
      const failedTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
        }
      });
      console.log("Failed tokens:", failedTokens);
    }
    
    return response;
  } catch (error) {
    console.error("Error sending multicast message:", error);
    throw error;
  }
}

export async function sendToTopic(topic: string, title: string, body: string, data?: Record<string, string>) {
  const message = {
    notification: {
      title,
      body,
    },
    topic,
    data: data || {},
    android: {
      notification: {
        sound: "default",
      },
    },
  };

  try {
    const response = await admin.messaging().send(message);
    console.log("Successfully sent message to topic:", topic, response);
    return response;
  } catch (error) {
    console.error("Error sending topic message:", error);
    throw error;
  }
}
export async function subscribeToTopic(token: string, topic: string) {
  if (!token || !topic) return;
  try {
    const response = await admin.messaging().subscribeToTopic(token, topic);
    console.log(`Successfully subscribed token to topic ${topic}:`, response);
    return response;
  } catch (error) {
    console.error(`Error subscribing to topic ${topic}:`, error);
    throw error;
  }
}
