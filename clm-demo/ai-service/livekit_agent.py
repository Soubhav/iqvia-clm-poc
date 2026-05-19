"""
LiveKit voice agent — Smart Contract Assistant.

Runs the STT → LLM → TTS voice pipeline with all CLM contract tools.
The LLM instructions are voice-optimised: short, spoken sentences only.

Setup:
  1. Add to .env:
       LIVEKIT_URL=wss://your-project.livekit.cloud
       LIVEKIT_API_KEY=your-key
       LIVEKIT_API_SECRET=your-secret
  2. First run — download VAD model files:
       python livekit_agent.py download-files
  3. Start in dev mode (connects to LiveKit Cloud):
       python livekit_agent.py dev

The agent registers under the name "smart-contract-assistant".
Your LiveKit Cloud project must have this agent configured for dispatch.
"""

import asyncio
import os

from dotenv import load_dotenv
from livekit import agents
from livekit.agents import AgentServer, AgentSession, Agent, RunContext, function_tool, inference
from livekit.plugins import silero

from tools import (
    lookup_contract,
    validate_provider,
    evaluate_pricing,
    get_financial_impact,
    check_utilization,
    get_approval_route,
    get_expiring_contracts,
    initiate_renewal,
    amend_contract,
)

load_dotenv()

VOICE_SYSTEM_PROMPT = """You are the Smart Contract Assistant — a voice AI for a New Zealand private health insurer's contract management system.

You help contract managers:
- Look up provider information and contract details
- Check procedure pricing and utilization against caps
- Review contracts expiring soon
- Prepare amendment and renewal drafts

VOICE RULES — never break these:
1. Keep every reply to 2–3 spoken sentences. You are speaking aloud, not writing.
2. No bullet points, asterisks, markdown, or formatting of any kind.
3. Speak numbers in plain English: say "four thousand two hundred dollars" not "$4,200".
4. Always call the relevant tool before answering — never guess at rates, volumes, or names.
5. Summarise the key number or decision, then ask if they want more detail.
6. Never calculate or estimate rates yourself — always use evaluate_pricing.
7. Never commit a contract — only present a summary and ask for confirmation.
8. For contract creation or complex amendments, tell the user to use the text chat window."""


