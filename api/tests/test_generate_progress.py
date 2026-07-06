import pytest

from api.controllers.generate_controller import (
    seed_job,
    get_job,
    sweep_old_jobs,
    _update_job,
    _stage_bounds,
    _jobs,
    STAGE_ORDER,
    STAGE_WEIGHTS,
)


def test_stage_weights_sum_to_100():
    assert sum(STAGE_WEIGHTS.values()) == 100


def test_stage_bounds_are_contiguous_and_end_at_100():
    start = 0
    for name in STAGE_ORDER:
        bound_start, bound_end = _stage_bounds(name)
        assert bound_start == start
        assert bound_end == start + STAGE_WEIGHTS[name]
        start = bound_end
    assert start == 100


def test_stage_bounds_raises_for_unknown_stage():
    with pytest.raises(KeyError):
        _stage_bounds("not-a-real-stage")


def test_seed_job_creates_queued_entry():
    seed_job("job-seed-1", "user-1")
    job = get_job("job-seed-1")
    assert job["user_id"] == "user-1"
    assert job["status"] == "queued"
    assert job["percent"] == 0
    assert job["stage"] == "prep"
    assert job["result"] is None
    assert job["error"] is None


def test_get_job_returns_none_for_unknown_id():
    assert get_job("does-not-exist") is None


def test_update_job_upserts_without_preseeding():
    """predict() may run against a job_id nobody called seed_job() for yet
    (e.g. direct test calls) — _update_job must not KeyError."""
    _update_job("job-fresh", status="processing", percent=10)
    job = get_job("job-fresh")
    assert job["status"] == "processing"
    assert job["percent"] == 10


def test_sweep_old_jobs_removes_only_stale_terminal_jobs():
    seed_job("job-old-done", "user-1")
    _update_job("job-old-done", status="succeeded", updated_at=0)  # ancient timestamp
    seed_job("job-recent-done", "user-1")
    _update_job("job-recent-done", status="succeeded")  # just updated, not stale
    seed_job("job-in-progress", "user-1")  # not terminal, must never be swept

    sweep_old_jobs()

    assert get_job("job-old-done") is None
    assert get_job("job-recent-done") is not None
    assert get_job("job-in-progress") is not None
