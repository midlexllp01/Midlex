import type { Metadata } from "next";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Finance & Accountant Login",
  description: "Sign in to Midlex LLP Payment & Financial Management Portal",
};

export default function LoginPage() {
  return <LoginClient />;
}
