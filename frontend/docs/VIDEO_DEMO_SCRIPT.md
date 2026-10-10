# MeghDrishti video demonstration script

Prepared from the current React routes, Portfolio workspace, Scenarios, Results, Graph, Locations, Compare, Evidence, Reports and authentication controls. Suggested length: 7–9 minutes. This is a recording guide; no application code was changed.

## Before recording

- Open http://127.0.0.1:5173/welcome. Keep the frontend and backend running. If stopped, run `npm run dev:full` from the project root and wait for both services.
- Rehearse the exact sequence once. Use a confirmed account and enter credentials before recording or cut the credential entry from the video. Hide the signed-in email in the final video if necessary. Never show environment files, passwords, API keys or access tokens.
- If already signed in, Get Started opens Overview directly. Do not claim this is a fresh login; use a short previously rehearsed login segment if authentication must be shown.
- Use the application's sidebar and links between pages. A full reload loses the in-memory private run; recover it through Reports → Open before continuing.
- Do not change the dataset selector after loading the Sectivia sample. Do not click the older bottom **Load sample portfolio** action, which loads the currently selected dataset's generic demo sample.
- Repeated sample loading creates a new unsaved portfolio identity. For later takes, reopen the saved sample through My Portfolios instead of repeatedly saving new copies.
- Keep the default sample scenario unchanged for the numeric examples below. Changing scenario inputs marks the draft dirty and requires Save Portfolio again before private analysis.
- Check Gemini and optional weather once before recording. External APIs can fail or run slowly. Never substitute invented responses. Comparison and report requests encountered intermittent Failed to fetch errors during live verification; retry explicitly or cut the wait from the recording.

## 1. Landing — /welcome — 25 seconds

**Clicks:** Show the title and introductory text, then click **Get Started**.

**Say:** “MeghDrishti helps investors explore how an operational climate disruption can travel through supplier relationships into their portfolio. Instead of treating each company in isolation, we trace the dependency chain, show evidence gaps, and compare allocations under the same scenario.”

**Transition:** If signed out, this opens authentication. If signed in, it opens Overview.

**Presenter note:** Some landing text still refers to the fictional reference fixture and says live weather is not connected. Do not narrate those statements as the current Sectivia capability. This demonstration uses real company identities and dataset-reported relationships, with explicitly synthetic operational assumptions.

## 2. Authentication — /auth — 20 seconds

**Clicks:** Use **Sign in**, enter your own Email and Password off-camera, and submit **Sign in**. If already authenticated, skip the form and explain that the session is already active.

**Say:** “The working area requires authentication. Private portfolios and reports belong to the signed-in account. We are now entering an authenticated workspace.”

**Show:** The workspace navigation and signed-in status after success.

**Avoid:** Live signup, email confirmation and password reset during the short product demo; these depend on email delivery. Do not sign out in the middle of demonstrating a private report.

## 3. Portfolio — /portfolio — 50 seconds

**Clicks:** Sidebar **Portfolio** → prominent **Load Sample Investment Portfolio**. If an unsaved draft exists, accept replacement only if it is safe to discard. Show the header Dataset value **Sectivia + synthetic operations**, the four rows, matched status and Total.

| Company ID | Company | Simulated allocation |
| --- | --- | ---: |
| a | Agilent Technologies | ₹10,00,000 |
| abbv | AbbVie | ₹40,00,000 |
| cah | Cardinal Health | ₹30,00,000 |
| cvs | CVS Health | ₹20,00,000 |
| | Total | ₹1,00,00,000 |

**Say:** “One click loads a valid ₹1 crore sample investment portfolio from the installed Sectivia dataset. All four holdings match actual company records. The investment amounts are simulated. The dataset records relationships connecting Agilent, AbbVie, Cardinal Health and CVS, which lets us demonstrate downstream propagation.”

**Clicks:** Show **Portfolio Name**, optionally rename before saving, then click **Save Portfolio**. Wait for **Saved successfully in Supabase.**

**Say:** “Loading does not automatically save or run anything. I explicitly save the portfolio to my account. Private analysis uses this saved version, so unsaved edits cannot silently change the analysis inputs.”

**Optional short insert:** Point to Company search, Add holding and Choose CSV. Say “Users can also search supported companies or import and review a CSV.” Do not claim to demonstrate CSV upload unless you actually perform its preview and commit workflow.

## 4. Scenarios — /scenarios — 35 seconds

**Clicks:** Sidebar **Scenarios**. Show **Stored synthetic event**, **Shock mapping** = **Synthetic facility heat what-if**, Event intensity = 0.8, Transmission multiplier = 0.7, Commercial hops = 3. Do not edit inputs or click mode buttons during the main take.

