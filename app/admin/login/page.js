import { redirect } from "next/navigation";

export default function AdminLoginPage() {
  redirect("https://foundr1.jp/os/login?next=%2Fstore%2Forders");
}
