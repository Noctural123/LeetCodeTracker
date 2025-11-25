"use client";
import { useState } from "react";
import Link from "next/link";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [message, setMessage] = useState("");
    const [mode, setMode] = useState<"password" | "username">("password");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("loading");
        setMessage("");

        try {
            const endpoint = mode === "password" ? "/auth/forgot-password" : "/auth/forgot-username";
            const res = await axios.post(`${API}${endpoint}`, { email });
            setStatus("success");
            setMessage(res.data.message);
        } catch (err: any) {
            setStatus("error");
            setMessage(err.response?.data?.error || "Failed to process request");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        {mode === "password" ? "Reset your password" : "Retrieve your username"}
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        {mode === "password" 
                            ? "Enter your email address and we'll send you a link to reset your password."
                            : "Enter your email address and we'll send you your username."}
                    </p>
                </div>
                
                <div className="flex justify-center space-x-4 border-b border-gray-200 pb-4">
                    <button
                        onClick={() => { setMode("password"); setStatus("idle"); setMessage(""); }}
                        className={`pb-2 text-sm font-medium ${
                            mode === "password"
                                ? "text-blue-600 border-b-2 border-blue-600"
                                : "text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        Forgot Password
                    </button>
                    <button
                        onClick={() => { setMode("username"); setStatus("idle"); setMessage(""); }}
                        className={`pb-2 text-sm font-medium ${
                            mode === "username"
                                ? "text-blue-600 border-b-2 border-blue-600"
                                : "text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        Forgot Username
                    </button>
                </div>

                {status === "success" ? (
                    <div className="rounded-md bg-green-50 p-4">
                        <div className="flex">
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-green-800">
                                    Check your email
                                </h3>
                                <div className="mt-2 text-sm text-green-700">
                                    <p>{message}</p>
                                    <p className="mt-4 text-xs text-gray-500">
                                        (Since this is a dev environment, check the server console for the info)
                                    </p>
                                </div>
                                <div className="mt-4">
                                    <Link
                                        href="/login"
                                        className="text-sm font-medium text-green-600 hover:text-green-500"
                                    >
                                        Back to login &rarr;
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                Email address
                            </label>
                            <div className="mt-1">
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                            </div>
                        </div>

                        {status === "error" && (
                            <div className="rounded-md bg-red-50 p-4">
                                <div className="flex">
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-red-800">
                                            Error
                                        </h3>
                                        <div className="mt-2 text-sm text-red-700">
                                            <p>{message}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <button
                                type="submit"
                                disabled={status === "loading"}
                                className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                                    status === "loading" ? "opacity-75 cursor-not-allowed" : ""
                                }`}
                            >
                                {status === "loading" 
                                    ? "Sending..." 
                                    : (mode === "password" ? "Send reset link" : "Retrieve username")
                                }
                            </button>
                        </div>

                        <div className="text-center">
                            <Link
                                href="/login"
                                className="font-medium text-blue-600 hover:text-blue-500"
                            >
                                Back to login
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}