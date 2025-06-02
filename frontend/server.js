document.addEventListener('DOMContentLoaded', () => {
    const backendUrl = 'http://localhost:3000/api/v1';

    const scrapeJobsBtn = document.getElementById('scrapeJobsBtn');
    const scrapeStatusEl = document.getElementById('scrapeStatus');

    const resumeUploadForm = document.getElementById('resumeUploadForm');
    const resumeFileEl = document.getElementById('resumeFile');
    const uploadBtn = document.getElementById('uploadBtn'); // Get the submit button
    const resumeProcessStatusEl = document.getElementById('resumeProcessStatus');
    const parsedResumeDetailsEl = document.getElementById('parsedResumeDetails');
    const parsedResumeTextEl = document.getElementById('parsedResumeText');
    
    const matchingSectionEl = document.getElementById('matching-section');
    const matchJobsBtn = document.getElementById('matchJobsBtn');
    const matchingStatusEl = document.getElementById('matchingStatus');
    const jobResultsEl = document.getElementById('jobResults');
    const jobResultsPlaceholder = document.querySelector('#jobResults .placeholder-text');

    let currentResumeEmbedding = null;

    // Helper to toggle button busy state
    const setButtonBusy = (button, isBusy) => {
        if (button) {
            button.setAttribute('aria-busy', isBusy ? 'true' : 'false');
            button.disabled = isBusy;
        }
    };

    if (scrapeJobsBtn) {
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
    }

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
        if (jobs.length === 0) {
            jobResultsEl.innerHTML = '<p class="placeholder-text">No matching jobs found.</p>';
            return;
        }
        jobs.forEach(job => {
            const jobCard = document.createElement('article'); // Use article for semantic job card
            // jobCard.className = 'job-card'; // Pico might style article directly
            jobCard.innerHTML = `
                <header>
                    <h3>${job.title || 'N/A'}</h3>
                </header>
                <p><strong>Company:</strong> ${job.company || 'N/A'}</p>
                <p><strong>Location:</strong> ${job.location || 'N/A'}</p>
                <p><strong>Source:</strong> ${job.source || 'N/A'}</p>
                ${job.similarityScore ? `<p><strong>Similarity: <mark>${(job.similarityScore * 100).toFixed(1)}%</mark></strong></p>` : ''}
                <footer>
                    <a href="${job.url}" target="_blank" role="button" class="outline">View Job</a>
                </footer>
                <details>
                    <summary>Description Snippet</summary>
                    <p>${job.parsedDescriptionSnippet || 'No description snippet available.'}</p>
                </details>
                <hr style="margin: 1rem 0;">
            `;
            jobResultsEl.appendChild(jobCard);
        });
    }
});