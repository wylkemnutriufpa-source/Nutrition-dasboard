"""
Rotas para processamento de pagamentos.
Migrado da edge function process-payment.
"""

import os
import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth.dependencies import get_current_user, require_role, AuthenticatedUser
from app.services.supabase_client import get_supabase

router = APIRouter()
logger = logging.getLogger("app.payment_routes")


class PaymentRequest(BaseModel):
    plan_id: str
    plan_slug: str
    gateway: str  # "stripe" | "mercado_pago" | "pagseguro" | "pix"
    billing_cycle: str  # "monthly" | "yearly"
    amount: float


class PaymentResponse(BaseModel):
    checkout_url: Optional[str] = None
    pix_code: Optional[str] = None
    pix_qr_base64: Optional[str] = None
    payment_id: Optional[str] = None
    expires_at: Optional[str] = None
    status: Optional[str] = None
    message: Optional[str] = None


@router.post("/process-payment", response_model=PaymentResponse)
async def process_payment(
    payload: PaymentRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Process payment for subscription plans."""
    db = get_supabase()
    
    # Fetch plan
    plan_res = db.table("pricing_plans").select("*").eq("id", payload.plan_id).single().execute()
    if not plan_res.data:
        raise HTTPException(404, "Plano não encontrado")
    
    plan = plan_res.data
    
    # Create pending payment record
    payment_res = db.table("payments").insert({
        "user_id": user.user_id,
        "gateway": payload.gateway,
        "amount": payload.amount,
        "currency": "BRL",
        "status": "pending",
        "metadata": {
            "plan_id": payload.plan_id,
            "plan_slug": payload.plan_slug,
            "billing_cycle": payload.billing_cycle,
            "plan_name": plan.get("name"),
        },
    }).execute()
    
    if not payment_res.data:
        raise HTTPException(500, "Erro ao criar registro de pagamento")
    
    payment = payment_res.data[0]
    payment_id = payment.get("id")
    
    # Process based on gateway
    if payload.gateway == "stripe":
        stripe_key = os.environ.get("STRIPE_SECRET_KEY")
        if not stripe_key:
            return PaymentResponse(
                status="gateway_not_configured",
                message="Stripe não está configurado. Configure a chave secreta para usar este gateway.",
                payment_id=payment_id,
            )
        
        # For now, return placeholder - Stripe integration requires frontend redirect
        return PaymentResponse(
            status="gateway_pending",
            message="Integração Stripe em desenvolvimento. Use PIX por enquanto.",
            payment_id=payment_id,
        )
    
    elif payload.gateway == "mercado_pago":
        mp_token = os.environ.get("MERCADO_PAGO_ACCESS_TOKEN")
        if not mp_token:
            return PaymentResponse(
                status="gateway_not_configured",
                message="Mercado Pago não está configurado. Configure o Access Token para usar este gateway.",
                payment_id=payment_id,
            )
        
        # Mercado Pago integration placeholder
        return PaymentResponse(
            status="gateway_pending",
            message="Integração Mercado Pago em desenvolvimento. Use PIX por enquanto.",
            payment_id=payment_id,
        )
    
    elif payload.gateway == "pagseguro":
        pagseguro_token = os.environ.get("PAGSEGURO_TOKEN")
        if not pagseguro_token:
            return PaymentResponse(
                status="gateway_not_configured",
                message="PagSeguro não está configurado. Configure o Token para usar este gateway.",
                payment_id=payment_id,
            )
        
        return PaymentResponse(
            status="gateway_pending_integration",
            message="PagSeguro será integrado em breve. Use PIX ou outro gateway por enquanto.",
            payment_id=payment_id,
        )
    
    elif payload.gateway == "pix":
        mp_token = os.environ.get("MERCADO_PAGO_ACCESS_TOKEN")
        
        if mp_token:
            # Generate PIX via Mercado Pago - would need httpx call
            # For now, return manual PIX
            pass
        
        # Manual PIX fallback
        return PaymentResponse(
            status="manual_pix",
            message="Configure o Mercado Pago para PIX automático. Por enquanto, entre em contato para pagamento manual.",
            payment_id=payment_id,
            pix_code="contato@fitjourney.app",  # Manual PIX key
        )
    
    else:
        raise HTTPException(400, f"Gateway não suportado: {payload.gateway}")
