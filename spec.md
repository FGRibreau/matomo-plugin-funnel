# Matomo Funnels Plugin - Functional & Technical Specifications

## 1. Overview
The **Funnels** plugin for Matomo empowers users to define, track, and analyze visitor paths (funnels) towards a specific conversion goal or flow. It visualizes where visitors enter a process, the steps they complete, and crucially, where they drop off. This insight allows for targeted optimization of website flows (e.g., checkout, signup, inquiries) to boost conversion rates.

## 2. Goals & Objectives
*   **Identify Friction:** Pinpoint exact steps where users abandon a process.
*   **Optimize Conversions:** Provide actionable data to fix leaks in marketing or transactional funnels.
*   **Flexible Tracking:** Support funnels based on URLs, Page Titles, and Events.
*   **Seamless Integration:** Work natively with Matomo Goals, Segments, Visitor Logs, and Custom Alerts.
*   **Privacy:** Adhere to GDPR and data ownership principles (100% data ownership, no external data sending).
*   **Performance:** No impact on tracking time; report generation occurs during "offline" archiving.

## 3. Functional Specifications

### 3.1 Funnel Configuration & Management

#### 3.1.1 Creation Modes
*   **Standalone Funnels (v5.1.0+):** Funnels can be created independently of Goals via "Manage Funnels" > "Add a New Funnel".
*   **Goal-Linked Funnels:** Configured via "Manage Goals". A goal can be the final step of multiple funnels.
    *   Requires enabling "Funnel tracking" checkbox in Goal settings.
*   **Permissions:** Only Admin-level users can create/configure funnels.

#### 3.1.2 Step Configuration
Each funnel consists of an ordered sequence of steps.
*   **Components:**
    *   **Name:** Descriptive label (e.g., "Subscription Page").
    *   **Comparison Logic:**
        *   **URL:** `equals`, `contains`, `starts with`, `ends with`, `matches regular expression`. (Includes query parameters).
        *   **Path:** `equals`, `contains`, `starts with`, `ends with`. (Excludes query parameters).
        *   **Search Query:** `contains`.
        *   **Page Title:** `equals`, `contains`, `starts with`, `ends with`.
        *   **Event (Category, Name, Action):** `equals`, `contains`, `starts with`, `ends with`.
    *   **Pattern:** The value to match (e.g., `/checkout`, `click-button`).
    *   **Required Checkbox:** If checked, the step is mandatory for the funnel flow.
        *   *First Step Required:* User must enter here to start the funnel.
        *   *All Required:* User must follow exact path.
*   **Validation Tools:**
    *   **Known Values:** A "Help" icon next to step definitions shows recently tracked URLs/events that match the configured pattern.
    *   **URL Validator:** A "Validate steps" tool allows manual entry of URLs to check against the configuration. Matching steps highlight green; non-matching red.
*   **Activation:** Funnels must be explicitly activated after configuration.

#### 3.1.3 Management
*   **Editing:** Existing funnels can be edited (requires "Unlocking").
    *   *Warning:* Saving changes invalidates existing reports for that funnel; data must be re-archived.
*   **Deletion:** Funnels can be deleted from the management view.

### 3.2 Data Processing & Archiving
*   **Archiver:** The core logic resides in a `FunnelArchiver`. It processes raw visitor logs (`log_link_visit_action`) to determine:
    *   **Entry:** Did a visit hit Step 1 (or the first required step)?
    *   **Flow & Sequence:** Validates strict sequence for required steps.
    *   **Exit/Drop-off:** Identifies the last successfully completed step.
    *   **Conversion:** Reached the final step.
*   **Metrics Calculated:**
    *   **Visits (Hits):** Total visits touching a step.
    *   **Entries:** Visits entering the funnel at this step.
    *   **Exits:** Visits leaving the funnel flow after this step.
    *   **Proceeded:** Visits moving to the *next* step.
    *   **Proceeded Rate:** % of visitors moving to next step.
    *   **Left/Drop-off Rate:** % of visitors lost at this step.
    *   **Skips:** Visits that skipped an optional step.
*   **Historical Processing:**
    *   New funnels do not show data immediately.
    *   Support for **Invalidating** and **Re-processing** historical reports to apply new funnel definitions to past data.
    *   *Note:* For Goal-linked funnels, only data where the Goal was converted is processed during re-archiving if not doing a full reprocessing.
*   **Performance:** All heavy calculation is done during the Archiving process (Cron), not during Tracking.

