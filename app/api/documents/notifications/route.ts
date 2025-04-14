import { NextResponse } from "next/server";
import { handleOCRNotification } from "@/libs/ocr";

export async function POST(request: Request) {
  try {
    console.log("Received SNS notification");
    const message = await request.json();
    
    // Verify this is a subscription confirmation request
    if (message.Type === "SubscriptionConfirmation") {
      console.log("Received subscription confirmation request");
      const subscribeUrl = message.SubscribeURL;
      console.log("Please visit this URL to confirm subscription:", subscribeUrl);
      return NextResponse.json({ message: "Please confirm subscription" });
    }

    // Handle the OCR notification
    if (message.Type === "Notification") {
      console.log("Processing OCR notification:", message);
      const notification = JSON.parse(message.Message);
      await handleOCRNotification(notification);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ message: "Unhandled message type" });
  } catch (error) {
    console.error("Error handling SNS notification:", error);
    return NextResponse.json(
      { error: "Failed to process notification" },
      { status: 500 }
    );
  }
} 