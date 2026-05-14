"""
Matching service — Phase 4.

Scores a job seeker's application against an opportunity using Claude.
Falls back to sentence-transformers cosine similarity if Claude is unavailable.

Called once per application (not bulk at post time) so:
  - Every applicant gets scored at the moment they apply
  - The trader's ranked list updates in real time
  - Claude's reasoning is always fresh and specific
"""
from __future__ import annotations

import json
import logging
import os
from typing import Any

import httpx

from app.core.config import settings
from app.models.user import JobSeekerProfile, Opportunity

logger = logging.getLogger(__name__)

ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_MODEL = "claude-sonnet-4-20250514"
FALLBACK_ENGINE = "sentence_transformers"
CLAUDE_ENGINE = "claude"


# ── Main entry point ──────────────────────────────────────────────────────────

def score_applicant(
    opportunity: Opportunity,
    job_seeker: JobSeekerProfile,
) -> dict[str, Any]:
    """
    Score a job seeker's fit for an opportunity.
    Returns:
        {
            "score": float (0–100),
            "reasoning": str,
            "engine": "claude" | "sentence_transformers",
        }

    Tries Claude first. Falls back to sentence-transformers on any failure.
    """
    try:
        return _score_with_claude(opportunity, job_seeker)
    except Exception as e:
        logger.warning(f"Claude scoring failed, falling back to sentence-transformers: {e}")
        return _score_with_embeddings(opportunity, job_seeker)


# ── Claude scoring ────────────────────────────────────────────────────────────

def _build_prompt(opportunity: Opportunity, job_seeker: JobSeekerProfile) -> str:
    skills_required = ", ".join(opportunity.skills_required or []) or "Not specified"
    language_required = opportunity.language_required or "Not specified"
    seeker_skills = ", ".join(job_seeker.skills or []) or "Not specified"
    seeker_languages = ", ".join(job_seeker.languages or []) or "Not specified"
    seeker_rate = f"₦{job_seeker.daily_rate_expectation:,}/day" if job_seeker.daily_rate_expectation else "Not specified"

    return f"""You are a matching engine for Eko, an informal economy platform in Lagos, Nigeria.

Your job is to score how well a job seeker fits a trader's opportunity.
Be practical and specific to the Lagos informal market context.

OPPORTUNITY:
- Title: {opportunity.title}
- Description: {opportunity.description or "Not provided"}
- Location: {opportunity.location}
- Daily pay: ₦{opportunity.daily_pay:,}
- Duration: {opportunity.duration_days} day(s)
- Skills required: {skills_required}
- Language required: {language_required}

JOB SEEKER PROFILE:
- Location: {job_seeker.location or "Not specified"}
- Skills: {seeker_skills}
- Languages: {seeker_languages}
- Daily rate expectation: {seeker_rate}

Score this applicant from 0 to 100 based on:
1. Skill match (how well their skills cover what's required)
2. Language match (critical for customer-facing roles at Balogun/Mile 12)
3. Location proximity (closer = more reliable attendance in Lagos traffic)
4. Pay alignment (does the offered rate meet their expectation)

Respond ONLY with valid JSON in this exact format, no preamble, no markdown:
{{
  "score": <number 0-100>,
  "reasoning": "<one concise sentence explaining the score, max 25 words, written as if shown directly to the trader>"
}}

Examples of good reasoning:
- "Yoruba speaker with direct market sales experience, 2.1km away — strong fit across all criteria."
- "Good skills match but no Yoruba and 6km away — reliable attendance may be an issue."
- "Rate expectation ₦1,000 above offer — may not commit for the full duration."
"""


def _score_with_claude(opportunity: Opportunity, job_seeker: JobSeekerProfile) -> dict[str, Any]:
    """Call Claude API to score the applicant. Raises on any failure."""
    if not settings.ANTHROPIC_API_KEY:
        raise ValueError("ANTHROPIC_API_KEY not configured")

    prompt = _build_prompt(opportunity, job_seeker)

    with httpx.Client(timeout=30) as client:
        response = client.post(
            ANTHROPIC_API_URL,
            headers={
                "x-api-key": settings.ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": ANTHROPIC_MODEL,
                "max_tokens": 256,
                "messages": [
                    {"role": "user", "content": prompt}
                ],
            },
        )

    if response.status_code != 200:
        raise RuntimeError(
            f"Claude API error {response.status_code}: {response.text[:200]}"
        )

    data = response.json()
    raw_text = data["content"][0]["text"].strip()

    # Strip markdown fences if Claude wraps them anyway
    if raw_text.startswith("```"):
        raw_text = raw_text.split("```")[1]
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
    raw_text = raw_text.strip()

    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"Claude returned invalid JSON: {raw_text[:100]}") from e

    score = float(parsed.get("score", 0))
    score = max(0.0, min(100.0, score))           # clamp 0–100
    reasoning = str(parsed.get("reasoning", "")).strip()

    logger.info(
        f"Claude scored applicant: seeker={job_seeker.id} "
        f"opp={opportunity.id} score={score}"
    )

    return {
        "score": score,
        "reasoning": reasoning,
        "engine": CLAUDE_ENGINE,
    }


# ── Sentence-transformers fallback ────────────────────────────────────────────

