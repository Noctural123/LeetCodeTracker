"use client";
import { useEffect, useState } from "react";
import axios from "axios";

type AttemptRow = {
    id: number;
    title: string;
    topics: string;
    status: string;
    ts: string;
}