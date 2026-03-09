"""
Rotas para geração de relatórios.
Migrado da edge function generate-report.
"""

import logging
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth.dependencies import get_current_user, require_role, AuthenticatedUser
from app.services.supabase_client import get_supabase
from app.services.ai_service import call_openai

router = APIRouter()
logger = logging.getLogger("app.report_routes")


class GenerateReportRequest(BaseModel):
    patient_id: str
    nutritionist_id: str
    report_type: str = "complete"


class GenerateReportResponse(BaseModel):
    html: str
    patient_name: str


@router.post("/generate-report", response_model=GenerateReportResponse)
async def generate_report(
    payload: GenerateReportRequest,
    user: AuthenticatedUser = Depends(require_role(["nutritionist", "admin"])),
):
    """Generate HTML report for a patient."""
    db = get_supabase()
    
    # Fetch patient data in parallel
    profile_res = db.table("profiles").select("*").eq("user_id", payload.patient_id).single().execute()
    anamnesis_res = db.table("patient_anamnesis").select("*").eq("user_id", payload.patient_id).order("created_at", desc=True).limit(1).execute()
    assessments_res = db.table("physical_assessments").select("*").eq("patient_id", payload.patient_id).order("assessment_date", desc=True).limit(5).execute()
    meals_res = db.table("meals").select("*").eq("user_id", payload.patient_id).order("logged_at", desc=True).limit(30).execute()
    meal_plans_res = db.table("meal_plans").select("*, meal_plan_items(*)").eq("patient_id", payload.patient_id).eq("is_active", True).limit(1).execute()
    body_res = db.table("body_analyses").select("*").eq("patient_id", payload.patient_id).order("analysis_date", desc=True).limit(3).execute()
    
    profile = profile_res.data if profile_res.data else {}
    anamnesis = anamnesis_res.data[0] if anamnesis_res.data else None
    assessments = assessments_res.data or []
    meals = meals_res.data or []
    meal_plan = meal_plans_res.data[0] if meal_plans_res.data else None
    body_analyses = body_res.data or []
    
    patient_name = profile.get("full_name", "Paciente")
    
    # Generate AI summary
    ai_summary = ""
    try:
        latest_assessment = assessments[0] if assessments else {}
        summary_prompt = f"""Gere um resumo executivo para o relatório do paciente {patient_name}:
- Avaliações físicas: {len(assessments)} registros. Último peso: {latest_assessment.get('weight', 'N/A')}kg, IMC: {latest_assessment.get('bmi', 'N/A')}
- Refeições registradas: {len(meals)} nos últimos 30 dias
- Plano alimentar ativo: {'Sim' if meal_plan else 'Não'}
- Análises corporais: {len(body_analyses)}
Faça um resumo profissional em português com destaques e recomendações."""
        
        ai_summary = await call_openai(
            prompt=summary_prompt,
            system_prompt="Você é um nutricionista criando relatórios profissionais. Responda em português."
        )
    except Exception as e:
        logger.warning(f"AI summary failed: {e}")
    
    # Build HTML report
    latest_assessment = assessments[0] if assessments else None
    now = datetime.now()
    
    html = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório - {patient_name}</title>
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{ font-family: 'Segoe UI', system-ui, sans-serif; color: #1a1a2e; padding: 40px; max-width: 800px; margin: 0 auto; }}
  .header {{ text-align: center; border-bottom: 3px solid #10b981; padding-bottom: 20px; margin-bottom: 30px; }}
  .header h1 {{ font-size: 24px; color: #10b981; }}
  .header p {{ color: #666; font-size: 14px; margin-top: 4px; }}
  .section {{ margin-bottom: 30px; }}
  .section h2 {{ font-size: 18px; color: #10b981; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 15px; }}
  .grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }}
  .metric {{ background: #f0fdf4; padding: 12px; border-radius: 8px; }}
  .metric .label {{ font-size: 12px; color: #666; }}
  .metric .value {{ font-size: 20px; font-weight: bold; color: #1a1a2e; }}
  .summary {{ background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #10b981; line-height: 1.6; font-size: 14px; white-space: pre-wrap; }}
  table {{ width: 100%; border-collapse: collapse; font-size: 13px; }}
  th, td {{ padding: 8px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }}
  th {{ background: #f0fdf4; font-weight: 600; }}
  .footer {{ text-align: center; color: #999; font-size: 11px; margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 15px; }}
  @media print {{ body {{ padding: 20px; }} }}
</style>
</head>
<body>
<div class="header">
  <h1>📊 Relatório Nutricional</h1>
  <p><strong>{patient_name}</strong> — Gerado em {now.strftime('%d/%m/%Y')}</p>
</div>
"""

    # AI Summary section
    if ai_summary:
        html += f"""<div class="section"><h2>📋 Resumo Executivo</h2><div class="summary">{ai_summary}</div></div>
"""

    # Latest assessment section
    if latest_assessment:
        assessment_date = datetime.fromisoformat(latest_assessment.get("assessment_date", now.isoformat()).replace("Z", "+00:00"))
        html += f"""<div class="section">
  <h2>📐 Última Avaliação Física</h2>
  <p style="font-size:12px;color:#666;margin-bottom:10px;">Data: {assessment_date.strftime('%d/%m/%Y')}</p>
  <div class="grid">
"""
        if latest_assessment.get("weight"):
            html += f'    <div class="metric"><div class="label">Peso</div><div class="value">{latest_assessment["weight"]} kg</div></div>\n'
        if latest_assessment.get("height"):
            html += f'    <div class="metric"><div class="label">Altura</div><div class="value">{latest_assessment["height"]} cm</div></div>\n'
        if latest_assessment.get("bmi"):
            html += f'    <div class="metric"><div class="label">IMC</div><div class="value">{latest_assessment["bmi"]}</div></div>\n'
        if latest_assessment.get("body_fat_percentage"):
            html += f'    <div class="metric"><div class="label">% Gordura</div><div class="value">{latest_assessment["body_fat_percentage"]}%</div></div>\n'
        if latest_assessment.get("lean_mass"):
            html += f'    <div class="metric"><div class="label">Massa Magra</div><div class="value">{latest_assessment["lean_mass"]} kg</div></div>\n'
        if latest_assessment.get("fat_mass"):
            html += f'    <div class="metric"><div class="label">Massa Gorda</div><div class="value">{latest_assessment["fat_mass"]} kg</div></div>\n'
        html += """  </div>
</div>
"""

    # Evolution table
    if len(assessments) > 1:
        html += """<div class="section">
  <h2>📈 Evolução</h2>
  <table>
    <tr><th>Data</th><th>Peso</th><th>IMC</th><th>% Gordura</th></tr>
"""
        for a in assessments:
            a_date = datetime.fromisoformat(a.get("assessment_date", now.isoformat()).replace("Z", "+00:00"))
            html += f'    <tr><td>{a_date.strftime("%d/%m/%Y")}</td><td>{a.get("weight", "-")} kg</td><td>{a.get("bmi", "-")}</td><td>{a.get("body_fat_percentage", "-")}%</td></tr>\n'
        html += """  </table>
</div>
"""

    # Meal plan section
    if meal_plan:
        meal_items = meal_plan.get("meal_plan_items", [])
        html += f"""<div class="section">
  <h2>🍽️ Plano Alimentar Ativo</h2>
  <p style="margin-bottom:10px;"><strong>{meal_plan.get('title', 'Plano')}</strong>{' — ' + meal_plan.get('description', '') if meal_plan.get('description') else ''}</p>
"""
        if meal_items:
            html += """  <table>
    <tr><th>Refeição</th><th>Descrição</th><th>Kcal</th><th>Prot</th></tr>
"""
            for item in meal_items[:10]:
                html += f'    <tr><td>{item.get("title", "-")}</td><td>{(item.get("description") or "-")[:50]}</td><td>{item.get("calories_target", "-")}</td><td>{item.get("protein_target", "-")}g</td></tr>\n'
            html += """  </table>
"""
        html += """</div>
"""

    # Recent meals section
    html += f"""<div class="section">
  <h2>🍎 Refeições Recentes ({len(meals)})</h2>
"""
    if meals:
        html += f"""  <p style="font-size:13px;color:#666;margin-bottom:10px;">Últimas {min(len(meals), 10)} refeições registradas</p>
  <table>
    <tr><th>Data</th><th>Refeição</th><th>Kcal</th><th>Score IA</th></tr>
"""
        for m in meals[:10]:
            m_date = datetime.fromisoformat(m.get("logged_at", now.isoformat()).replace("Z", "+00:00"))
            ai_score = f'{m.get("ai_score")}/100' if m.get("ai_score") else "-"
            html += f'    <tr><td>{m_date.strftime("%d/%m/%Y")}</td><td>{m.get("title", "-")}</td><td>{m.get("calories", "-")}</td><td>{ai_score}</td></tr>\n'
        html += """  </table>
"""
    else:
        html += """  <p style="color:#666;">Nenhuma refeição registrada.</p>
"""
    html += """</div>
"""

    # Footer
    html += f"""<div class="footer">
  <p>Relatório gerado automaticamente pelo NutriTrack • {now.strftime('%d/%m/%Y')} {now.strftime('%H:%M:%S')}</p>
  <p>Este documento é confidencial e destinado exclusivamente ao profissional e paciente envolvidos.</p>
</div>
</body>
</html>"""
    
    return GenerateReportResponse(html=html, patient_name=patient_name)