**Say:** “For this demonstration, we use a supplied synthetic facility heat event. Event intensity is 0.8, transmission is 0.7, and propagation is limited to three commercial hops. The model prevents circular amplification and uses the strongest supported simple path rather than adding overlapping paths.”

**Clicks:** Click **Analyze saved portfolio** and wait for Results. If disabled because you changed an input, return to Portfolio → Save Portfolio, then analyze.

**Avoid:** **Use reference heat scenario** has a misleading generic name; it resets the selected dataset's scenario. It is unnecessary for this take. **Automatic screening** currently uses stored synthetic fixtures, not live weather-triggered analysis.

## 5. Results — /results/<run-id> — 60 seconds

**Clicks:** Show the immutable private cloud snapshot ID and dataset version. Show metrics, then scroll to Holding-level results and Paths.

**Say:** “The completed report uses the saved Sectivia portfolio and an immutable source snapshot. Total capital is ₹1 crore. Under this exact synthetic scenario, assumed stress-weighted exposure is ₹4,73,532.89. This is a modeled exposure measure, not a forecast of financial loss.”

**Show and say:** “Agilent receives direct modeled stress. AbbVie receives downstream stress at one commercial hop, Cardinal Health at two, and CVS at three. Unknown direct inputs remain unknown rather than becoming zero. Only the strongest supported path contributes to each holding.”

Expected default results from live verification:

| Holding | Selected stress / 100 | Assumed weighted exposure |
| --- | ---: | ---: |
| Agilent | 30 | ₹3,00,000.00 |
| AbbVie | 4.2 | ₹1,68,000.00 |
| Cardinal Health | approximately 0.171 | ₹5,121.29 |
| CVS | approximately 0.021 | ₹411.60 |

**Presenter note:** CVS's strongest branch runs through McKesson in this scenario. The recorded Cardinal-to-CVS branch remains an alternative. Do not say the sample's four-company chain is necessarily the winning path.

## 6. Gemini assessment — on Results — 40 seconds

**Clicks:** Scroll to **AI climate risk assessment** → **Generate AI Assessment** → wait for completion. Show Model and scroll through the six headings: Executive summary; Principal modeled risk drivers; Supply-chain disruption; Climate context and availability; Evidence gaps and uncertainty; Risk-reduction considerations.

**Say:** “Gemini interprets this completed analysis when I request it. The backend supplies grounded model facts and validates the response. The assessment explains the modeled drivers and evidence gaps without changing the saved calculations. It also states when verified weather or projection context is absent.”

**Show:** Actual model returned; live verification used gemini-2.5-flash. Do not promise a particular model if the configuration has changed.

**If unavailable:** Say “The external assessment service is unavailable for this request; the deterministic analysis and report remain usable.” Continue. Do not confuse **Explain selected paths** with the six-section **Generate AI Assessment** action.

## 7. Exposure graph — /graph?run=<run-id> — 45 seconds

**Clicks:** From Results click **Inspect graph**. Keep **Portfolio dependencies** selected; click **Fit View** if needed. Show green portfolio cards and supplier-to-customer arrows. Scroll to **Strongest and alternative paths** and click **Agilent Technologies → AbbVie → McKesson → CVS Health**. Show focused path highlighting. Click **Clear path focus** when finished. Click a company card to show Entity evidence.

**Say:** “This graph uses the same private report snapshot. Green cards identify portfolio holdings, and arrows show supplier-to-customer relationships. Selecting a propagation path highlights the exact chain and fades unrelated records. Entity evidence helps separate reported topology from assumed operational weights.”

**Avoid:** Changing the draft commercial hop filter does not rerun or change the saved analysis. Do not present visual filtering as a recalculation. Use Explore all entities only as an optional brief view; the focused portfolio graph is easier to explain.

## 8. Locations — /locations — 45 seconds

**Clicks:** Sidebar **Locations** → **Load online map tiles**. Use **Company selection** → **Agilent Technologies** to narrow the site list. Select a listed site with its **Select facility** action. To show corridors, choose the blank **Choose a company** option, then Transport corridor → **Demo Freight Corridor 01**. Show start/end coordinates, supplied geometry and expand **Companies using this corridor**.

**Say:** “Locations links the report to operational site records and transport corridors. Selecting a company narrows the site list; selecting a corridor shows supplied geometry and company usage. Dashed lines and hollow markers identify synthetic geometry. These locations and shipment assumptions are illustrative, not verified real company operating sites.”

**If tiles fail:** Keep the corridor explorer and **Location list and offline fallback** visible. Say “The record inspector remains usable even if online map tiles cannot load.”

