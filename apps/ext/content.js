// Listen for messages from the injected script
window.addEventListener('message', (event) => {
    if (event.source !== window || event.data.type !== 'LEETCODE_ATTEMPT') return;
    const payload = event.data.payload;
    
    console.log("LCT Content Script: Received attempt", payload);

    // Get user handle from storage
    chrome.storage.local.get(['user_handle'], (res) => {
        const user_handle = res.user_handle;
        
        if (!user_handle) {
            console.warn("LCT: No user handle configured. Please click the extension icon and set your handle.");
            alert("LeetCode Tracker: Please set your username in the extension popup to track this attempt.");
            return;
        }

        // Scrape Details
        // 1. Title
        let title = document.title.split('-')[0].trim();
        // Remove "123. " prefix if present
        if (/^\d+\.\s*/.test(title)) {
            title = title.replace(/^\d+\.\s*/, '');
        }

        // 2. Difficulty & Topics
        // This is tricky as classes are obfuscated. 
        // We'll try to find the difficulty tag by text content in specific containers if possible.
        // Fallback: Search entire body text for first occurrence of Easy/Medium/Hard which is usually the difficulty label.
        let difficulty = 1; // Default Easy
        
        // LeetCode usually puts difficulty right after title. 
        // We can try to grab the text content of the problem description header
        const descriptionElement = document.querySelector('[data-track-load="description_content"]');
        // If we can't find specific elements, we fallback to simple text search in the top part of the page
        const headerText = document.body.innerText.substring(0, 2000); 
        
        if (headerText.includes("Hard")) difficulty = 3;
        else if (headerText.includes("Medium")) difficulty = 2;
        else difficulty = 1;

        const attemptData = {
            user_handle: user_handle,
            slug: payload.slug,
            title: title,
            topics: "Algorithms", // Placeholder as topics are hard to scrape
            lc_difficulty: difficulty,
            status: payload.status,
            lang: payload.lang,
            runtime_ms: payload.runtime_ms,
            memory_kb: payload.memory_kb,
            code: payload.code,
            ts: payload.ts
        };

        console.log("LCT: Sending to server...", attemptData);

        // Send to localhost
        fetch('http://localhost:4000/attempt', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(attemptData)
        })
        .then(async (r) => {
            if (!r.ok) throw new Error(await r.text());
            return r.json();
        })
        .then(d => {
            console.log("LCT: Attempt saved successfully", d);
            // Optional: Show a small notification toast on the page
        })
        .catch(e => {
            console.error("LCT: Failed to save attempt", e);
            alert("LeetCode Tracker: Failed to save attempt to localhost. Is the server running?");
        });
    });
});