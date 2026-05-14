import { OrderTrackingContent } from "./OrderTrackingClient";

export default function OrderTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  return <OrderTrackingContent params={params} />;
}
