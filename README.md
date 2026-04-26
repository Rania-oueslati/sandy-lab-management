# Treedome Lab AI Assistant

## Overview

Treedome Lab AI is a full-stack web application designed to digitalize laboratory management through a multi-agent AI architecture.

The system enables efficient handling of research activities, inventory tracking, and automated decision-making by orchestrating specialized AI agents.

---

## Objectives

* Automate laboratory workflows
* Improve inventory management accuracy
* Provide intelligent research assistance
* Ensure secure and structured data handling

---

## Key Features

* Multi-agent AI system with centralized orchestration
* Real-time inventory tracking with database synchronization
* Automated research support using web data sources
* Secure CRUD operations via a relational database
* Parallel execution for handling complex user requests

---

## System Architecture

### Supervisor Agent

* Analyzes user input
* Classifies intent (Inventory, Research, Combined, or General)
* Routes tasks to appropriate agents

### Research Agent

* Performs web-based data retrieval
* Generates experiment ideas and scientific insights

### Inventory Agent

* Tracks and manages stock levels
* Processes inventory updates

### Database Layer

* Executes SQL operations
* Ensures data integrity and persistence

---

## Technology Stack

### Frontend

* HTML5, CSS3
* JavaScript (ES6+)

### Backend

* Node.js
* Express.js

### AI & Orchestration

* LangGraph
* LangChain
* Google Gemini API

### Database

* PostgreSQL

### Supporting Tools

* Zod (schema validation)
* Dotenv
* CORS

---

## Database Design

### inventory

Stores current stock levels
Fields: id, name, category, quantity, unit, last_updated

### inventory_transactions

Logs all inventory changes
Fields: id, inventory_id, change_amount, reason, timestamp

### projects

Tracks research projects
Fields: id, title, description, status, lead_scientist

### ai_actions_log

Records AI routing decisions
Fields: id, action_type, description, metadata, timestamp

---

## Workflow

1. User sends a request via the interface
2. Supervisor Agent analyzes and classifies the request
3. Task is delegated to the appropriate agent(s)
4. Agents process the request using external tools and database access
5. Results are aggregated
6. Final response is returned to the user

---

## Installation

### Clone the repository

```bash
git clone https://github.com/your-username/treedome-lab-ai.git
cd treedome-lab-ai
```

### Install dependencies

```bash
cd backend
npm install
```

### Environment variables

Create a `.env` file:

```env
DATABASE_URL=your_postgres_url
GEMINI_API_KEY=your_api_key
```

### Run the application

```bash
npm start
```

### Access the application

http://localhost:3000

---

## Team

* OUESLATI Rania  : Frontend Developer
* MIMOUNI Med Yassine : Backend & AI Engineer

---

## Future Work

* Extension with additional specialized agents
* Improved predictive analytics for inventory management
* Integration with external scientific data sources

---

## License

This project is developed for educational and hackathon purposes.
