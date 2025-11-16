"use client";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";

type AttemptRow = {
    id: number;
    title: string;
    topics: string;
    status: string;
    ts: string;
}

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
}