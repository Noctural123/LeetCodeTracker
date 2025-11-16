"use client";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { z } from "zod";

type AttemptRow = {
    id: number;
    title: string;
    topics: string;
    status: string;
    ts: string;
}

// Zod schema for runtime validation
const AttemptRowSchema = z.object({
    id: z.number(),
    title: z.string(),
    topics: z.string(),
    status: z.string(),
    ts: z.string(),
});

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function Home() {
    // Runs once on mount, gets initial user from URL or localStorage otherwise empty string
    const initialUser = useMemo(() => {
        if(typeof window === "undefined") return "";
        const fromUrl = new URLSearchParams(window.location.search).get("user") || "";
        const fromStorage = localStorage.getItem("user") || "";
        return fromUrl || fromStorage || "";
    }, []);

    const [user, setUser] = useState<string>(initialUser);
    const [rows, setRows] = useState<AttemptRow[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem("user_handle", user);
        }
    }, [user]);

    async function load() {
        if (!user.trim()){
            setError("User handle is required");
            return;
        }
        try{
            setLoading(true);
            setError(null);
            const res = await axios.get(`${API}/attempts`, { params: { user_handle: user.trim()}});
            
            // Validate response data with Zod
            const validatedData = AttemptRowSchema.array().parse(res.data);
            setRows(validatedData);
        } catch (e: any) {
            // Handle Zod validation errors
            if (e instanceof z.ZodError) {
                setError(`Invalid data format: ${e.issues.map((err: z.ZodIssue) => err.message).join(", ")}`);
            } else {
                // Handle axios/network errors
                setError(e.response?.data?.error ? JSON.stringify(e.response.data.error) : e.message);
            }
        }
        finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (user.trim()) {
            load();
        }
    }, [user]);

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
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">LeetCode Tracker</h1>
                    <p className="text-gray-600">Track your coding problem attempts</p>
                </div>

                {/* Search Section */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label htmlFor="user-handle" className="block text-sm font-medium text-gray-700 mb-2">
                                User Handle
                            </label>
                            <input
                                id="user-handle"
                                type="text"
                                value={user}
                                onChange={(e) => setUser(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        load();
                                    }
                                }}
                                placeholder="Enter LeetCode username"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            />
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={load}
                                disabled={loading || !user.trim()}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
                            >
                                {loading ? "Loading..." : "Search"}
                            </button>
                        </div>
                    </div>
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
                {!loading && !error && user.trim() && rows.length === 0 && (
                    <div className="bg-white rounded-lg shadow-md p-12 text-center">
                        <p className="text-gray-500 text-lg">No attempts found for user "{user}"</p>
                        <p className="text-gray-400 text-sm mt-2">Try a different username or create some attempts first.</p>
                    </div>
                )}

                {/* Initial State */}
                {!loading && !error && !user.trim() && (
                    <div className="bg-white rounded-lg shadow-md p-12 text-center">
                        <p className="text-gray-500 text-lg">Enter a user handle to view attempts</p>
                    </div>
                )}
            </div>
        </div>
    )
}