**Avoid:** Claiming road routing, live shipments, travel time or verified company locations. In a private historical report, current facility weather refresh is intentionally unavailable; it does not silently replace historical evidence.

## 9. Optional point-weather insert — on Locations — 25 seconds

**Clicks:** Scroll to **Live weather at a map point**. Enter Weather latitude **18.5204**, Weather longitude **73.8567** → **Set weather point** → **Fetch live point forecast**. These coordinates are only an independent demonstration point, not an asserted company site. Alternatively choose an empty map point.

**Show:** Provider, fetched time, cache/stale status if present, and **Seven-day point forecast (UTC)** with temperature, precipitation and gusts.

**Say:** “We can retrieve a seven-day forecast for a chosen geographic point. This is independent weather context. It is not attributed to these companies and does not recalculate or modify the saved portfolio report.”

**If unavailable:** Show the honest error or unavailable notice and proceed. Do not narrate a successful forecast unless data is visibly returned.

## 10. Compare — /compare — 45 seconds

**Clicks:** Sidebar **Compare**. Confirm Baseline snapshot is the private report just analyzed. From holding → **AbbVie**; To holding → **CVS Health**; Transfer amount (INR) → **1000000**. Click **Compare transfer**. Show Baseline, Proposed allocation and Holding-by-holding comparison matrix.

**Say:** “We can test an allocation change without changing the event, evidence, graph or original report. Here I transfer ₹10 lakh from AbbVie to CVS. Total capital remains ₹1 crore. In this modeled scenario, exposure changes from ₹4,73,532.89 to ₹4,31,738.69. This is sensitivity analysis, not an investment recommendation.”

**If a request fails:** Retry **Compare transfer** once after checking the backend is running. Use the visible actual results if different; numeric examples apply only to the default sample and parameters.

## 11. Evidence — /evidence — 35 seconds

**Clicks:** Sidebar **Evidence**. Show **Dataset completeness**, the private immutable snapshot notice and count/population columns. Scroll to Known gaps and Integration status.

**Say:** “MeghDrishti makes missing evidence visible. This installed snapshot contains 215 companies, 350 commercial relationships, 327 facility records and four corridors. A record's existence does not establish verified operating coordinates or measured dependency weights. Private completeness is calculated from the immutable snapshot in memory, without sending private holdings to the public coverage API.”

**Avoid:** Equating configuration status with verified external connectivity or claiming complete real-world supply-chain coverage.

## 12. Reports and export — /reports — 35 seconds

**Clicks:** Sidebar **Reports** → top **Private cloud reports** section → **Refresh private reports** if needed → **Open** on the newest sample report. Wait for Results. Show original capital and modeled exposure again. Click **Export JSON** or **Export CSV** and show the actual downloaded file notification.

**Say:** “The completed analysis is saved privately in Supabase. Reopening restores the original snapshot across the workspace. The original exposure remains ₹4,73,532.89 even after the hypothetical comparison. Users can export the snapshot as JSON or the results as CSV.”

**Presenter note:** The page also has Local demo reports. Use the top private section for this authenticated workflow. The private report is not added to persistent browser demo history. If reopening fails transiently, retry Open; do not substitute a fictional local run.

## 13. Closing overview — /overview — 20 seconds

**Clicks:** Sidebar **Overview**. Show private snapshot metrics and the propagation preview. Do not click Return to draft workspace.

**Say:** “MeghDrishti connects portfolio validation, scenario modeling, supply-chain tracing, evidence transparency, AI interpretation and allocation comparison in one workflow. Today's demonstration uses real identities and reported relationships with explicit synthetic assumptions, so users can see both what the model computes and what the evidence does not support.”

## Optional future-context disclosure; not part of the core success demo

Scenarios → **Future context** exposes Projection region, Indicator, Period, Scenario and **Load projection context**. The genuine World Bank XLSX files remain quarantined pending verification of their annual date labels. Do not claim that these projection values are verified, displayed successfully or driving the sample analysis. If showing this page, say “The interface separates long-term climate context from near-term scenarios; unverified projection data is withheld.” Then return to Results through Reports, without analyzing a changed draft.

## Final recording checklist

- Show successful saved portfolio and actual analysis, not just a loaded form.
- Keep the Sectivia dataset selected throughout.
- Say simulated allocations and modeled exposure, never predicted rupee loss.
- Show the difference between direct, indirect and unknown inputs.
- Select a graph path rather than only panning the graph.
- Show synthetic map evidence labels and at least one corridor inspector.
- Show a successful comparison with preserved total capital.
- Reopen the private report and export it.
- Only show Gemini/weather success if the real response is present.
- Avoid deleting portfolios/reports or logging out until the recording is complete.

