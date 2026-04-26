# 🐿️ Treedome Lab AI - Project Summary

This document outlines the complete technology stack, architectural structure, database design, and features used to build the **Treedome Lab AI Assistant**. 

---

## 1. Core Languages
*   **JavaScript (ES6+)**: Used for both the Frontend UI logic and the Backend Node.js server.
*   **HTML5 / CSS3**: For the custom, responsive Treedome dashboard.
*   **SQL**: For querying and managing the relational database.


---

## 2. Frameworks & Libraries
### Backend
*   **Node.js & Express**: The core backend server handling API requests and serving static files.
*   **PostgreSQL (`pg`)**: The database client used to connect Node.js to the local Postgres database.
*   **LangGraph (`@langchain/langgraph`)**: The orchestration framework used to create the multi-agent supervisor system.
*   **LangChain (`@langchain/core`, `@langchain/google-genai`)**: Used to structure prompts, messages, and model interactions.
*   **Zod**: Used for strict schema validation when defining the inputs for AI Tools.
*   **Dotenv & Cors**: For environment variable management and cross-origin resource sharing.

### External APIs
*   **Google Gemini API**: Powers the AI models.
    *   `gemini-2.5-flash`: The Supervisor/Router and Chat bot.
    *   `gemini-2.5-flash-lite`: The Inventory Worker Agent.
    *   `gemini-2.5-pro`: The Research Worker Agent.
*   **DuckDuckGo Search & Wikipedia API**: Used by the Research Agent to scrape real-time scientific data from the web.

---

## 3. Database Architecture (PostgreSQL)
The lab uses a relational database to store permanent records without relying on AI hallucination.
*   **`inventory` table**: 
    *   *Columns:* `id`, `name`, `category`, `quantity`, `unit`, `last_updated`
    *   *Purpose:* Tracks the current stock of all lab items (e.g., Acorns, Oxygen tanks).
*   **`inventory_transactions` table**:
    *   *Columns:* `id`, `inventory_id`, `change_amount`, `reason`, `timestamp`
    *   *Purpose:* An audit log of every time the AI or the user adds/removes an item.
*   **`projects` table**:
    *   *Columns:* `id`, `title`, `description`, `status`, `lead_scientist`
    *   *Purpose:* Tracks ongoing scientific projects.
*   **`ai_actions_log` table**:
    *   *Columns:* `id`, `action_type`, `description`, `metadata`, `timestamp`
    *   *Purpose:* Logs every decision the LangGraph router makes (e.g., logging what agent was selected for a prompt).

---

## 4. Multi-Agent AI Structure
The backend utilizes a **LangGraph Supervisor Architecture**. Instead of one AI trying to do everything, tasks are delegated:
1.  **Father Bot (The Supervisor)**: Reads the user's message and classifies the intent into exactly one of four categories: `INVENTORY`, `RESEARCH`, `BOTH`, or `CHAT`. 
2.  **Inventory Agent**: If routed here, this agent is given access to `checkInventoryTool` and `updateInventoryTool`. It writes SQL queries via the `DatabaseAgent` to read/write to Postgres.
3.  **Research Agent**: If routed here, this agent is forced to use the `web_search` tool to fetch real-world data before answering.
4.  **"BOTH" Parallel Execution**: If a user asks a compound question (e.g., "Do we have oxygen and what is a star?"), the Supervisor triggers *both* the Inventory and Research agents at the same time, waits for both to finish, and combines their data into one cohesive answer.

---

## 5. Frontend & UI/UX Design
*   **Treedome Aesthetic**: A custom SpongeBob-inspired glassmorphism design with custom colors, gradients, and typography (`Fredoka` and `Baloo 2` fonts).
*   **Local State Management**: Uses browser `localStorage` (`treedome_sessions`) to save chat logs so users don't lose conversations on refresh.
*   **Dynamic Data Syncing**: The Lab Inventory table fetches directly from the Postgres database via REST endpoints (`GET /api/inventory`).
*   **Custom Modals**: Native browser `alert()` and `confirm()` popups were completely replaced with custom HTML/CSS modals featuring smooth pop-in animations.
*   **Interactive UI Controls**: Users can add, subtract, and delete inventory items via physical buttons in the UI, which fire off `POST /api/inventory/update` requests, triggering immediate database updates.

---

## 6. Deep Persona Engineering
*   **System Prompts**: The entire backend AI has been explicitly prompted to act as **Sandy Cheeks**. The Supervisor, the Inventory worker, and the Research worker all share a cohesive "Texas cowgirl scientist" persona, ensuring the AI never breaks character or sounds like a generic assistant.
