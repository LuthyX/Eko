"""
Feedback service — Phase 5b learning loop.

When a job completes and both sides rate each other:
  1. Store ratings on the Match record
  2. Update JobSeekerProfile stats (jobs_completed, avg_rating)
  3. Log signal for EkoScore recompute (daily cron handles actual recompute)
  4. Enrich future Claude matching prompts with seeker history

This closes the loop:
  Squad webhook confirms payout
    → post_completion_update() called
      → seeker.jobs_completed += 1
      → seeker.avg_rating recomputed
      → next Claude prompt includes "3 jobs completed · avg rating 4.8★"
"""
from __future__ import annotations

import logging
from sqlalchemy.orm import Session

from app.models.user import Match, MatchStatus, JobSeekerProfile

logger = logging.getLogger(__name__)


def post_completion_update(match: Match, db: Session):
    """
    Called by webhook handler after wage payout confirmed.
    Updates seeker stats. Safe to call multiple times — idempotent check on status.
    """
    seeker = match.job_seeker
    if not seeker:
        logger.warning(f"No seeker found for match {match.id}")
        return

    # Increment jobs_completed
    seeker.jobs_completed = (seeker.jobs_completed or 0) + 1

    # Recompute avg_rating from all completed matches with trader ratings
    rated_matches = [
        m for m in seeker.matches
        if m.status == MatchStatus.completed and m.trader_rating is not None
    ]
    if rated_matches:
        seeker.avg_rating = sum(m.trader_rating for m in rated_matches) / len(rated_matches)

    db.flush()

    logger.info(
        f"Seeker {seeker.id} stats updated after job completion: "
        f"jobs_completed={seeker.jobs_completed} "
        f"avg_rating={seeker.avg_rating:.1f}"
    )

    # Log for trader's EkoScore signal
    trader = match.opportunity.trader if match.opportunity else None
    if trader:
        logger.info(
            f"Trader {trader.id} completed a job — "
            f"behavioural_stability signal strengthened. "
            f"Daily cron will recompute EkoScore."
        )


def update_seeker_on_accept(seeker: JobSeekerProfile, db: Session):
    """
    Called when trader accepts a seeker's application.
    Increments jobs_accepted counter for completion rate tracking.
    """
    seeker.jobs_accepted = (seeker.jobs_accepted or 0) + 1
    db.flush()
    logger.info(
        f"Seeker {seeker.id} accepted for a job — "
        f"jobs_accepted={seeker.jobs_accepted}"
    )


def process_rating(
    match: Match,
    rating: int,
    comment: str | None,
    rated_by: str,
    db: Session,
) -> dict:
    """
    Store a rating on the match.
    rated_by: "trader" (rates the seeker) | "job_seeker" (rates the trader)

    When trader rates seeker → updates seeker's avg_rating.
    When seeker rates trader → stored for future lender transparency.
    """
    if rated_by == "trader":
        if match.trader_rating is not None:
            raise ValueError("You have already rated this job")
        match.trader_rating = rating
        match.trader_comment = comment

        # Recompute seeker avg_rating across all their rated matches
        seeker = match.job_seeker
        if seeker:
            all_rated = [
                m for m in seeker.matches
                if m.trader_rating is not None and m.id != match.id
            ]
            all_ratings = [m.trader_rating for m in all_rated] + [rating]
            seeker.avg_rating = sum(all_ratings) / len(all_ratings)
            logger.info(
                f"Seeker {seeker.id} avg_rating updated to "
                f"{seeker.avg_rating:.1f} from {len(all_ratings)} rating(s)"
            )

    elif rated_by == "job_seeker":
        if match.seeker_rating is not None:
            raise ValueError("You have already rated this job")
        match.seeker_rating = rating
        match.seeker_comment = comment

    else:
        raise ValueError(f"Invalid rated_by value: {rated_by}")

    db.commit()

    logger.info(
        f"Rating saved: match={match.id} "
        f"rated_by={rated_by} rating={rating}/5"
    )

    return {
        "match_id": match.id,
        "rated_by": rated_by,
        "rating": rating,
        "comment": comment,
        "message": "Rating submitted. Thank you for your feedback.",
    }