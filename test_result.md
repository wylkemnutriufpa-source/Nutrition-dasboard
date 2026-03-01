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
  Sessão atual:
  1. Fix permanente da anamnese (retry + safe error handling)
  2. Evolução do Dashboard Profissional para Central de Comando Inteligente
  3. Feature: Análise de Pratos por IA (Meal Photo Analysis) com integração Risk Engine

backend:
  - task: "API Status endpoint"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "low"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Backend mínimo, apenas /api/status"

frontend:
  - task: "Fix Anamnese Save (permanente)"
    implemented: true
    working: "unknown"
    file: "/app/frontend/src/lib/supabase.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "user"
        comment: "Usuário confirmou que anamnese voltou a funcionar, mas pede fix permanente"
      - working: "unknown"
        agent: "main"
        comment: "Refatorado createAnamnesis/updateAnamnesis: whitelist centralizada, extractSafeError (NUNCA lê response body), withRetry com backoff automático (2 tentativas). Elimina root cause do 'body stream already read'."

  - task: "Dashboard Profissional - Central de Comando Inteligente"
    implemented: true
    working: "unknown"
    file: "/app/frontend/src/pages/ProfessionalDashboard.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "unknown"
        agent: "main"
        comment: "Implementado: Header premium, 5 cards executivos (Ativos, Inativos, SOS, Em Risco, Engajamento), Atenção Hoje com SOS P0, Ranking de Risco Top 10, Gráfico 7 dias, Recomendações Inteligentes, Ações Rápidas. Compilou sem erros."

  - task: "Fix ProtectedRoute para visitor"
    implemented: true
    working: true
    file: "/app/frontend/src/App.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "CORRIGIDO - Testado e aprovado"
  
  - task: "Meu Plano - userType prop"
    implemented: true
    working: true
    file: "/app/frontend/src/pages/MealPlanEditor.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "CORRIGIDO - Testado e aprovado"

metadata:
  created_by: "main_agent"
  version: "2.0"
  test_sequence: 2
  run_ui: true

test_plan:
  current_focus:
    - "Dashboard Profissional - Central de Comando Inteligente"
    - "Fix Anamnese Save (permanente)"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      Implementação da Central de Comando Inteligente completa:
      
      ARQUIVOS MODIFICADOS:
      1. /app/frontend/src/lib/supabase.js - Adicionadas funções getBatchPatientRiskData e getRecentEmergencies + Fix anamnese (retry + safe error)
      2. /app/frontend/src/utils/professionalIntelligence.js - Reescrito com risk score dashboard, alertas SOS, recomendações inteligentes
      3. /app/frontend/src/hooks/useProfessionalDashboard.js - Reescrito para buscar SOS, risk data, gerar recomendações
      4. /app/frontend/src/pages/ProfessionalDashboard.js - Novo layout com 6 seções
      
      ARQUIVOS CRIADOS:
      5. /app/frontend/src/components/dashboard/RiskRankingList.js - Top 10 pacientes por risco
      6. /app/frontend/src/components/dashboard/RecommendationsSection.js - Recomendações inteligentes
      
      Backend é mínimo (/api/status), toda lógica é frontend + Supabase.
      Precisa testar login como profissional para ver o dashboard.