def _score_with_embeddings(
    opportunity: Opportunity,
    job_seeker: JobSeekerProfile,
) -> dict[str, Any]:
    """
    Fallback scoring using cosine similarity between opportunity and seeker embeddings.
    No external API calls — runs locally.
    """
    try:
        from sentence_transformers import SentenceTransformer, util
        model = _get_embedding_model()

        opp_text = _opportunity_to_text(opportunity)
        seeker_text = _seeker_to_text(job_seeker)

        opp_emb = model.encode(opp_text, convert_to_tensor=True)
        seeker_emb = model.encode(seeker_text, convert_to_tensor=True)

        cosine_sim = float(util.cos_sim(opp_emb, seeker_emb)[0][0])
        # cosine similarity is -1 to 1; map to 0-100
        score = round((cosine_sim + 1) / 2 * 100, 2)
        score = max(0.0, min(100.0, score))

        reasoning = _build_fallback_reasoning(opportunity, job_seeker, score)

        logger.info(
            f"Embedding scored applicant: seeker={job_seeker.id} "
            f"opp={opportunity.id} score={score}"
        )

        return {
            "score": score,
            "reasoning": reasoning,
            "engine": FALLBACK_ENGINE,
        }

    except ImportError:
        logger.warning("sentence-transformers not installed — using rule-based scoring")
        return _score_rule_based(opportunity, job_seeker)
    except Exception as e:
        logger.error(f"Embedding scoring failed: {e}")
        return _score_rule_based(opportunity, job_seeker)


_embedding_model = None

def _get_embedding_model():
    """Singleton — load once, reuse across requests."""
    global _embedding_model
    if _embedding_model is None:
        from sentence_transformers import SentenceTransformer
        # Small, fast model that works well for short skill/location texts
        _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
        logger.info("Sentence transformer model loaded: all-MiniLM-L6-v2")
    return _embedding_model


def _opportunity_to_text(opp: Opportunity) -> str:
    parts = [opp.title]
    if opp.description:
        parts.append(opp.description)
    if opp.skills_required:
        parts.append("Skills: " + ", ".join(opp.skills_required))
    if opp.language_required:
        parts.append(f"Language: {opp.language_required}")
    parts.append(f"Location: {opp.location}")
    return ". ".join(parts)


def _seeker_to_text(js: JobSeekerProfile) -> str:
    parts = []
    if js.skills:
        parts.append("Skills: " + ", ".join(js.skills))
    if js.languages:
        parts.append("Languages: " + ", ".join(js.languages))
    if js.location:
        parts.append(f"Location: {js.location}")
    return ". ".join(parts) if parts else "No profile information"


# ── Rule-based last resort ────────────────────────────────────────────────────

def _score_rule_based(
    opportunity: Opportunity,
    job_seeker: JobSeekerProfile,
) -> dict[str, Any]:
    """
    Pure rule-based scoring. Used only when both Claude and sentence-transformers fail.
    Deterministic and fast — no external dependencies.
    """
    score = 0.0

    # Skills overlap (40 points)
    required = set(s.lower() for s in (opportunity.skills_required or []))
    has = set(s.lower() for s in (job_seeker.skills or []))
    if required:
        overlap = len(required & has) / len(required)
        score += overlap * 40
    else:
        score += 20  # no requirements = anyone qualifies

    # Language match (30 points)
    lang_req = (opportunity.language_required or "").lower()
    seeker_langs = [l.lower() for l in (job_seeker.languages or [])]
    if lang_req and lang_req in seeker_langs:
        score += 30
    elif not lang_req:
        score += 15  # no language requirement

    # Pay alignment (20 points)
    daily_rate = job_seeker.daily_rate_expectation or 0
    if daily_rate <= opportunity.daily_pay:
        score += 20  # offer meets or exceeds expectation
    elif daily_rate <= opportunity.daily_pay * 1.2:
        score += 10  # within 20% — close enough

    # Same city rough match (10 points)
    opp_loc = (opportunity.location or "").lower()
    seeker_loc = (job_seeker.location or "").lower()
    if seeker_loc and any(word in opp_loc for word in seeker_loc.split(",")):
        score += 10

    score = round(min(score, 100.0), 2)
    reasoning = _build_fallback_reasoning(opportunity, job_seeker, score)

    return {
        "score": score,
        "reasoning": reasoning,
        "engine": "rule_based",
    }


def _build_fallback_reasoning(
    opportunity: Opportunity,
    job_seeker: JobSeekerProfile,
    score: float,
) -> str:
    """Generate a human-readable reasoning string for non-Claude engines."""
    notes = []

    required_skills = set(s.lower() for s in (opportunity.skills_required or []))
    seeker_skills = set(s.lower() for s in (job_seeker.skills or []))
    if required_skills:
        matched = required_skills & seeker_skills
        if matched:
            notes.append(f"matches {len(matched)}/{len(required_skills)} required skills")
        else:
            notes.append("no direct skill match")

    lang_req = (opportunity.language_required or "").lower()
    seeker_langs = [l.lower() for l in (job_seeker.languages or [])]
    if lang_req:
        if lang_req in seeker_langs:
            notes.append(f"{lang_req.title()} speaker")
        else:
            notes.append(f"no {lang_req.title()} — language gap")

    if job_seeker.daily_rate_expectation:
        if job_seeker.daily_rate_expectation <= opportunity.daily_pay:
            notes.append("rate expectation met")
        else:
            gap = job_seeker.daily_rate_expectation - opportunity.daily_pay
            notes.append(f"rate ₦{gap:,} above offer")

    if not notes:
        return f"Compatibility score: {score:.0f}/100."

    return "; ".join(notes).capitalize() + f" — {score:.0f}% fit."
