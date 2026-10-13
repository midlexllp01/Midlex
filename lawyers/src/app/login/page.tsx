import type { Metadata } from "next";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Lawyers Login",
  description: "Sign in to Midlex LLP Lawyer Workspace",
};

export default function LoginPage() {
  return <LoginClient />;
}