### 3.3 Reporting & Visualization
The plugin provides a dedicated "Funnels" category in the reporting menu.

#### 3.3.1 Funnel Overview Page
*   **Dashboard:** Cards for each active funnel.
*   **Visuals:** Sparkline summary showing conversion rate trend over the selected period.
*   **Key Metrics:** Conversion rate %, Absolute number of conversions.

#### 3.3.2 Funnel Report Page
Detailed view for a specific funnel.
*   **Overview Card:** Shortcuts to "Show funnel visits log", "Show goal report", "Edit funnel".
*   **Funnel Visualization:** Large bar chart visualizing the flow.
    *   Bars represent "Proceeded" vs "Drop-off".
    *   Hover details for exact counts.
*   **Funnel Details Table:** Comprehensive breakdown of metrics for each step.
*   **Funnel Row Evolution:**
    *   Line graph showing performance over time.
    *   **Selectable Metrics:** `Funnel conversion rate`, `Funnel conversions`, `Funnel abandoned rate`, `Funnel entries`, `Funnel exits`.
*   **Sparklines:** Simplified trend lines for quick assessment (Min/Max markers).

#### 3.3.3 Step Analysis
*   **Step Evolution:** Drill-down into specific steps (pop-up row evolution).
    *   **Metrics:** `Step visits`, `Step entries`, `Step exits`, `Step progressions`, `Step proceeds`, `Step skips`, `Proceeded Rate`.
*   **Referrers:** "Get referrer details" for visitors entering at a specific step.

#### 3.3.4 Visitor Log Integration
*   **Filtered Log:** "Show funnel visits log" displays only visitors who participated in the funnel.
*   **Step Log:** Logs can be filtered to show visitors who passed through a *specific* step.
*   **Visual Indicators:** Icons in the log indicating entry/exit points and step completion.

#### 3.3.5 Segmentation
New segment dimensions added to Matomo:
1.  **`Visit participated in funnel`**: Matches any visitor touching the funnel.
2.  **`Visit participated in funnel at step position`**: Matches visitors touching a specific step number (e.g., "equals 2").
*   Standard Matomo segments (Country, Referrer, etc.) can be applied to Funnel reports.

### 3.4 API, Export & Alerts
*   **API:** Full HTTP Reporting API support (`Funnels.getFunnel`, `Funnels.getFunnelEvolution`, etc.).
*   **Export:** PDF/HTML email reports, CSV export, Dashboard Widgets.
*   **Custom Alerts Integration:**
    *   Monitor traffic/performance changes.
    *   **Levels:**
        *   *Funnel Flow:* Traffic changes across steps.
        *   *Funnel Detail:* Granular step monitoring.
        *   *Funnel Summary:* Overall conversion/traffic changes.

## 4. UI / UX Design
Based on standard Matomo UI patterns (Vue.js / Twig).

*   **Management Screen:** List of funnels, Add/Edit buttons.
*   **Edit Screen (`clipboard-1767015957407.png`):**
    *   Step list with drag-and-drop reordering (implied).
    *   Condition builder (Comparison, Condition, Pattern).
    *   "Help" icon for Known Values matching.
    *   "Validate Funnel Steps" testing area at the bottom.
*   **Report Screen:**
    *   Top: Date selector, Segment selector.
    *   Main: Funnel Visualization (Chart).
    *   Bottom: "Funnel Details" table.
    *   Evolution graph toggles via Line Chart icons.

## 5. Technical Architecture

### 5.1 Database Schema
*   **`matomo_log_funnel`**: Stores funnel configurations (id, name, idsite, goal_id, steps_json, etc.).
    *   *Note:* Raw tracking data is usually referenced from `log_link_visit_action` and `log_visit`, not copied into a new raw table, but aggregated into archives.
*   **Archive Tables**: `archive_numeric_*` & `archive_blob_*` store the calculated report data.

### 5.2 Plugin Structure
```text
plugins/Funnels/
├── Funnels.php              # Plugin descriptor
├── API.php                  # Reporting API
├── Archiver.php             # Core logic: calculates metrics from log_link_visit_action
├── Controller.php           # UI Controller
├── DAO/                     # Database Access Objects (Funnel definitions)
├── Model/                   # Business logic models
├── Reports/                 # Report definitions (ViewDataTable)
├── Tasks/                   # Scheduled tasks
└── vue/                     # Vue.js components for Funnel Charts/Config
```