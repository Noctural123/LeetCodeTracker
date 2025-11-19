"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import axios from "axios";
import { z } from "zod";

type AttemptRow = {
    id: number;
    user_handle: string;
    slug: string;
    title: string;
    topics: string;
    lc_difficulty: number;
    status: string;
    lang: string | null;
    runtime_ms: number | null;
    memory_kb: number | null;
    seconds: number | null;
    ts: string;
}

// Zod schema for runtime validation (allows extra fields from API)
const AttemptRowSchema = z.object({
    id: z.number(),
    user_handle: z.string(),
    slug: z.string(),
    title: z.string(),
    topics: z.string(),
    lc_difficulty: z.number(),
    status: z.string(),
    lang: z.string().nullable(),
    runtime_ms: z.number().nullable(),
    memory_kb: z.number().nullable(),
    seconds: z.number().nullable(),
    ts: z.string(),
}).passthrough(); // Allow extra fields

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function Home() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [rows, setRows] = useState<AttemptRow[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Redirect to login if not authenticated
    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        }
    }, [status, router]);

    // Show loading state while checking authentication
    if (status === "loading") {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    // Redirect if not authenticated (fallback)
    if (status === "unauthenticated") {
        return null; // Will redirect via useEffect
    }

    const userHandle = session?.user?.handle || session?.user?.email?.split("@")[0] || "";

    const handleLogout = async () => {
        await signOut({ callbackUrl: "/login" });
    };

    const load = useCallback(async () => {
        if (!userHandle.trim()){
            setError("User handle is required");
            return;
        }
        try{
            setLoading(true);
            setError(null);
            console.log("Fetching attempts for:", userHandle);
            console.log("API URL:", `${API}/attempts`);
            
            const res = await axios.get(`${API}/attempts`, { 
                params: { user_handle: userHandle.trim() }
            });
            
            console.log("Response:", res.data);
            
            
            if (!Array.isArray(res.data)) {
                setError("Invalid response format from server");
                return;
            }
            
            // Validate response data with Zod
            const validatedData = AttemptRowSchema.array().parse(res.data);
            setRows(validatedData);
        } catch (e: any) {
            console.error("Error loading attempts:", e);
            // Handle Zod validation errors
            if (e instanceof z.ZodError) {
                setError(`Invalid data format: ${e.issues.map((err: z.ZodIssue) => err.message).join(", ")}`);
            } else if (e.code === 'ECONNREFUSED' || e.message?.includes('Network Error')) {
                setError("Cannot connect to server. Make sure the backend is running on http://localhost:4000");
            } else {
                // Handle axios/network errors
                const errorMessage = e.response?.data?.error 
                    ? (typeof e.response.data.error === 'string' 
                        ? e.response.data.error 
                        : JSON.stringify(e.response.data.error))
                    : e.message || "Failed to fetch attempts. Check console for details.";
                setError(errorMessage);
            }
        }
        finally {
            setLoading(false);
        }
    }, [userHandle]);

    useEffect(() => {
        if (status === "authenticated" && userHandle.trim()) {
            load();
        } else {
            setRows([]);
            setError(null);
        }
    }, [status, userHandle, load]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="container mx-auto px-4 max-w-7xl">
                {/* Header */}
                <div className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">My Dashboard</h1>
                        <p className="text-gray-600">
                            Welcome, <span className="font-semibold">{session?.user?.name || userHandle}</span>
                        </p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
                    >
                        Logout
                    </button>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
                        <p className="font-medium">Error:</p>
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        <p className="mt-4 text-gray-600">Loading attempts...</p>
                    </div>
                )}

                {/* Results */}
                {!loading && rows.length > 0 && (
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-900">
                                {rows.length} Attempt{rows.length !== 1 ? "s" : ""} Found
                            </h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Problem
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Topics
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Date
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {rows.map((row) => (
                                        <tr key={row.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{row.title}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {row.topics.split(";").map((topic, idx) => (
                                                        <span
                                                            key={idx}
                                                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                                        >
                                                            {topic.trim()}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span
                                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                        row.status === "accepted"
                                                            ? "bg-green-100 text-green-800"
                                                            : "bg-red-100 text-red-800"
                                                    }`}
                                                >
                                                    {row.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatDate(row.ts)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!loading && !error && rows.length === 0 && (
                    <div className="bg-white rounded-lg shadow-md p-12 text-center">
                        <p className="text-gray-500 text-lg">No attempts found</p>
                        <p className="text-gray-400 text-sm mt-2">Start solving problems to see your attempts here!</p>
                    </div>
                )}
            </div>
        </div>
    )
}