(function() {
    console.log("LCT: Injecting network interceptor...");
    
    // --- Intercept XMLHttpRequest ---
    const XHR = XMLHttpRequest.prototype;
    const open = XHR.open;
    const send = XHR.send;
    
    // Store pending submissions: id -> { lang, code, slug }
    const pending = {};
  
    XHR.open = function(method, url) {
      this._method = method;
      this._url = url;
      return open.apply(this, arguments);
    };
  
    XHR.send = function(postData) {
      this.addEventListener('load', function() {
        handleResponse(this._url, this._method, this.responseText, postData);
      });
      return send.apply(this, arguments);
    };

    // --- Intercept fetch ---
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const [resource, config] = args;
        const response = await originalFetch.apply(this, args);
        
        const clone = response.clone();
        clone.text().then(text => {
            handleResponse(resource, config?.method || 'GET', text, config?.body);
        }).catch(err => console.error("LCT: Fetch intercept error", err));

        return response;
    };

    // --- Common Handler ---
    function handleResponse(url, method, responseText, postData) {
        if (!url) return;
        
        // Handle SUBMIT
        // URL usually: https://leetcode.com/problems/<slug>/submit/
        if (url.includes('/submit/') && method.toUpperCase() === 'POST') {
            try {
                const response = JSON.parse(responseText);
                const submissionId = response.submission_id;
                
                let payload = {};
                if (postData && typeof postData === 'string') {
                    payload = JSON.parse(postData);
                }

                // Extract slug from URL
                const match = url.match(/problems\/([^/]+)\/submit/);
                const slug = match ? match[1] : 'unknown';

                if (submissionId) {
                    console.log("LCT: Captured submission", submissionId, slug);
                    pending[submissionId] = {
                        lang: payload.lang,
                        code: payload.typed_code,
                        slug: slug,
                        ts: new Date().toISOString()
                    };
                }
            } catch (e) { console.error('LCT: Error parsing submit', e); }
        }

        // Handle CHECK
        // URL usually: https://leetcode.com/submissions/detail/<id>/check/
        if (url.includes('/check/') && method.toUpperCase() === 'GET') {
            try {
                const match = url.match(/detail\/(\d+)\/check/);
                const submissionId = match ? parseInt(match[1]) : null;
                
                if (submissionId && pending[submissionId]) {
                    const response = JSON.parse(responseText);
                    // console.log("LCT: Check response", response);

                    if (response.state === 'SUCCESS') { 
                        const data = pending[submissionId];
                        
                        const runtime = parseInt(response.status_runtime) || 0;
                        
                        let memory = 0;
                        if (response.status_memory) {
                            const memStr = response.status_memory;
                            if (memStr.includes('MB')) {
                                memory = parseFloat(memStr) * 1024;
                            } else {
                                memory = parseFloat(memStr);
                            }
                        }

                        const result = {
                            ...data,
                            status: response.status_msg === "Accepted" ? "accepted" : "rejected",
                            runtime_ms: runtime,
                            memory_kb: Math.round(memory),
                        };

                        console.log("LCT: Sending attempt to content script", result);

                        // Send event to content script
                        window.postMessage({
                            type: 'LEETCODE_ATTEMPT',
                            payload: result
                        }, '*');
                        
                        // Clean up
                        delete pending[submissionId];
                    }
                }
            } catch (e) { console.error('LCT: Error parsing check', e); }
        }
    }

  })();