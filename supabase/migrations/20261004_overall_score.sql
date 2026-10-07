-- ==============================================================================
-- Migration: 20261004_overall_score.sql
-- Description: Overall Score configuration and weight storage
-- Module: Overall Score
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.overall_score_weights (
    id TEXT PRIMARY KEY DEFAULT 'default',

    attendance_weight NUMERIC(5,2) NOT NULL DEFAULT 25,
    event_performance_weight NUMERIC(5,2) NOT NULL DEFAULT 40,
    github_weight NUMERIC(5,2) NOT NULL DEFAULT 20,
    linkedin_weight NUMERIC(5,2) NOT NULL DEFAULT 15,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT overall_score_attendance_weight_check
        CHECK (attendance_weight >= 0 AND attendance_weight <= 100),

    CONSTRAINT overall_score_event_performance_weight_check
        CHECK (
            event_performance_weight >= 0
            AND event_performance_weight <= 100
        ),

    CONSTRAINT overall_score_github_weight_check
        CHECK (github_weight >= 0 AND github_weight <= 100),

    CONSTRAINT overall_score_linkedin_weight_check
        CHECK (linkedin_weight >= 0 AND linkedin_weight <= 100),

    CONSTRAINT overall_score_weights_total_check
        CHECK (
            attendance_weight
            + event_performance_weight
            + github_weight
            + linkedin_weight = 100
        )
);

CREATE INDEX IF NOT EXISTS idx_overall_score_weights_updated_at
ON public.overall_score_weights(updated_at);

ALTER TABLE public.overall_score_weights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "overall_score_weights_select_policy"
ON public.overall_score_weights;

CREATE POLICY "overall_score_weights_select_policy"
ON public.overall_score_weights
FOR SELECT
TO authenticated
USING (true);

INSERT INTO public.overall_score_weights (
    id,
    attendance_weight,
    event_performance_weight,
    github_weight,
    linkedin_weight
)
VALUES (
    'default',
    25,
    40,
    20,
    15
)
ON CONFLICT (id) DO NOTHING;

-- End of migration