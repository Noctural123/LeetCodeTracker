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
        let difficulty = 1; // Default Easy
        let topics = [];

        // Try to scrape from __NEXT_DATA__ (most reliable for Single Page Apps)
        try {
            const nextDataScript = document.getElementById('__NEXT_DATA__');
            if (nextDataScript) {
                const data = JSON.parse(nextDataScript.textContent);
                // Traverse the JSON to find question data
                // Structure varies, but usually under queries -> 0 -> state -> data -> question
                // We'll try to find an object that looks like a question
                const queries = data?.props?.pageProps?.dehydratedState?.queries || [];
                const questionQuery = queries.find(q => q?.state?.data?.question?.topicTags);
                
                if (questionQuery) {
                    const question = questionQuery.state.data.question;
                    
                    // Get difficulty
                    if (question.difficulty === "Medium") difficulty = 2;
                    else if (question.difficulty === "Hard") difficulty = 3;
                    
                    // Get topics
                    if (Array.isArray(question.topicTags)) {
                        topics = question.topicTags.map(t => t.name);
                    }
                }
            }
        } catch (e) {
            console.error("LCT: Failed to parse __NEXT_DATA__", e);
        }

        // Fallback: Scrape from DOM if __NEXT_DATA__ failed
        if (topics.length === 0) {
            // Try to find topic pills (often have href="/tag/...")
            const topicLinks = document.querySelectorAll('a[href*="/tag/"]');
            topicLinks.forEach(link => {
                if (link.textContent) topics.push(link.textContent.trim());
            });
            
            // Deduplicate
            topics = [...new Set(topics)];
        }

        // Fallback Difficulty
        if (difficulty === 1) { // If still default
            const headerText = document.body.innerText.substring(0, 2000); 
            if (headerText.includes("Hard")) difficulty = 3;
            else if (headerText.includes("Medium")) difficulty = 2;
        }

        const topicsStr = topics.length > 0 ? topics.slice(0, 5).join("; ") : "Algorithms";

        const attemptData = {
            user_handle: user_handle,
            slug: payload.slug,
            title: title,
            topics: topicsStr,
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