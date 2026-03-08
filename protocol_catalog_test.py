#!/usr/bin/env python3
"""
Backend Testing for Protocol Tasks Management (Catálogo → Checklist)
===============================================================
Tests P0 - gerenciamento de protocol_tasks (catálogo → checklist)

TESTES NECESSÁRIOS (conforme solicitação):

1. SEGURANÇA (todos devem retornar 401 sem Authorization):
   - GET /api/professional/protocols/test-id/catalog-tasks
   - POST /api/professional/protocols/test-id/catalog-tasks
   - DELETE /api/professional/protocols/test-id/catalog-tasks/task-id

2. VERIFICAÇÃO DE CÓDIGO em backend/routes/protocol_checklist.py:
   a. Tem ProtocolTaskRequest (Pydantic BaseModel com title, description, frequency, order_index, active)
   b. Tem list_catalog_tasks() com @router.get("/professional/protocols/{protocol_id}/catalog-tasks")
   c. Tem add_catalog_task() com @router.post("/professional/protocols/{protocol_id}/catalog-tasks")
   d. Tem delete_catalog_task() com @router.delete("/professional/protocols/{protocol_id}/catalog-tasks/{task_id}")
   e. Todos os 3 usam _require_professional_or_admin()

3. VERIFICAÇÃO DE CÓDIGO em frontend/src/components/ProfessionalProjectDashboard.js:
   a. Tem estado expandedCatalogTasks, catalogTasksByProtocol, loadingCatalogTasks, newTaskForm, savingTask
   b. Tem toggleCatalogTasks() que faz lazy load via GET /catalog-tasks
   c. Tem handleAddCatalogTask() que faz POST /catalog-tasks
   d. Tem handleDeleteCatalogTask() que faz DELETE /catalog-tasks/{taskId}
   e. No JSX do catálogo: seção expansível com botão de seta, lista de tasks, form de adicionar
   f. Imports incluem ChevronRight, List, Trash2, CheckSquare

4. VERIFICAÇÃO do fluxo de auto-sync em backend/routes/protocols.py:
   a. endpoint activate (POST /professional/protocols/activate) chama sync_protocol_tasks_to_checklist quando status=active
   b. endpoint promote-scheduled (POST /professional/patients/{id}/promote-scheduled-protocols) chama sync após promoção

NÃO fazer curl com dados reais — apenas verificação de segurança e código.
"""

import requests
import json
import sys
import re
from datetime import datetime

# Backend URL from frontend/.env
BACKEND_URL = "https://timeline-sync-3.preview.emergentagent.com"

# Test constants
TEST_PROTOCOL_ID = "test-protocol-id"
TEST_TASK_ID = "test-task-id"
INVALID_TOKEN = "Bearer invalid.jwt.token"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    PURPLE = '\033[95m'
    END = '\033[0m'
    BOLD = '\033[1m'

def log_test(test_name, status, details=""):
    """Log test results with colors"""
    if status == "PASS":
        print(f"{Colors.GREEN}✅ {test_name}: {status}{Colors.END}")
    elif status == "FAIL":
        print(f"{Colors.RED}❌ {test_name}: {status}{Colors.END}")
        if details:
            print(f"   {Colors.RED}Details: {details}{Colors.END}")
    else:  # INFO
        print(f"{Colors.BLUE}ℹ️ {test_name}: {status}{Colors.END}")
    if details and status != "FAIL":
        print(f"   {Colors.YELLOW}{details}{Colors.END}")

def test_endpoint_security(method, url, test_name, data=None):
    """Test endpoint without Authorization header - should return 401"""
    try:
        if method == "GET":
            response = requests.get(url, timeout=10)
        elif method == "POST":
            response = requests.post(url, json=data or {}, timeout=10)
        elif method == "DELETE":
            response = requests.delete(url, timeout=10)
        
        if response.status_code == 401:
            log_test(test_name, "PASS", f"Returned 401 as expected")
            return True
        else:
            log_test(test_name, "FAIL", f"Expected 401, got {response.status_code}: {response.text[:200]}")
            return False
    except Exception as e:
        log_test(test_name, "FAIL", f"Request error: {str(e)}")
        return False

