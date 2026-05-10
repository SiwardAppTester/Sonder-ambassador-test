import { redirect } from "next/navigation";

export default function AmbassadorsIndex() {
  redirect("/dashboard/ambassadors/campaigns");
}
