document.addEventListener('DOMContentLoaded', () => {
    const backendUrl = 'http://localhost:3000/api/v1';
    
    // Status element for automatic job fetch
    const autoJobFetchStatusEl = document.getElementById('autoJobFetchStatus');
    const statusSpinnerEl = autoJobFetchStatusEl ? autoJobFetchStatusEl.querySelector('.spinner') : null;
    const statusTextEl = autoJobFetchStatusEl ? autoJobFetchStatusEl.querySelector('.status-text') : null;

    // Resume related elements
    const resumeUploadForm = document.getElementById('resumeUploadForm');
    const resumeFileEl = document.getElementById('resumeFile');
    const uploadBtn = document.getElementById('uploadBtn');
    const resumeProcessStatusEl = document.getElementById('resumeProcessStatus');
    const parsedResumeDetailsEl = document.getElementById('parsedResumeDetails');
    const parsedResumeTextEl = document.getElementById('parsedResumeText');
    
    // Matching related elements
    const matchingSectionEl = document.getElementById('matching-section');
    const matchJobsBtn = document.getElementById('matchJobsBtn');
    const matchingStatusEl = document.getElementById('matchingStatus');
    
    // Job results elements
    const jobResultsEl = document.getElementById('jobResults');
    const jobResultsPlaceholder = jobResultsEl ? jobResultsEl.querySelector('.placeholder-text') : null;
    
    const themeToggleButton = document.getElementById('theme-toggle');
    let currentResumeEmbedding = null;

    // --- Helper to update auto fetch status with spinner ---
    function updateAutoFetchStatus(text, showSpinner = false) {
        if (statusTextEl) statusTextEl.textContent = text;
        if (statusSpinnerEl) statusSpinnerEl.style.display = showSpinner ? 'inline-block' : 'none';
    }

    // --- Helper to toggle button busy state ---
    const setButtonBusy = (button, isBusy) => {
        if (button) {
            button.setAttribute('aria-busy', isBusy ? 'true' : 'false');
            button.disabled = isBusy;
        }
    };

    // --- Theme Toggle Functionality ---
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme) {
        document.body.setAttribute('data-theme', currentTheme);
        if (themeToggleButton) themeToggleButton.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
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
    
    // --- Function to trigger background job update (API scrape) ---
    async function triggerInitialJobDataUpdate() {
        updateAutoFetchStatus('Updating job listings...', true); // Show "Updating..." with spinner
        let finalStatusMessage = 'Job listings updated successfully.'; // Optimistic default
        let updateError = false;

        try {
            const response = await fetch(`${backendUrl}/jobs/scrape`, { method: 'POST' });
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data && Array.isArray(result.data) && result.data.length > 0 && result.data[0]) {
                    const item = result.data[0];
                    if (item.status === 'success' || item.status === 'success_mocked') {
                        // Log details for dev, but keep UI message simple
                        console.log(`Job Update Details: Source records: ${item.jobsFound}, Added: ${item.jobsAdded}, Existed: ${item.jobsAlreadyExisted}, Embed Failed: ${item.jobsFailedToEmbed}`);
                    } else if (item.error) {
                        finalStatusMessage = `Job update issue: ${item.error}`;
                        updateError = true;
                    }
                } else if (!result.success && result.message) {
                     finalStatusMessage = `Job update issue: ${result.message}`;
                     updateError = true;
                }
            } else {
                finalStatusMessage = `Job data update failed: Server responded with ${response.status}.`;
                updateError = true;
            }
        } catch (error) {
            finalStatusMessage = `Failed to update job listings: ${error.message}`;
            console.error('Initial Job Data Update Error:', error);
            updateError = true;
        }
        updateAutoFetchStatus(finalStatusMessage, false); // Update to final message and hide spinner
        if(updateError && jobResultsPlaceholder) {
            jobResultsPlaceholder.textContent = "Could not update job listings. Please ensure backend services are running and try refreshing."
        }
    }

    // --- Function to handle initial page load ---
    async function initializePage() {
        updateAutoFetchStatus('Initializing JobSense...', false); // No spinner initially
        if (jobResultsPlaceholder) {
            jobResultsPlaceholder.textContent = 'Upload a resume and click "Match Jobs" to see results.';
            jobResultsPlaceholder.style.display = 'block';
        }
        jobResultsEl.innerHTML = ''; // Clear any job cards
        jobResultsEl.appendChild(jobResultsPlaceholder); // Ensure placeholder is the only content

        // Trigger the job data update in the background.
        // This will show "Updating..." and then "Job listings updated successfully."
        await triggerInitialJobDataUpdate(); 
    }

    // --- Resume Upload Logic ---
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
            
            // Clear previous match results and show placeholder
            if (jobResultsPlaceholder) {
                jobResultsPlaceholder.textContent = 'Upload a resume and click "Match Jobs" to see results.';
                jobResultsPlaceholder.style.display = 'block';
            }
            jobResultsEl.innerHTML = ''; 
            jobResultsEl.appendChild(jobResultsPlaceholder);
            matchingSectionEl.style.display = 'none';


            try {
                const response = await fetch(`${backendUrl}/resume/upload`, { method: 'POST', body: formData });
                const result = await response.json();
                if (result.success && result.data) {
                    let statusMsg = `Resume processed: ${result.data.originalFilename}. `;
                    if (result.data.parsedText && result.data.parsedText.trim()) {
                        statusMsg += 'Text extracted. ';
                        parsedResumeTextEl.textContent = result.data.parsedText;
                        parsedResumeDetailsEl.style.display = 'block';
                    } else {
                        statusMsg += 'Warning: No text extracted. ';
                        parsedResumeTextEl.textContent = 'No text content found in PDF.';
                        parsedResumeDetailsEl.style.display = 'block';
                    }
                    currentResumeEmbedding = result.data.resumeEmbedding;
                    if (currentResumeEmbedding && currentResumeEmbedding.length > 0) {
                        matchingSectionEl.style.display = 'block';
                        statusMsg += 'Embedding generated.';
                        matchingStatusEl.textContent = ''; // Clear previous matching status
                    } else {
                        statusMsg += 'Could not generate embedding.';
                        matchingSectionEl.style.display = 'none';
                    }
                    resumeProcessStatusEl.textContent = statusMsg;
                } else {
                    resumeProcessStatusEl.textContent = `Error: ${result.message || 'Failed to process resume.'}`;
                    currentResumeEmbedding = null;
                }
            } catch (error) {
                resumeProcessStatusEl.textContent = 'Upload failed. Check console.';
                currentResumeEmbedding = null;
                console.error('Resume Upload Error:', error);
            }
            setButtonBusy(uploadBtn, false);
        });
    }

    // --- Match Jobs Logic ---
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
                        topN: 7, 
                    }),
                });
                const result = await response.json();
                if (result.success && result.data) {
                    if (result.data.length > 0) {
                        matchingStatusEl.textContent = `Found ${result.data.length} matched jobs.`;
                        displayJobResults(result.data); // This function will handle the placeholder internally
                    } else {
                        matchingStatusEl.textContent = 'No matching jobs found based on your resume.';
                        displayJobResults([]); // Call with empty array to show placeholder
                    }
                } else {
                    matchingStatusEl.textContent = `Matching error: ${result.message || 'Failed to find matches.'}`;
                    displayJobResults([]); // Show placeholder on error too
                }
            } catch (error) {
                matchingStatusEl.textContent = 'Matching request failed. Check console.';
                console.error('Match Jobs Error:', error);
                displayJobResults([]); // Show placeholder on error
            }
            setButtonBusy(matchJobsBtn, false);
        });
    }

    // --- Function to display job results ---
    function displayJobResults(jobs) {
        jobResultsEl.innerHTML = ''; // Clear everything, including any old placeholder

        if (!jobs || jobs.length === 0) {
            // Create and append the placeholder if no jobs
            const p = document.createElement('p');
            p.className = 'placeholder-text';
            p.textContent = jobResultsPlaceholder ? jobResultsPlaceholder.textContent : 'No jobs to display.'; // Use original placeholder text or default
            if(matchingStatusEl.textContent.includes("No matching jobs found")) { // More specific message if it was a match attempt
                p.textContent = "No matching jobs found for this resume.";
            }
            jobResultsEl.appendChild(p);
            return;
        }

         jobs.forEach(job => {
            const jobCard = document.createElement('article');
            jobCard.className = 'job-card-custom'; 
            
            const title = job.title || 'N/A';
            const company = job.company || 'N/A';
            const location = job.location || 'N/A';
            const source = job.source || 'N/A';
            const url = job.url || '#';
            const descriptionSnippet = job.parsedDescriptionSnippet || 'No description snippet available.';
            const similarityText = job.similarityScore ? `<mark>${(job.similarityScore * 100).toFixed(1)}%</mark>` : '';

            jobCard.innerHTML = `
                <header><h3>${title}</h3></header>
                <p><strong>Company:</strong> ${company}</p>
                <p><strong>Location:</strong> ${location}</p>
                ${source !== 'N/A' ? `<p><strong>Source:</strong> ${source}</p>` : ''}
                ${similarityText ? `<p><strong>Similarity: ${similarityText}</strong></p>` : ''}
                <details><summary>View Description Snippet</summary><p>${descriptionSnippet}</p></details>
                <footer style="margin-top: auto; padding-top: 1rem; border-top: 1px solid #e9ecef;"><a href="${url}" target="_blank" role="button" class="outline">View Job Listing</a></footer>
            `;
            jobResultsEl.appendChild(jobCard);
        });
    }

    // --- Initialize Page ---
    initializePage();
});