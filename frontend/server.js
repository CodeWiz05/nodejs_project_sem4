document.addEventListener('DOMContentLoaded', () => {
    const backendUrl = 'http://localhost:3000/api/v1';

    //const scrapeJobsBtn = document.getElementById('scrapeJobsBtn');
    //const scrapeStatusEl = document.getElementById('scrapeStatus');

    const resumeUploadForm = document.getElementById('resumeUploadForm');
    const resumeFileEl = document.getElementById('resumeFile');
    const uploadBtn = document.getElementById('uploadBtn'); // Get the submit button
    const resumeProcessStatusEl = document.getElementById('resumeProcessStatus');
    const parsedResumeDetailsEl = document.getElementById('parsedResumeDetails');
    const parsedResumeTextEl = document.getElementById('parsedResumeText');
    
    const matchingSectionEl = document.getElementById('matching-section');
    const matchJobsBtn = document.getElementById('matchJobsBtn');
    const matchingStatusEl = document.getElementById('matchingStatus');
    // Use the new ID for the status message related to automatic job fetching
    const autoJobFetchStatusEl = document.getElementById('autoJobFetchStatus');
    const jobResultsEl = document.getElementById('jobResults');
    const jobResultsPlaceholder = document.querySelector('#jobResults .placeholder-text');
    const statusSpinnerEl = autoJobFetchStatusEl ? autoJobFetchStatusEl.querySelector('.spinner') : null;
    const statusTextEl = autoJobFetchStatusEl ? autoJobFetchStatusEl.querySelector('.status-text') : null;
    const themeToggleButton = document.getElementById('theme-toggle');

     // Helper to update status with spinner
    function updateAutoFetchStatus(text, showSpinner = false) {
        if (statusTextEl) statusTextEl.textContent = text;
        if (statusSpinnerEl) statusSpinnerEl.style.display = showSpinner ? 'inline-block' : 'none';
    }

    let currentResumeEmbedding = null;
    async function fetchInitialJobs() {
        const statusEl = autoJobFetchStatusEl; // Use the new status element
        updateAutoFetchStatus('Checking for existing jobs...', true);

        if (statusEl) statusEl.textContent = 'Checking for existing jobs...';
        if (jobResultsPlaceholder) jobResultsPlaceholder.textContent = 'Loading jobs...';
        
        try {
            const getJobsResponse = await fetch(`${backendUrl}/jobs?limit=20`);
            if (!getJobsResponse.ok) { // Check if response was successful
                throw new Error(`Failed to get jobs: ${getJobsResponse.status} ${getJobsResponse.statusText}`);
            }
            const getJobsResult = await getJobsResponse.json();

            if (getJobsResult.success && getJobsResult.data && getJobsResult.data.length > 0) {
                if (statusEl) statusEl.textContent = 'Displaying existing jobs. Updating in background...';
                displayJobResults(getJobsResult.data);
                triggerBackgroundJobUpdate(); // Trigger update regardless, but don't await or block UI
                return;
            }
            
            // If no jobs, or an error occurred fetching them, trigger a fresh scrape
            if (statusEl) statusEl.textContent = 'No jobs found or error retrieving. Fetching fresh jobs...';
            await triggerBackgroundJobUpdate(true); // true to indicate initial fetch and then display

            if (getJobsResult.success && getJobsResult.data && getJobsResult.data.length > 0) {
                updateAutoFetchStatus('Displaying existing jobs. Updating in background...', false); // Spinner off for this message
                displayJobResults(getJobsResult.data);
                triggerBackgroundJobUpdate(); // No 'true' here, it will update status itself
                return;
            }
            updateAutoFetchStatus('No existing jobs found. Fetching fresh jobs...', true);
            await triggerBackgroundJobUpdate(true); // Pass true to display after


        } catch (error) {
            updateAutoFetchStatus(`Error fetching initial jobs: ${error.message}. Try refreshing.`, false);
            if (statusEl) statusEl.textContent = `Error fetching initial jobs: ${error.message}. Try refreshing.`;
            if (jobResultsPlaceholder) jobResultsPlaceholder.textContent = 'Could not load jobs. Ensure backend is running.';
            console.error('Fetch Initial Jobs Error:', error);
        }
    }


    async function triggerBackgroundJobUpdate(displayAfter = false) {
        const statusEl = autoJobFetchStatusEl; // Use the new status element
        if (!displayAfter) { // If it's just a background update
            updateAutoFetchStatus('Updating job listings...', true);
        } else { // If it's an initial fetch
             updateAutoFetchStatus('Fetching fresh job listings...', true);
        }
        
        try {
            const response = await fetch(`${backendUrl}/jobs/scrape`, { method: 'POST' });
            if (!response.ok) {
                throw new Error(`Scrape API call failed: ${response.status} ${response.statusText}`);
            }
            const result = await response.json();
            
            let message = "Job data update: ";
            if (result.success && result.data && result.data[0] && result.data[0].status === 'success') {
                message = `Jobs updated successfully (Added: ${result.data[0].jobsAdded}, Existed: ${result.data[0].jobsAlreadyExisted}).`;
            } else if (result.data && result.data[0] && result.data[0].error) {
                 message = `Job update failed: ${result.data[0].error}`;
            } else {
                message = "Job update process completed with unclear results.";
            }
            updateAutoFetchStatus(message, false); // Spinner off

            // ... (logic for displayAfter as before) ...
            if (displayAfter && result.success && result.data[0]?.status === 'success') {
                // ... fetch and display jobs ...
                // Optionally update status again after displaying
                // updateAutoFetchStatus("Fresh jobs loaded!", false); 
            } else if (displayAfter) {
                // updateAutoFetchStatus(`Job update process reported: ${result.message || result.data[0]?.status}. No new jobs to display.`, false);
            }


        } catch (error) {
            updateAutoFetchStatus(`Failed to update job listings: ${error.message}`, false);
            console.error('Background Job Update Error:', error);
        }
    }

    // --- Theme Toggle Functionality ---
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme) {
        document.body.setAttribute('data-theme', currentTheme);
        if (themeToggleButton) {
            themeToggleButton.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
        }
    }

    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', () => {
            let theme = document.body.getAttribute('data-theme');
            if (theme === 'dark') {
                document.body.removeAttribute('data-theme');
                localStorage.removeItem('theme');
                themeToggleButton.textContent = '🌙';
            } else {
                document.body.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                themeToggleButton.textContent = '☀️';
            }
        });
    }

    // Helper to toggle button busy state
    const setButtonBusy = (button, isBusy) => {
        if (button) {
            button.setAttribute('aria-busy', isBusy ? 'true' : 'false');
            button.disabled = isBusy;
        }
    };
    
    /*  if (scrapeJobsBtn) {
        scrapeJobsBtn.addEventListener('click', async () => {
            scrapeStatusEl.textContent = 'Fetching jobs from API... please wait.';
            setButtonBusy(scrapeJobsBtn, true);
            try {
                const response = await fetch(`${backendUrl}/jobs/scrape`, { method: 'POST' });
                const result = await response.json();
                // Create a more readable summary, especially for multiple scrapers
                let summary = "Scraping process update:\n";
                if (result.data && Array.isArray(result.data)) {
                    result.data.forEach(item => {
                        summary += `Source: ${item.source || 'Unknown'} - Status: ${item.status || 'N/A'}`;
                        if(item.status === 'success' || item.status === 'success_mocked'){
                            summary += ` (Found: ${item.jobsFound}, Added: ${item.jobsAdded}, Existed: ${item.jobsAlreadyExisted}, Embed Failed: ${item.jobsFailedToEmbed})\n`;
                        } else if (item.error) {
                            summary += ` - Error: ${item.error}\n`;
                        } else {
                            summary += ` - No further details.\n`;
                        }
                    });
                } else if (result.message) {
                    summary += result.message;
                } else {
                    summary += "Unexpected response structure.";
                }
                scrapeStatusEl.textContent = summary.trim();
                scrapeStatusEl.style.whiteSpace = 'pre-wrap'; // Allow newlines in status
                alert(summary.trim());

            } catch (error) {
                scrapeStatusEl.textContent = 'Failed to trigger job fetching. Is the backend running? Check console.';
                alert('Failed to trigger job fetching. Check console.');
                console.error('Scrape Jobs Error:', error);
            }
            setButtonBusy(scrapeJobsBtn, false);
        });
    }  */

    if (resumeUploadForm) {
        resumeUploadForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!resumeFileEl.files || resumeFileEl.files.length === 0) {
                resumeProcessStatusEl.textContent = 'Please select a PDF file.';
                return;
            }

            const formData = new FormData();
            formData.append('resumeFile', resumeFileEl.files[0]);

            resumeProcessStatusEl.textContent = 'Uploading and processing resume...';
            setButtonBusy(uploadBtn, true);
            parsedResumeDetailsEl.style.display = 'none';
            if (jobResultsPlaceholder) jobResultsPlaceholder.style.display = 'block';
            jobResultsEl.innerHTML = ''; // Clear previous results
            matchingSectionEl.style.display = 'none';

            try {
                const response = await fetch(`${backendUrl}/resume/upload`, {
                    method: 'POST',
                    body: formData,
                });
                const result = await response.json();

                if (result.success && result.data) {
                    let statusMsg = `Resume processed: ${result.data.originalFilename}. `;
                    if (result.data.parsedText && result.data.parsedText.trim()) {
                        statusMsg += 'Text extracted successfully. ';
                        parsedResumeTextEl.textContent = result.data.parsedText;
                        parsedResumeDetailsEl.style.display = 'block';
                    } else {
                        statusMsg += 'Warning: No text content extracted from PDF. ';
                        parsedResumeTextEl.textContent = 'No text content found in PDF.';
                        parsedResumeDetailsEl.style.display = 'block'; // Show it anyway
                    }
                    
                    currentResumeEmbedding = result.data.resumeEmbedding;
                    if (currentResumeEmbedding && currentResumeEmbedding.length > 0) {
                        matchingSectionEl.style.display = 'block'; // Show matching section
                        statusMsg += 'Embedding generated.';
                    } else {
                        statusMsg += 'Could not generate embedding (or no text to embed).';
                        matchingSectionEl.style.display = 'none'; // Keep hidden if no embedding
                    }
                    resumeProcessStatusEl.textContent = statusMsg;
                } else {
                    resumeProcessStatusEl.textContent = `Error: ${result.message || 'Failed to process resume.'}`;
                    currentResumeEmbedding = null;
                }
            } catch (error) {
                resumeProcessStatusEl.textContent = 'Upload failed. Is the backend running? Check console.';
                currentResumeEmbedding = null;
                console.error('Resume Upload Error:', error);
            }
            setButtonBusy(uploadBtn, false);
        });
    }

    if (matchJobsBtn) {
        matchJobsBtn.addEventListener('click', async () => {
            if (!currentResumeEmbedding || currentResumeEmbedding.length === 0) {
                matchingStatusEl.textContent = 'Please upload and process a resume first to get an embedding.';
                return;
            }

            matchingStatusEl.textContent = 'Finding matching jobs...';
            if (jobResultsPlaceholder) jobResultsPlaceholder.style.display = 'none';
            jobResultsEl.innerHTML = ''; 
            setButtonBusy(matchJobsBtn, true);

            try {
                const response = await fetch(`${backendUrl}/match/jobs`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        resumeEmbedding: currentResumeEmbedding,
                        topN: 7, // Increased default for demo
                    }),
                });
                const result = await response.json();
                if (result.success && result.data) {
                    if (result.data.length > 0) {
                        matchingStatusEl.textContent = `Found ${result.data.length} matched jobs.`;
                        displayJobResults(result.data);
                    } else {
                        matchingStatusEl.textContent = 'No matching jobs found based on your resume.';
                         if (jobResultsPlaceholder) {
                            jobResultsPlaceholder.textContent = 'No matching jobs found.';
                            jobResultsPlaceholder.style.display = 'block';
                        }
                    }
                } else {
                    matchingStatusEl.textContent = `Matching error: ${result.message || 'Failed to find matches.'}`;
                }
            } catch (error) {
                matchingStatusEl.textContent = 'Matching request failed. Is the backend running? Check console.';
                console.error('Match Jobs Error:', error);
            }
            setButtonBusy(matchJobsBtn, false);
        });
    }

    function displayJobResults(jobs) {
        jobResultsEl.innerHTML = ''; // Clear previous, including placeholder if any
        const placeholder = jobResultsEl.querySelector('#jobResults .placeholder-text');
        if(placeholder) placeholder.style.display = 'none';


        if (jobs.length === 0) {
            jobResultsEl.innerHTML = '<p class="placeholder-text">No matching jobs found for your resume.</p>';
            return;
        }

        jobs.forEach(job => {
            const jobCard = document.createElement('article');
            jobCard.className = 'job-card-custom';
            // No need to add class 'job-card' if Pico.css styles 'article' well enough,
            // or if your CSS targets '#jobResults article'
            
            // Sanitize display values
            const title = job.title || 'N/A';
            const company = job.company || 'N/A';
            const location = job.location || 'N/A';
            const source = job.source || 'N/A';
            const url = job.url || '#';
            const descriptionSnippet = job.parsedDescriptionSnippet || 'No description snippet available.';
            const similarityText = job.similarityScore ? `<mark>${(job.similarityScore * 100).toFixed(1)}%</mark>` : 'N/A';

            jobCard.innerHTML = `
                <header>
                    <h3>${title}</h3>
                </header>
                <p><strong>Company:</strong> ${company}</p>
                <p><strong>Location:</strong> ${location}</p>
                <p><strong>Source:</strong> ${source}</p>
                <p><strong>Similarity: ${similarityText}</strong></p>
                <details>
                    <summary>View Description Snippet</summary>
                    <p>${descriptionSnippet}</p>
                </details>
                <footer style="margin-top: auto; padding-top: 1rem; border-top: 1px solid #e9ecef;"> 
                    <!-- Added inline style for consistent footer push with flexbox -->
                    <a href="${url}" target="_blank" role="button" class="outline">View Job Listing</a>
                </footer>
            `;
            jobResultsEl.appendChild(jobCard);
        });
    }
    fetchInitialJobs();
});