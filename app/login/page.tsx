"use client";

import { useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Clock, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  role: z.enum(["admin", "employee"]),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { role: "employee" },
  });

  const role = watch("role");

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        role: data.role,
        redirect: false,
      });

      if (result?.error) {
        toast({
          title: "Login Failed",
          description: "Invalid email or password. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Welcome back!", description: "Login successful." });
        window.location.href = data.role === "admin" ? "/admin/dashboard" : "/employee/dashboard";
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <Clock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Smart Attendance</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Management System</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">
            Sign in to your account
          </h2>

          {/* Role Toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mb-6">
            <button
              type="button"
              onClick={() => setValue("role", "employee")}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                role === "employee"
                  ? "bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              Employee
            </button>
            <button
              type="button"
              onClick={() => setValue("role", "admin")}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                role === "admin"
                  ? "bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              Admin
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email Address
              </label>
              <input
                {...register("email")}
                type="email"
                placeholder={role === "admin" ? "admin@smartattendance.com" : "employee@company.com"}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          
        </div>
      </div>
    </div>
  );
}
