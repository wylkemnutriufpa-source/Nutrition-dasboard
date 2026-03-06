#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  Implement Automation Engine Worker (FastAPI + Supabase).
  New engine tables: automation_engine_events, automation_engine_rules, automation_engine_runs.
  Conditions DSL (eq/neq/gt/gte/lt/lte/contains/in/exists + and/or).
  Actions: notify_user, notify_professional, create_task.
  Cooldown by org+rule+patient.
  Endpoints: POST /api/admin/automation-engine/run, GET /api/admin/automation-engine/health.
  
  FASE ATUAL: Implementar sistema central de autorização com hierarquia:
  ADMIN > PROFESSIONAL > PATIENT
  - Admin panel controla features com 3 estados por perfil (active/disabled/coming_soon)
  - Sidebar mostra links admin para admin
  - Camada central de autorização (authorization.js)

backend:
  - task: "Automation Engine – types.py (Pydantic models)"
    implemented: true
    working: true
    file: "backend/services/automation_engine/types.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "AutomationEvent, AutomationRule, AutomationRun, ActionContext models created. Lint clean."

  - task: "Automation Engine – evaluator.py (conditions DSL)"
    implemented: true
    working: true
    file: "backend/services/automation_engine/evaluator.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Supports eq/neq/gt/gte/lt/lte/contains/in/exists + and/or. Dot-path resolution. Lint clean."

  - task: "Automation Engine – templates.py (mustache renderer)"
    implemented: true
    working: true
    file: "backend/services/automation_engine/templates.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "{token} replacement with nested dict flattening. Lint clean."

  - task: "Automation Engine – cooldown.py"
    implemented: true
    working: true
    file: "backend/services/automation_engine/cooldown.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Cooldown check via Supabase REST. Scope: org+rule+patient. Fail-open on error."

  - task: "Automation Engine – actions.py (notify_user, notify_professional, create_task)"
    implemented: true
    working: true
    file: "backend/services/automation_engine/actions.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "All 3 action types implemented. Uses httpx + service role key. Lint clean."

  - task: "Automation Engine – worker.py (batch loop)"
    implemented: true
    working: true
    file: "backend/services/automation_engine/worker.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Full batch loop: fetch→process→evaluate→cooldown→actions→runs→mark done. Lint clean."

  - task: "Automation Engine – API routes (run + health)"
    implemented: true
    working: true
    file: "backend/routes/automation_engine.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "POST /api/admin/automation-engine/run and GET /api/admin/automation-engine/health. Health returns 503 until SUPABASE_SERVICE_ROLE_KEY is set (expected)."

frontend:
  - task: "Central Authorization Layer (authorization.js)"
    implemented: true
    working: true
    file: "frontend/src/lib/authorization.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "canAccessArea, canUseFeature, canUseFeatureSync created. Supports 3-state per profile."

  - task: "Admin Sidebar Fix (Layout.js + Sidebar.js)"
    implemented: true
    working: true
    file: "frontend/src/components/Layout.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Layout.js fixed to use admin when on /admin/* routes. Sidebar has /admin/features link. Separator between admin and professional links."

  - task: "AdminFeatureControl 3-state per profile"
    implemented: true
    working: true
    file: "frontend/src/pages/AdminFeatureControl.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "FeatureCard updated with 3-state selectors (active/disabled/coming_soon) per profile (professional/patient). Maintains backward compat with boolean columns."

  - task: "RoleGuard uses central authorization"
    implemented: true
    working: true
    file: "frontend/src/guards/RoleGuard.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "RoleGuard now uses canAccessArea and getDefaultRoute from authorization.js."

  - task: "canAccessFeature supports 3-state"
    implemented: true
    working: true
    file: "frontend/src/lib/supabase.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "canAccessFeature and canAccessFeatureSync updated to use professional_state/patient_state with fallback to boolean columns."

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus:
    - "Automation Engine – API routes (run + health)"
    - "Automation Engine – worker.py (batch loop)"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      Automation Engine fully implemented (backend only, additive).
      Files created:
        - /app/sql/automation_engine_setup.sql  (DDL for 3 engine tables + notifications + tasks)
        - /app/backend/services/automation_engine/{types,evaluator,templates,cooldown,actions,worker}.py
        - /app/backend/routes/automation_engine.py
      Registered in server.py. Backend running cleanly.
      PENDING: User must provide SUPABASE_SERVICE_ROLE_KEY and run the SQL setup in Supabase Dashboard.
  - agent: "main"
    message: |
      Central Authorization System implemented:
      Files created:
        - /app/frontend/src/lib/authorization.js (canAccessArea, canUseFeature, canUseFeatureSync)
        - /app/sql/central_authorization_v2.sql (SQL migration for professional_state/patient_state)
      Files modified:
        - /app/frontend/src/components/Layout.js (admin always shows admin sidebar on /admin/*)
        - /app/frontend/src/components/Sidebar.js (added /admin/features link + separator)
        - /app/frontend/src/pages/AdminDashboard.js (uses profile.role instead of localStorage)
        - /app/frontend/src/pages/AdminFeatureControl.js (3-state per profile UI)
        - /app/frontend/src/lib/supabase.js (canAccessFeature supports professional_state/patient_state)
        - /app/frontend/src/guards/RoleGuard.jsx (uses central authorization layer)
      PENDING: User must run /app/sql/central_authorization_v2.sql in Supabase SQL Editor.