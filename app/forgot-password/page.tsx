import ForgotPasswordForm from "@/features/login/components/forgot-password-form";

export const metadata = {
  title: "Forgot Password | AP Colour Academy",
  description: "Reset your AP Colour Academy portal password",
};

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-200 p-4">
      <ForgotPasswordForm />
    </main>
  );
}

