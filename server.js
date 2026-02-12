const http = require("http");
const url = require("url");
const { verifyEmail } = require("./emailVerifier");

let port = process.env.PORT || 3000;

const createServer = () => {
  const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    const method = req.method;

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (path === "/verify" && method === "GET") {
      const email = parsedUrl.query.email;

      if (!email) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Email parameter is required" }));
        return;
      }

      try {
        const result = await verifyEmail(email);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result, null, 2));
      } catch (error) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: "Internal Server Error",
            details: error.message,
          }),
        );
      }
    } else {
      // Updated UI with Input Field
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Email Verification Tool</title>
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
                    <style>
                        :root {
                            --primary: #6366f1;
                            --primary-hover: #4f46e5;
                            --bg: #f8fafc;
                            --card-bg: #ffffff;
                            --text: #1e293b;
                            --text-light: #64748b;
                            --border: #e2e8f0;
                            --success: #10b981;
                            --error: #ef4444;
                        }

                        * { box-sizing: border-box; margin: 0; padding: 0; }
                        
                        body {
                            font-family: 'Inter', sans-serif;
                            background-color: var(--bg);
                            color: var(--text);
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            min-height: 100vh;
                            padding: 20px;
                        }

                        .container {
                            width: 100%;
                            max-width: 600px;
                            background: var(--card-bg);
                            border-radius: 12px;
                            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
                            padding: 2rem;
                        }

                        h1 {
                            font-size: 1.5rem;
                            font-weight: 600;
                            margin-bottom: 0.5rem;
                            color: var(--text);
                        }

                        p {
                            color: var(--text-light);
                            margin-bottom: 2rem;
                            font-size: 0.95rem;
                        }

                        .input-group {
                            display: flex;
                            gap: 10px;
                            margin-bottom: 1.5rem;
                        }

                        input[type="email"] {
                            flex: 1;
                            padding: 12px 16px;
                            border: 1px solid var(--border);
                            border-radius: 8px;
                            font-size: 1rem;
                            font-family: inherit;
                            outline: none;
                            transition: border-color 0.2s, box-shadow 0.2s;
                        }

                        input[type="email"]:focus {
                            border-color: var(--primary);
                            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
                        }

                        button {
                            background-color: var(--primary);
                            color: white;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 8px;
                            font-weight: 500;
                            cursor: pointer;
                            transition: background-color 0.2s;
                            font-size: 1rem;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                        }

                        button:hover {
                            background-color: var(--primary-hover);
                        }

                        button:disabled {
                            opacity: 0.7;
                            cursor: not-allowed;
                        }

                        .result-card {
                            background: #f1f5f9;
                            border-radius: 8px;
                            padding: 1.5rem;
                            display: none;
                            border: 1px solid var(--border);
                        }
                        
                        .result-card.visible {
                            display: block;
                            animation: fadeIn 0.3s ease-in-out;
                        }

                        .status-badge {
                            display: inline-flex;
                            align-items: center;
                            padding: 4px 12px;
                            border-radius: 9999px;
                            font-size: 0.875rem;
                            font-weight: 500;
                            margin-bottom: 1rem;
                        }

                        .status-valid {
                            background-color: #dcfce7;
                            color: #166534;
                        }

                        .status-invalid {
                            background-color: #fee2e2;
                            color: #991b1b;
                        }
                        
                        .status-unknown {
                            background-color: #fefaca;
                            color: #854d0e;
                        }

                        .details-grid {
                            display: grid;
                            grid-template-columns: auto 1fr;
                            gap: 8px 16px;
                            font-size: 0.9rem;
                        }

                        .label {
                            color: var(--text-light);
                            font-weight: 500;
                        }

                        .value {
                            font-family: monospace;
                            word-break: break-all;
                        }

                        .loading-spinner {
                            border: 2px solid rgba(255,255,255,0.3);
                            border-radius: 50%;
                            border-top: 2px solid #fff;
                            width: 16px;
                            height: 16px;
                            animation: spin 1s linear infinite;
                            display: none;
                        }

                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                        
                        @keyframes fadeIn {
                            from { opacity: 0; transform: translateY(5px); }
                            to { opacity: 1; transform: translateY(0); }
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>Email Verifier</h1>
                        <p>Enter an email address to verify its validity, MX records, and SMTP status.</p>
                        
                        <form id="verifyForm" class="input-group">
                            <input type="email" id="emailInput" placeholder="name@example.com" required>
                            <button type="submit" id="submitBtn">
                                <span class="btn-text">Verify</span>
                                <div class="loading-spinner"></div>
                            </button>
                        </form>

                        <div id="resultCard" class="result-card">
                            <div id="statusBadge" class="status-badge"></div>
                            <div class="details-grid" id="detailsGrid">
                                <!-- Details injected here -->
                            </div>
                        </div>
                    </div>

                    <script>
                        const form = document.getElementById('verifyForm');
                        const emailInput = document.getElementById('emailInput');
                        const submitBtn = document.getElementById('submitBtn');
                        const spinner = document.querySelector('.loading-spinner');
                        const btnText = document.querySelector('.btn-text');
                        const resultCard = document.getElementById('resultCard');
                        const statusBadge = document.getElementById('statusBadge');
                        const detailsGrid = document.getElementById('detailsGrid');

                        form.addEventListener('submit', async (e) => {
                            e.preventDefault();
                            const email = emailInput.value.trim();
                            if (!email) return;

                            // UI Loading State
                            submitBtn.disabled = true;
                            spinner.style.display = 'block';
                            btnText.style.display = 'none';
                            resultCard.classList.remove('visible');

                            try {
                                const response = await fetch(\`/verify?email=\${encodeURIComponent(email)}\`);
                                const data = await response.json();

                                // Update Status Badge
                                statusBadge.className = 'status-badge';
                                if (data.result === 'valid') {
                                    statusBadge.classList.add('status-valid');
                                    statusBadge.textContent = 'Valid Email';
                                } else if (data.result === 'invalid') {
                                    statusBadge.classList.add('status-invalid');
                                    statusBadge.textContent = 'Invalid Email';
                                } else {
                                    statusBadge.classList.add('status-unknown');
                                    statusBadge.textContent = 'Unknown Status';
                                }

                                // Update Details Grid
                                let detailsHtml = '';
                                
                                // NEW: Steps Visualization
                                if (data.steps) {
                                    detailsHtml += \`
                                        <div style="grid-column: 1 / -1; margin-bottom: 1rem; border-bottom: 1px solid var(--border); padding-bottom: 1rem;">
                                            <h3 style="font-size: 1rem; margin-bottom: 0.5rem; color: var(--text);">Verification Steps</h3>
                                            <div style="display: flex; flex-direction: column; gap: 8px;">
                                                \${renderStep('Syntax Check', data.steps.syntax)}
                                                \${renderStep('MX Records', data.steps.mx)}
                                                \${renderStep('SMTP Connection', data.steps.smtp)}
                                            </div>
                                        </div>
                                    \`;
                                }

                                const fields = [
                                    { key: 'email', label: 'Email' },
                                    { key: 'subresult', label: 'Reason' },
                                    { key: 'domain', label: 'Domain' },
                                    { key: 'disposable', label: 'Disposable' },
                                    { key: 'roleBased', label: 'Role-Based' },
                                    { key: 'smtpBlocked', label: 'SMTP Blocked' },
                                    { key: 'executiontime', label: 'Time (s)' }
                                ];

                                if (data.error) {
                                    detailsHtml += \`<div class="label">Error</div><div class="value" style="color:var(--error)">\${data.error}</div>\`;
                                }
                                
                                if (data.didyoumean) {
                                     detailsHtml += \`<div class="label">Suggestion</div><div class="value" style="color:var(--primary)">Did you mean <strong>\${data.didyoumean}</strong>?</div>\`;
                                }

                                fields.forEach(field => {
                                    if (data[field.key] !== undefined && data[field.key] !== null) {
                                        detailsHtml += \`<div class="label">\${field.label}</div><div class="value">\${data[field.key]}</div>\`;
                                    }
                                });

                                // Append Raw JSON Viewer
                                detailsHtml += \`
                                    <div style="grid-column: 1 / -1; margin-top: 1rem; border-top: 1px solid var(--border); padding-top: 1rem;">
                                        <h3 style="font-size: 1rem; margin-bottom: 0.5rem; color: var(--text);">Full Response</h3>
                                        <pre style="background: #e2e8f0; padding: 10px; border-radius: 6px; font-size: 0.8rem; overflow-x: auto;">\${JSON.stringify(data, null, 2)}</pre>
                                    </div>
                                \`;

                                detailsGrid.innerHTML = detailsHtml;
                                resultCard.classList.add('visible');

                            } catch (error) {
                                alert('An error occurred while verifying the email.');
                                console.error(error);
                            } finally {
                                submitBtn.disabled = false;
                                spinner.style.display = 'none';
                                btnText.style.display = 'block';
                            }
                        });

                        function renderStep(name, step) {
                            if (!step) return '';
                            let icon = '⚪'; // Pending/Skipped
                            let color = 'var(--text-light)';
                            
                            if (step.valid === true) {
                                icon = '✅';
                                color = 'var(--success)';
                            } else if (step.valid === false) {
                                icon = '❌';
                                color = 'var(--error)';
                            } else if (step.valid === null) {
                                icon = '⚠️'; 
                                color = '#eab308';
                            }

                            return \`
                                <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.9rem;">
                                    <span style="display: flex; align-items: center; gap: 8px;">
                                        <span>\${icon}</span>
                                        <span style="font-weight: 500;">\${name}</span>
                                    </span>
                                    <span style="color: \${color}; font-size: 0.85rem;">\${step.message || ''}</span>
                                </div>
                            \`;
                        }
                    </script>
                </body>
                </html>
            `);
    }
  });

  server.on("error", (e) => {
    if (e.code === "EADDRINUSE") {
      console.log(`Port ${port} is in use, trying ${port + 1}...`);
      port++;
      server.close();
      createServer();
    } else {
      console.error(e);
    }
  });

  server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
};

createServer();