class SmartContractAssistant(Agent):
    def __init__(self) -> None:
        super().__init__(instructions=VOICE_SYSTEM_PROMPT)

    # ── Contract lookup ────────────────────────────────────────────────────────

    @function_tool()
    async def lookup_contract_tool(
        self,
        context: RunContext,
        contract_id: str = None,
        provider_id: str = None,
        procedure_code: str = None,
    ) -> dict:
        """Look up existing contracts. Use when the user asks about a specific contract, a provider's contracts, or contracts for a procedure.

        Args:
            contract_id: Contract ID, for example CTR-001
            provider_id: Provider ID, for example AKL-SURGICAL-001
            procedure_code: Procedure code, for example NZACS-14711
        """
        return lookup_contract(
            contract_id=contract_id,
            provider_id=provider_id,
            procedure_code=procedure_code,
        )

    # ── Provider validation ────────────────────────────────────────────────────

    @function_tool()
    async def validate_provider_tool(
        self,
        context: RunContext,
        provider_id: str,
    ) -> dict:
        """Validate a healthcare provider against the NZ Health Provider Index. Always call before creating a contract.

        Args:
            provider_id: Provider ID to validate, for example CHC-SURGICAL-001
        """
        return validate_provider(provider_id=provider_id)

    # ── Pricing ────────────────────────────────────────────────────────────────

    @function_tool()
    async def evaluate_pricing_tool(
        self,
        context: RunContext,
        provider_id: str,
        procedure_code: str,
        ytd_volume: int = 0,
    ) -> dict:
        """Calculate the contracted rate using the Rules Engine. Never guess rates — always call this tool.

        Args:
            provider_id: Provider ID
            procedure_code: Procedure code
            ytd_volume: Year-to-date procedure volume, defaults to zero
        """
        return await asyncio.to_thread(
            evaluate_pricing,
            provider_id=provider_id,
            procedure_code=procedure_code,
            ytd_volume=ytd_volume,
        )

    # ── Financial impact ───────────────────────────────────────────────────────

    @function_tool()
    async def get_financial_impact_tool(
        self,
        context: RunContext,
        contract_id: str,
        proposed_rate_change_pct: float = None,
    ) -> dict:
        """Calculate the annual cost impact of a proposed rate change. Always call this before presenting any rate change to the user.

        Args:
            contract_id: Contract ID, for example CTR-001
            proposed_rate_change_pct: Percentage change — negative means a reduction, for example minus 5 means rates 5 percent lower
        """
        kwargs: dict = {"contract_id": contract_id}
        if proposed_rate_change_pct is not None:
            kwargs["proposed_rate_change_pct"] = proposed_rate_change_pct
        return get_financial_impact(**kwargs)

    # ── Utilization ────────────────────────────────────────────────────────────

    @function_tool()
    async def check_utilization_tool(
        self,
        context: RunContext,
        provider_id: str = None,
        contract_id: str = None,
    ) -> dict:
        """Check procedure volume against annual caps. Use when asked about usage, remaining procedures, or cap alerts.

        Args:
            provider_id: Check all contracts for this provider
            contract_id: Check a specific contract
        """
        return check_utilization(provider_id=provider_id, contract_id=contract_id)

    # ── Approval route ─────────────────────────────────────────────────────────

    @function_tool()
    async def get_approval_route_tool(
        self,
        context: RunContext,
        estimated_annual_value: float,
    ) -> dict:
        """Determine who needs to approve a contract based on its estimated annual value in New Zealand dollars.

        Args:
            estimated_annual_value: Estimated annual value in New Zealand dollars
        """
        return get_approval_route(estimated_annual_value=estimated_annual_value)

    # ── Expiring contracts ─────────────────────────────────────────────────────

    @function_tool()
    async def get_expiring_contracts_tool(
        self,
        context: RunContext,
        days_ahead: int = 90,
    ) -> dict:
        """List contracts expiring within a number of days. Use when asked about upcoming renewals or contracts due to expire.

        Args:
            days_ahead: Number of days to look ahead, defaults to 90
        """
        return get_expiring_contracts(days_ahead=days_ahead)

    # ── Renewal ────────────────────────────────────────────────────────────────

    @function_tool()
    async def initiate_renewal_tool(
        self,
        context: RunContext,
        contract_id: str,
    ) -> dict:
        """Create a renewal draft carrying forward a contract's current terms. The draft is presented for confirmation — nothing is committed.

        Args:
            contract_id: Contract ID to renew, for example CTR-001
        """
        return initiate_renewal(contract_id=contract_id)

    # ── Rate amendment ─────────────────────────────────────────────────────────

    @function_tool()
    async def amend_contract_rates_tool(
        self,
        context: RunContext,
        contract_id: str,
        rate_change_pct: float,
        reason: str,
    ) -> dict:
        """Prepare a rate amendment draft for an existing contract. Always call get_financial_impact_tool first to show the cost impact.

        Args:
            contract_id: Contract ID to amend, for example CTR-001
            rate_change_pct: Percentage change — negative means lower rates, for example minus 5 means 5 percent lower
            reason: Business reason for the change
        """
        contract_data = lookup_contract(contract_id=contract_id)
        if not contract_data.get("found"):
            return {"error": f"Contract {contract_id} not found"}

        contract = contract_data["contracts"][0]
        model = contract.get("pricing_model", "")

        if model == "tiered":
            tiers = contract.get("tiers", [])
            changes = {
                "tiers": [
                    {**t, "rate": round(t["rate"] * (1 + rate_change_pct / 100))}
                    for t in tiers
                ]
            }
        elif model == "ffs":
            current_rate = float(contract.get("rate", 0))
            changes = {"rate": round(current_rate * (1 + rate_change_pct / 100))}
        elif model == "staircase":
            changes = {
                "rate_before": round(float(contract.get("rate_before", 0)) * (1 + rate_change_pct / 100)),
                "rate_after": round(float(contract.get("rate_after", 0)) * (1 + rate_change_pct / 100)),
            }
        else:
            changes = {"rate_change_pct": rate_change_pct}

        return amend_contract(contract_id=contract_id, changes=changes, reason=reason)


# ── Agent server ───────────────────────────────────────────────────────────────

server = AgentServer()


@server.rtc_session(agent_name="smart-contract-assistant")
async def contract_agent(ctx: agents.JobContext):
    session = AgentSession(
        stt=inference.STT(model="deepgram/nova-3", language="en"),
        llm=inference.LLM(model="openai/gpt-4o"),
        tts=inference.TTS(
            model="cartesia/sonic-3",
            voice="9626c31c-bec5-4cca-baa8-f8ba9e84c8bc",
        ),
        vad=silero.VAD.load(),
    )

    await session.start(
        room=ctx.room,
        agent=SmartContractAssistant(),
    )

    await session.generate_reply(
        instructions=(
            "Greet the contract manager. Say you are the Smart Contract Assistant "
            "and you are ready to help with provider contracts. One sentence only."
        )
    )


if __name__ == "__main__":
    agents.cli.run_app(server)
