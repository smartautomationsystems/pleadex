import { NextResponse } from "next/server";
import { handleOCRNotification } from "@/libs/ocr";

export async function POST(request: Request) {
  try {
    console.log("Received SNS message");
    const body = await request.json();
    
    // Log message type
    console.log("SNS Message Type:", body.Type);

    // Handle subscription confirmation
    if (body.Type === "SubscriptionConfirmation") {
      console.log("Confirming subscription...");
      console.log("Subscribe URL:", body.SubscribeURL);

      try {
        const response = await fetch(body.SubscribeURL);
        if (response.ok) {
          console.log("SNS subscription confirmed successfully!");
          return NextResponse.json({ status: "Subscription confirmed" });
        } else {
          console.error("Failed to confirm subscription:", await response.text());
          return new NextResponse("Failed to confirm subscription", { status: 500 });
        }
      } catch (error) {
        console.error("Error confirming subscription:", error);
        return new NextResponse("Error confirming subscription", { status: 500 });
      }
    }

    // Handle actual notifications
    if (body.Type === "Notification") {
      console.log("Processing OCR notification:", body.Message);
      try {
        const notification = JSON.parse(body.Message);
        await handleOCRNotification(notification);
        return NextResponse.json({ success: true });
      } catch (error) {
        console.error("Error processing notification:", error);
        return new NextResponse("Error processing notification", { status: 500 });
      }
    }

    return NextResponse.json({ status: "Received" });
  } catch (error) {
    console.error("Error handling SNS message:", error);
    return new NextResponse("Error processing SNS message", { status: 500 });
  }
} 