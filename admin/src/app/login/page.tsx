import type { Metadata } from "next";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Admin Login",
  description: "Sign in to Midlex LLP Administrative Portal",
};

export default function LoginPage() {
  return <LoginClient />;
}
