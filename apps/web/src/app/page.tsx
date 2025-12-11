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
    problem_number?: number | null;
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
    problem_number: z.number().nullable().optional(),
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

type SolvedProblem = {
    id: number;
    slug: string;
    title: string;
    number?: number | null;
    topics: string;
    lc_difficulty: number;
    last_solved: string;
    success_rate: number;
}

const SolvedProblemSchema = z.object({
    id: z.number(),
    slug: z.string(),
    title: z.string(),
    number: z.number().nullable().optional(),
    topics: z.string(),
    lc_difficulty: z.number(),
    last_solved: z.string(),
    success_rate: z.number(),
});

export default function Home() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [activeTab, setActiveTab] = useState<"attempts" | "solved">("attempts");
    
    // Attempts State
    const [rows, setRows] = useState<AttemptRow[]>([]);
    // Solved Problems State
    const [solvedProblems, setSolvedProblems] = useState<SolvedProblem[]>([]);
    const [sortConfig, setSortConfig] = useState<{ key: keyof SolvedProblem, direction: "asc" | "desc" } | null>(null);

    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Redirect to login if not authenticated
    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        }
    }, [status, router]);

    const userHandle = session?.user?.handle || session?.user?.email?.split("@")[0] || "";

    // Fetch Data based on active tab
    useEffect(() => {
        if (!userHandle) return;

        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                
                if (activeTab === "attempts") {
                    const res = await axios.get(`${API}/attempts`, { 
                        params: { user_handle: userHandle.trim() }
                    });
                    const validatedData = AttemptRowSchema.array().parse(res.data);
                    setRows(validatedData);
                } else {
                    const res = await axios.get(`${API}/solved-problems`, { 
                        params: { user_handle: userHandle.trim() }
                    });
                    const validatedData = SolvedProblemSchema.array().parse(res.data);
                    setSolvedProblems(validatedData);
                }
            } catch (e: any) {
                console.error("Error loading data:", e);
                 // Handle Zod/Network errors similar to before...
                 setError("Failed to load data. check console.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [status, userHandle, activeTab]);

    const handleSort = (key: keyof SolvedProblem) => {
        let direction: "asc" | "desc" = "asc";
        if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });

        const sorted = [...solvedProblems].sort((a, b) => {
            let aVal: any = a[key];
            let bVal: any = b[key];

            // Handle nulls
            if (aVal === null) return 1;
            if (bVal === null) return -1;

            if (key === 'last_solved') {
                aVal = new Date(aVal).getTime();
                bVal = new Date(bVal).getTime();
            }

            if (aVal < bVal) return direction === "asc" ? -1 : 1;
            if (aVal > bVal) return direction === "asc" ? 1 : -1;
            return 0;
        });

        setSolvedProblems(sorted);
    };
    
    // ... existing helper functions (formatDate, handleDelete) ...


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

    const handleLogout = async () => {
        await signOut({ callbackUrl: "/login" });
    };

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

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this attempt?")) return;

        try {
            await axios.delete(`${API}/attempt/${id}`);
            setRows(rows.filter(row => row.id !== id));
        } catch (e: any) {
            console.error("Delete error:", e);
            alert("Failed to delete attempt. Please try again.");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="container mx-auto px-4 max-w-7xl">
                {/* Header with Tabs */}
                <div className="mb-8">
                    <div className="flex justify-between items-center mb-6">
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

                    {/* Tabs */}
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-8">
                            <button
                                onClick={() => setActiveTab("attempts")}
                                className={`
                                    whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm
                                    ${activeTab === "attempts"
                                        ? "border-blue-500 text-blue-600"
                                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}
                                `}
                            >
                                Recent Attempts
                            </button>
                            <button
                                onClick={() => setActiveTab("solved")}
                                className={`
                                    whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm
                                    ${activeTab === "solved"
                                        ? "border-blue-500 text-blue-600"
                                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}
                                `}
                            >
                                Solved Problems
                            </button>
                        </nav>
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
                        <p className="mt-4 text-gray-600">Loading...</p>
                    </div>
                )}

                {!loading && !error && (
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        {activeTab === "attempts" ? (
                            // ATTEMPTS TABLE
                            <>
                                <div className="px-6 py-4 border-b border-gray-200">
                                    <h2 className="text-xl font-semibold text-gray-900">
                                        {rows.length} Attempt{rows.length !== 1 ? "s" : ""} Found
                                    </h2>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Problem</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Topics</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {rows.map((row) => (
                                                <tr key={row.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {row.problem_number ? row.problem_number : "-"}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900">{row.title}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-wrap gap-1">
                                                            {row.topics.split(";").map((topic, idx) => (
                                                                <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                                    {topic.trim()}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                            row.status === "accepted" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                                        }`}>
                                                            {row.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {formatDate(row.ts)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <button onClick={() => handleDelete(row.id)} className="text-red-600 hover:text-red-900 transition-colors">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {rows.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                                        No recent attempts found.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        ) : (
                            // SOLVED PROBLEMS TABLE
                            <>
                                <div className="px-6 py-4 border-b border-gray-200">
                                    <h2 className="text-xl font-semibold text-gray-900">
                                        {solvedProblems.length} Problem{solvedProblems.length !== 1 ? "s" : ""} Solved
                                    </h2>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th 
                                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                                    onClick={() => handleSort('number')}
                                                >
                                                    # {sortConfig?.key === 'number' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Problem</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Topics</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Difficulty</th>
                                                <th 
                                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                                    onClick={() => handleSort('last_solved')}
                                                >
                                                    Last Solved {sortConfig?.key === 'last_solved' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                                </th>
                                                <th 
                                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                                    onClick={() => handleSort('success_rate')}
                                                >
                                                    Success Rate {sortConfig?.key === 'success_rate' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {solvedProblems.map((problem) => (
                                                <tr key={problem.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {problem.number ? problem.number : "-"}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900">{problem.title}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-wrap gap-1">
                                                            {problem.topics.split(";").map((topic, idx) => (
                                                                <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                                    {topic.trim()}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                            problem.lc_difficulty === 1 ? "bg-green-100 text-green-800" :
                                                            problem.lc_difficulty === 2 ? "bg-yellow-100 text-yellow-800" :
                                                            "bg-red-100 text-red-800"
                                                        }`}>
                                                            {problem.lc_difficulty === 1 ? "Easy" : problem.lc_difficulty === 2 ? "Medium" : "Hard"}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {formatDate(problem.last_solved)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {(problem.success_rate * 100).toFixed(1)}%
                                                    </td>
                                                </tr>
                                            ))}
                                            {solvedProblems.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                                        No solved problems found yet.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}