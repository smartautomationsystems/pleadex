import { NextResponse } from "next/server";
import { handleOCRNotification } from "@/libs/ocr";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Verify the message is from SNS
    if (body.Type === "SubscriptionConfirmation") {
      // Handle subscription confirmation
      const subscribeUrl = body.SubscribeURL;
      if (subscribeUrl) {
        // You can automatically confirm the subscription
        await fetch(subscribeUrl);
        return NextResponse.json({ message: "Subscription confirmed" });
      }
    }
    
    if (body.Type === "Notification") {
      // Parse the message content
      const message = JSON.parse(body.Message);
      await handleOCRNotification(message);
      return NextResponse.json({ message: "Notification processed" });
    }
    
    return NextResponse.json({ message: "Unhandled message type" });
  } catch (error) {
    console.error("Error processing OCR notification:", error);
    return NextResponse.json(
      { error: "Failed to process notification" },
      { status: 500 }
    );
  }
} 