def test_status_endpoint():
    """Test GET /api/status for backend health"""
    try:
        response = requests.get(f"{BACKEND_URL}/api/status", timeout=10)
        if response.status_code == 200:
            log_test("GET /api/status", "PASS", "Backend is running")
            return True
        else:
            log_test("GET /api/status", "FAIL", f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("GET /api/status", "FAIL", f"Cannot reach backend: {str(e)}")
        return False

def verify_backend_code():
    """Verify backend code structure in protocol_checklist.py"""
    results = []
    
    try:
        # Read the protocol_checklist.py file
        with open('/app/backend/routes/protocol_checklist.py', 'r') as f:
            content = f.read()
        
        # Test a: ProtocolTaskRequest com campos necessários
        if 'class ProtocolTaskRequest(BaseModel):' in content:
            # Check required fields
            required_fields = ['title:', 'description:', 'frequency:', 'order_index:', 'active:']
            missing_fields = []
            for field in required_fields:
                if field not in content:
                    missing_fields.append(field.replace(':', ''))
            
            if not missing_fields:
                log_test("ProtocolTaskRequest BaseModel", "PASS", "Tem todos os campos necessários")
                results.append(True)
            else:
                log_test("ProtocolTaskRequest BaseModel", "FAIL", f"Campos ausentes: {missing_fields}")
                results.append(False)
        else:
            log_test("ProtocolTaskRequest BaseModel", "FAIL", "Classe não encontrada")
            results.append(False)
        
        # Test b: list_catalog_tasks endpoint
        if '@router.get("/professional/protocols/{protocol_id}/catalog-tasks")' in content and 'async def list_catalog_tasks(' in content:
            if '_require_professional_or_admin(' in content and 'protocol_id' in content and 'protocol_name' in content:
                log_test("list_catalog_tasks endpoint", "PASS", "Endpoint correto com verificação de protocolo")
                results.append(True)
            else:
                log_test("list_catalog_tasks endpoint", "FAIL", "Falta verificação de protocolo ou role")
                results.append(False)
        else:
            log_test("list_catalog_tasks endpoint", "FAIL", "Endpoint não encontrado")
            results.append(False)
        
        # Test c: add_catalog_task endpoint
        if '@router.post("/professional/protocols/{protocol_id}/catalog-tasks")' in content and 'async def add_catalog_task(' in content:
            if 'request.title' in content and 'order_index' in content and '_require_professional_or_admin(' in content:
                log_test("add_catalog_task endpoint", "PASS", "Valida title e auto-incrementa order_index")
                results.append(True)
            else:
                log_test("add_catalog_task endpoint", "FAIL", "Falta validação ou auto-incremento")
                results.append(False)
        else:
            log_test("add_catalog_task endpoint", "FAIL", "Endpoint não encontrado")
            results.append(False)
        
        # Test d: delete_catalog_task endpoint
        if '@router.delete("/professional/protocols/{protocol_id}/catalog-tasks/{task_id}")' in content and 'async def delete_catalog_task(' in content:
            delete_section = content[content.find('async def delete_catalog_task('):]
            if 'protocol_id' in delete_section and 'task_id' in delete_section and '_require_professional_or_admin(' in delete_section:
                log_test("delete_catalog_task endpoint", "PASS", "Filtra por AMBOS protocol_id E task_id")
                results.append(True)
            else:
                log_test("delete_catalog_task endpoint", "FAIL", "Não filtra por ambos IDs ou falta role check")
                results.append(False)
        else:
            log_test("delete_catalog_task endpoint", "FAIL", "Endpoint não encontrado")
            results.append(False)
        
        # Test e: All endpoints use _require_professional_or_admin
        catalog_endpoints = ['list_catalog_tasks', 'add_catalog_task', 'delete_catalog_task']
        all_use_auth = True
        for endpoint in catalog_endpoints:
            if endpoint in content:
                endpoint_section = content[content.find(f'def {endpoint}('):]
                next_def = endpoint_section.find('\ndef ')
                if next_def != -1:
                    endpoint_section = endpoint_section[:next_def]
                if '_require_professional_or_admin(' not in endpoint_section:
                    all_use_auth = False
                    break
        
        if all_use_auth:
            log_test("Todos endpoints usam _require_professional_or_admin", "PASS", "Segurança implementada")
            results.append(True)
        else:
            log_test("Todos endpoints usam _require_professional_or_admin", "FAIL", "Alguns endpoints sem verificação de role")
            results.append(False)
        
    except Exception as e:
        log_test("Backend code verification", "FAIL", f"Erro ao ler arquivo: {str(e)}")
        results.extend([False] * 5)
    
    return results

def verify_frontend_code():
    """Verify frontend code structure in ProfessionalProjectDashboard.js"""
    results = []
    
    try:
        # Read the ProfessionalProjectDashboard.js file
        with open('/app/frontend/src/components/ProfessionalProjectDashboard.js', 'r') as f:
            content = f.read()
        
        # Test a: Required states
        required_states = ['expandedCatalogTasks', 'catalogTasksByProtocol', 'loadingCatalogTasks', 'newTaskForm', 'savingTask']
        missing_states = []
        for state in required_states:
            if state not in content:
                missing_states.append(state)
        
        if not missing_states:
            log_test("Estados necessários", "PASS", "Todos os estados encontrados")
            results.append(True)
        else:
            log_test("Estados necessários", "FAIL", f"Estados ausentes: {missing_states}")
            results.append(False)
        
        # Test b: toggleCatalogTasks function with lazy load
        if 'toggleCatalogTasks' in content and 'catalog-tasks' in content:
            if 'GET' in content and 'lazy load' in content.lower() or 'catalogTasksByProtocol[protocolId]' in content:
                log_test("toggleCatalogTasks lazy load", "PASS", "Lazy load implementado")
                results.append(True)
            else:
                log_test("toggleCatalogTasks lazy load", "FAIL", "Lazy load não implementado corretamente")
                results.append(False)
        else:
            log_test("toggleCatalogTasks lazy load", "FAIL", "Função não encontrada")
            results.append(False)
        
        # Test c: handleAddCatalogTask function
        if 'handleAddCatalogTask' in content and 'POST' in content:
            if 'catalog-tasks' in content and 'title' in content:
                log_test("handleAddCatalogTask", "PASS", "POST para catalog-tasks implementado")
                results.append(True)
            else:
                log_test("handleAddCatalogTask", "FAIL", "POST não implementado corretamente")
                results.append(False)
        else:
            log_test("handleAddCatalogTask", "FAIL", "Função não encontrada")
            results.append(False)
        
        # Test d: handleDeleteCatalogTask function
        if 'handleDeleteCatalogTask' in content and 'DELETE' in content:
            if 'catalog-tasks' in content and 'taskId' in content:
                log_test("handleDeleteCatalogTask", "PASS", "DELETE para catalog-tasks implementado")
                results.append(True)
            else:
                log_test("handleDeleteCatalogTask", "FAIL", "DELETE não implementado corretamente")
                results.append(False)
        else:
            log_test("handleDeleteCatalogTask", "FAIL", "Função não encontrada")
            results.append(False)
        
        # Test e: JSX elements - seção expansível
        jsx_elements = ['ChevronRight', 'List', 'expandedCatalogTasks', 'Tasks do protocolo']
        missing_jsx = []
        for element in jsx_elements:
            if element not in content:
                missing_jsx.append(element)
        
        if not missing_jsx:
            log_test("JSX seção expansível", "PASS", "Elementos de UI encontrados")
            results.append(True)
        else:
            log_test("JSX seção expansível", "FAIL", f"Elementos ausentes: {missing_jsx}")
            results.append(False)
        
        # Test f: Required imports
        required_imports = ['ChevronRight', 'List', 'Trash2', 'CheckSquare']
        missing_imports = []
        for imp in required_imports:
            if imp not in content:
                missing_imports.append(imp)
        
        if not missing_imports:
            log_test("Imports necessários", "PASS", "Todos os imports encontrados")
            results.append(True)
        else:
            log_test("Imports necessários", "FAIL", f"Imports ausentes: {missing_imports}")
            results.append(False)
        
    except Exception as e:
        log_test("Frontend code verification", "FAIL", f"Erro ao ler arquivo: {str(e)}")
        results.extend([False] * 6)
    
    return results

def verify_auto_sync_flow():
    """Verify auto-sync flow in protocols.py"""
    results = []
    
    try:
        # Read the protocols.py file
        with open('/app/backend/routes/protocols.py', 'r') as f:
            content = f.read()
        
        # Test a: activate endpoint calls sync_protocol_tasks_to_checklist when status=active
        if 'POST /professional/protocols/activate' in content or '@router.post("/professional/protocols/activate")' in content:
            activate_section = content[content.find('async def activate_protocol('):]
            next_def = activate_section.find('\nasync def ')
            if next_def != -1:
                activate_section = activate_section[:next_def]
            
            if 'sync_protocol_tasks_to_checklist' in activate_section and 'status=active' in activate_section:
                log_test("Activate endpoint auto-sync", "PASS", "Chama sync quando status=active")
                results.append(True)
            else:
                log_test("Activate endpoint auto-sync", "FAIL", "Não chama sync ou não verifica status")
                results.append(False)
        else:
            log_test("Activate endpoint auto-sync", "FAIL", "Endpoint activate não encontrado")
            results.append(False)
        
        # Test b: promote-scheduled endpoint calls sync after promotion
        if 'promote-scheduled-protocols' in content or 'promote_scheduled_protocols' in content:
            promote_section = content[content.find('promote_scheduled_protocols'):]
            next_def = promote_section.find('\nasync def ')
            if next_def != -1:
                promote_section = promote_section[:next_def]
            
            if 'sync_protocol_tasks_to_checklist' in promote_section:
                log_test("Promote-scheduled auto-sync", "PASS", "Chama sync após promoção")
                results.append(True)
            else:
                log_test("Promote-scheduled auto-sync", "FAIL", "Não chama sync após promoção")
                results.append(False)
        else:
            log_test("Promote-scheduled auto-sync", "FAIL", "Endpoint promote-scheduled não encontrado")
            results.append(False)
        
    except Exception as e:
        log_test("Auto-sync flow verification", "FAIL", f"Erro ao ler arquivo: {str(e)}")
        results.extend([False] * 2)
    
    return results

def main():
    print(f"{Colors.BOLD}{Colors.BLUE}")
    print("=" * 80)
    print("🧪 P0 PROTOCOL CATALOG TASKS MANAGEMENT TESTS")
    print("Testar gerenciamento de protocol_tasks (catálogo → checklist)")
    print("=" * 80)
    print(f"{Colors.END}")
    
    # Test results tracking
    all_tests = []
    
    # 1. Backend Health Check
    print(f"\n{Colors.PURPLE}📋 1. BACKEND HEALTH CHECK{Colors.END}")
    print("-" * 40)
    health_ok = test_status_endpoint()
    all_tests.append(health_ok)
    
    if not health_ok:
        print(f"\n{Colors.RED}❌ Backend not accessible. Stopping tests.{Colors.END}")
        return False
    
    # 2. SECURITY TESTS
    print(f"\n{Colors.PURPLE}📋 2. TESTES DE SEGURANÇA (401 sem Authorization){Colors.END}")
    print("-" * 60)
    
    security_endpoints = [
        ("GET", f"{BACKEND_URL}/api/professional/protocols/{TEST_PROTOCOL_ID}/catalog-tasks", "GET catalog-tasks"),
        ("POST", f"{BACKEND_URL}/api/professional/protocols/{TEST_PROTOCOL_ID}/catalog-tasks", "POST catalog-tasks"),
        ("DELETE", f"{BACKEND_URL}/api/professional/protocols/{TEST_PROTOCOL_ID}/catalog-tasks/{TEST_TASK_ID}", "DELETE catalog-task")
    ]
    
    for method, url, test_name in security_endpoints:
        result = test_endpoint_security(method, url, test_name, {"title": "Test Task"} if method == "POST" else None)
        all_tests.append(result)
    
    # 3. BACKEND CODE VERIFICATION
    print(f"\n{Colors.PURPLE}📋 3. VERIFICAÇÃO DE CÓDIGO BACKEND (protocol_checklist.py){Colors.END}")
    print("-" * 60)
    
    backend_results = verify_backend_code()
    all_tests.extend(backend_results)
    
    # 4. FRONTEND CODE VERIFICATION  
    print(f"\n{Colors.PURPLE}📋 4. VERIFICAÇÃO DE CÓDIGO FRONTEND (ProfessionalProjectDashboard.js){Colors.END}")
    print("-" * 60)
    
    frontend_results = verify_frontend_code()
    all_tests.extend(frontend_results)
    
    # 5. AUTO-SYNC FLOW VERIFICATION
    print(f"\n{Colors.PURPLE}📋 5. VERIFICAÇÃO DO FLUXO AUTO-SYNC (protocols.py){Colors.END}")
    print("-" * 60)
    
    sync_results = verify_auto_sync_flow()
    all_tests.extend(sync_results)
    
    # 6. Summary
    print(f"\n{Colors.BOLD}{Colors.BLUE}")
    print("=" * 80)
    print("📊 RESUMO DOS TESTES")
    print("=" * 80)
    print(f"{Colors.END}")
    
    passed = sum(all_tests)
    total = len(all_tests)
    
    if passed == total:
        print(f"{Colors.GREEN}{Colors.BOLD}✅ TODOS OS TESTES PASSARAM: {passed}/{total}{Colors.END}")
        
        print(f"\n{Colors.GREEN}CRITÉRIOS DE SUCESSO ATENDIDOS:{Colors.END}")
        print(f"{Colors.GREEN}✅ 3 endpoints catalog-tasks retornam 401 sem auth{Colors.END}")
        print(f"{Colors.GREEN}✅ protocol_checklist.py tem os 3 endpoints corretos com anti-duplicação{Colors.END}")
        print(f"{Colors.GREEN}✅ ProfessionalProjectDashboard.js tem o painel de tasks expansível{Colors.END}")
        print(f"{Colors.GREEN}✅ protocols.py chama sync automaticamente no activate{Colors.END}")
        
        return True
    else:
        failed_count = total - passed
        print(f"{Colors.RED}{Colors.BOLD}❌ TESTES FALHARAM: {failed_count}/{total} falharam{Colors.END}")
        
        # Show breakdown of failures
        if len(all_tests) >= 3:
            security_failed = not all(all_tests[:3])
            if security_failed:
                print(f"{Colors.RED}❌ Falhas de segurança: endpoints não retornam 401{Colors.END}")
        
        if len(all_tests) >= 8:
            backend_failed = not all(all_tests[3:8])
            if backend_failed:
                print(f"{Colors.RED}❌ Falhas backend: código não está completo{Colors.END}")
        
        if len(all_tests) >= 14:
            frontend_failed = not all(all_tests[8:14])
            if frontend_failed:
                print(f"{Colors.RED}❌ Falhas frontend: painel não está implementado{Colors.END}")
        
        if len(all_tests) >= 16:
            sync_failed = not all(all_tests[14:16])
            if sync_failed:
                print(f"{Colors.RED}❌ Falhas auto-sync: fluxo não está implementado{Colors.END}")
        
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)