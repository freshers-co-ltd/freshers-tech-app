BEGIN;

CREATE
OR REPLACE FUNCTION public.admin_get_revenue_metrics (p_months INT DEFAULT 1) RETURNS TABLE (
    completed_count INT,
    cancelled_count INT,
    pending_count INT,
    in_progress_count INT,
    revenue_current NUMERIC,
    revenue_last_month NUMERIC,
    avg_completion_hours NUMERIC,
    revenue_change_pct NUMERIC,
    completed_change_pct NUMERIC,
    gross_revenue_current NUMERIC,
    net_revenue_current NUMERIC,
    gross_revenue_last_month NUMERIC,
    net_revenue_last_month NUMERIC,
    gross_revenue_change_pct NUMERIC,
    net_revenue_change_pct NUMERIC
) SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    RETURN QUERY
    WITH current_month AS (
        SELECT 
            COUNT(*) FILTER (WHERE c.status = 'completed')::INT AS completed,
            COUNT(*) FILTER (WHERE c.status = 'cancelled')::INT AS cancelled,
            COUNT(*) FILTER (WHERE c.status = 'requested')::INT AS pending,
            COUNT(*) FILTER (WHERE c.status = 'confirmed')::INT AS confirmed,
            COUNT(*) FILTER (WHERE c.status = 'in_progress')::INT AS in_progress,
            COALESCE(SUM(c.service_cost) FILTER (WHERE c.status = 'completed'), 0)::NUMERIC AS revenue,
            COALESCE(SUM(c.service_cost - COALESCE(c.cleaner_pay, 0)) FILTER (WHERE c.status = 'completed'), 0)::NUMERIC AS net_revenue,
            AVG(EXTRACT(EPOCH FROM (c.clock_out_time - c.clock_in_time)) / 3600) FILTER (WHERE c.status = 'completed' AND c.clock_out_time IS NOT NULL AND c.clock_in_time IS NOT NULL)::NUMERIC AS avg_hours
        FROM public.cleanings c
        WHERE c.deleted_at IS NULL
        AND DATE_TRUNC('month', c.scheduled_start) = DATE_TRUNC('month', NOW())
     ),
     last_month AS (
        SELECT 
            COALESCE(SUM(c.service_cost), 0)::NUMERIC AS revenue,
            COALESCE(SUM(c.service_cost - COALESCE(c.cleaner_pay, 0)), 0)::NUMERIC AS net_revenue,
            COUNT(*) FILTER (WHERE c.status = 'completed')::INT AS completed
        FROM public.cleanings c
        WHERE c.deleted_at IS NULL
        AND DATE_TRUNC('month', c.scheduled_start) = DATE_TRUNC('month', NOW() - INTERVAL '1 month')
    )
    SELECT 
        COALESCE(current_month.completed, 0)::INT AS completed_count,
        COALESCE(current_month.cancelled, 0)::INT AS cancelled_count,
        COALESCE(current_month.pending, 0)::INT AS pending_count,
        COALESCE(current_month.in_progress, 0)::INT AS in_progress_count,
        COALESCE(current_month.net_revenue, 0)::NUMERIC AS revenue_current,
        COALESCE(last_month.net_revenue, 0)::NUMERIC AS revenue_last_month,
        COALESCE(current_month.avg_hours, 0)::NUMERIC AS avg_completion_hours,
        CASE WHEN COALESCE(last_month.net_revenue, 0) = 0 THEN 0::NUMERIC
            ELSE ((COALESCE(current_month.net_revenue, 0) - COALESCE(last_month.net_revenue, 0)) / NULLIF(COALESCE(last_month.net_revenue, 0), 0) * 100)::NUMERIC
        END AS revenue_change_pct,
        CASE WHEN COALESCE(last_month.completed, 0) = 0 THEN 0::NUMERIC
            ELSE ((COALESCE(current_month.completed, 0) - COALESCE(last_month.completed, 0)) / NULLIF(COALESCE(last_month.completed, 0), 0) * 100)::NUMERIC
        END AS completed_change_pct,
        COALESCE(current_month.revenue, 0)::NUMERIC AS gross_revenue_current,
        COALESCE(current_month.net_revenue, 0)::NUMERIC AS net_revenue_current,
        COALESCE(last_month.revenue, 0)::NUMERIC AS gross_revenue_last_month,
        COALESCE(last_month.net_revenue, 0)::NUMERIC AS net_revenue_last_month,
        CASE WHEN COALESCE(last_month.revenue, 0) = 0 THEN 0::NUMERIC
            ELSE ((COALESCE(current_month.revenue, 0) - COALESCE(last_month.revenue, 0)) / NULLIF(COALESCE(last_month.revenue, 0), 0) * 100)::NUMERIC
        END AS gross_revenue_change_pct,
        CASE WHEN COALESCE(last_month.net_revenue, 0) = 0 THEN 0::NUMERIC
            ELSE ((COALESCE(current_month.net_revenue, 0) - COALESCE(last_month.net_revenue, 0)) / NULLIF(COALESCE(last_month.net_revenue, 0), 0) * 100)::NUMERIC
        END AS net_revenue_change_pct
    FROM current_month, last_month;
END;
$$ LANGUAGE plpgsql;

CREATE
OR REPLACE FUNCTION public.admin_get_monthly_stats (p_months INT DEFAULT 6) RETURNS TABLE (month TEXT, cleanings INT, revenue NUMERIC, gross NUMERIC, net NUMERIC) SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    RETURN QUERY
    SELECT 
        TO_CHAR(DATE_TRUNC('month', c.scheduled_start), 'Mon YYYY') AS month,
        COUNT(*)::INT AS cleanings,
        COALESCE(SUM(c.service_cost - COALESCE(c.cleaner_pay, 0)) FILTER (WHERE c.status = 'completed'), 0)::NUMERIC AS revenue,
        COALESCE(SUM(c.service_cost) FILTER (WHERE c.status = 'completed'), 0)::NUMERIC AS gross,
        COALESCE(SUM(c.service_cost - COALESCE(c.cleaner_pay, 0)) FILTER (WHERE c.status = 'completed'), 0)::NUMERIC AS net
    FROM public.cleanings c
    WHERE c.deleted_at IS NULL
    AND c.scheduled_start > NOW() - (p_months || ' months')::INTERVAL
    GROUP BY DATE_TRUNC('month', c.scheduled_start)
    ORDER BY DATE_TRUNC('month', c.scheduled_start);
END;
$$ LANGUAGE plpgsql;

CREATE
OR REPLACE FUNCTION public.admin_get_user_growth_by_month (p_months INT DEFAULT 6) RETURNS TABLE (month TEXT, hosts INT, cleaners INT) SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    RETURN QUERY
    SELECT 
        TO_CHAR(DATE_TRUNC('month', au.created_at), 'Mon YYYY') AS month,
        COUNT(*) FILTER (WHERE p.role::TEXT = 'host')::INT AS hosts,
        COUNT(*) FILTER (WHERE p.role::TEXT = 'cleaner')::INT AS cleaners
    FROM public.profiles p
    JOIN auth.users au ON p.id = au.id
    WHERE au.created_at > NOW() - (p_months || ' months')::INTERVAL
    GROUP BY DATE_TRUNC('month', au.created_at)
    ORDER BY DATE_TRUNC('month', au.created_at);
END;
$$ LANGUAGE plpgsql;

CREATE
OR REPLACE FUNCTION public.admin_get_active_cleanings () RETURNS TABLE (status TEXT, count INT) SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.status::TEXT AS status,
        COUNT(*)::INT AS count
    FROM public.cleanings c
    WHERE c.deleted_at IS NULL
    AND c.status IN ('requested', 'confirmed', 'in_progress')
    GROUP BY c.status
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

CREATE
OR REPLACE FUNCTION public.admin_get_cleanings_over_time (
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '180 days',
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) RETURNS TABLE (date TEXT, cleanings INT) SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    RETURN QUERY
    SELECT 
        TO_CHAR(DATE_TRUNC('month', c.created_at), 'Mon YYYY') AS date,
        COUNT(*)::INT AS cleanings
    FROM public.cleanings c
    WHERE c.deleted_at IS NULL
    AND c.created_at BETWEEN p_start_date AND p_end_date
    GROUP BY DATE_TRUNC('month', c.created_at)
    ORDER BY DATE_TRUNC('month', c.created_at);
END;
$$ LANGUAGE plpgsql;

CREATE
OR REPLACE FUNCTION public.admin_get_revenue_over_time (
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '180 days',
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) RETURNS TABLE (date TEXT, revenue NUMERIC, gross NUMERIC, net NUMERIC) SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    RETURN QUERY
    SELECT 
        TO_CHAR(DATE_TRUNC('month', c.scheduled_start), 'Mon YYYY') AS date,
        COALESCE(SUM(c.service_cost - COALESCE(c.cleaner_pay, 0)), 0)::NUMERIC AS revenue,
        COALESCE(SUM(c.service_cost), 0)::NUMERIC AS gross,
        COALESCE(SUM(c.service_cost - COALESCE(c.cleaner_pay, 0)), 0)::NUMERIC AS net
    FROM public.cleanings c
    WHERE c.deleted_at IS NULL
    AND c.status = 'completed'
    AND c.scheduled_start BETWEEN p_start_date AND p_end_date
    GROUP BY DATE_TRUNC('month', c.scheduled_start)
    ORDER BY DATE_TRUNC('month', c.scheduled_start);
END;
$$ LANGUAGE plpgsql;

CREATE
OR REPLACE FUNCTION public.admin_get_user_growth (
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '180 days',
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) RETURNS TABLE (date TEXT, hosts INT, cleaners INT) SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    RETURN QUERY
    SELECT 
        TO_CHAR(DATE_TRUNC('month', p.created_at), 'Mon YYYY') AS date,
        COUNT(*) FILTER (WHERE p.role::TEXT = 'host')::INT AS hosts,
        COUNT(*) FILTER (WHERE p.role::TEXT = 'cleaner')::INT AS cleaners
    FROM public.profiles p
    WHERE p.created_at BETWEEN p_start_date AND p_end_date
    GROUP BY DATE_TRUNC('month', p.created_at)
    ORDER BY DATE_TRUNC('month', p.created_at);
END;
$$ LANGUAGE plpgsql;

CREATE
OR REPLACE FUNCTION public.admin_get_cleaning_status_breakdown (
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '180 days',
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) RETURNS TABLE (status TEXT, count INT) SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.status::TEXT AS status,
        COUNT(*)::INT AS count
    FROM public.cleanings c
    WHERE c.deleted_at IS NULL
    AND c.created_at BETWEEN p_start_date AND p_end_date
    GROUP BY c.status
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

CREATE
OR REPLACE FUNCTION public.admin_get_platform_stats_trend (p_period_days INT DEFAULT 30) RETURNS TABLE (
    total_properties INT,
    total_hosts INT,
    total_cleaners INT,
    completed_current INT,
    completed_previous INT,
    total_current INT,
    total_previous INT,
    properties_change NUMERIC,
    completed_change NUMERIC,
    total_change NUMERIC
) SECURITY DEFINER
SET
    search_path = public AS $$
BEGIN
    RETURN QUERY
    WITH periods AS (
        SELECT 
            NOW() - (p_period_days || ' days')::INTERVAL AS current_start,
            NOW() AS current_end,
            NOW() - ((p_period_days * 2) || ' days')::INTERVAL AS previous_start,
            NOW() - (p_period_days || ' days')::INTERVAL AS previous_end
    ),
    stats AS (
        SELECT 
            (SELECT COUNT(*)::INT FROM public.properties WHERE deleted_at IS NULL) AS total_properties,
            (SELECT COUNT(*)::INT FROM public.profiles WHERE role::TEXT = 'host') AS total_hosts,
            (SELECT COUNT(*)::INT FROM public.profiles WHERE role::TEXT = 'cleaner') AS total_cleaners,
            (SELECT COUNT(*)::INT FROM public.cleanings WHERE status = 'completed' AND deleted_at IS NULL AND created_at >= periods.current_start) AS completed_current,
            (SELECT COUNT(*)::INT FROM public.cleanings WHERE status = 'completed' AND deleted_at IS NULL AND created_at >= periods.previous_start AND created_at < periods.previous_end) AS completed_previous,
            (SELECT COUNT(*)::INT FROM public.cleanings WHERE deleted_at IS NULL AND created_at >= periods.current_start) AS total_current,
            (SELECT COUNT(*)::INT FROM public.cleanings WHERE deleted_at IS NULL AND created_at >= periods.previous_start AND created_at < periods.previous_end) AS total_previous,
            (SELECT COUNT(*)::INT FROM public.properties WHERE deleted_at IS NULL AND created_at >= periods.current_start) AS properties_current,
            (SELECT COUNT(*)::NUMERIC FROM public.properties WHERE deleted_at IS NULL AND created_at >= periods.current_start) AS properties_current_numeric,
            (SELECT COUNT(*)::NUMERIC FROM public.properties WHERE deleted_at IS NULL) AS properties_total
        FROM periods
    )
    SELECT 
        stats.total_properties,
        stats.total_hosts,
        stats.total_cleaners,
        stats.completed_current,
        stats.completed_previous,
        stats.total_current,
        stats.total_previous,
        CASE WHEN stats.properties_current = 0 THEN 0::NUMERIC
            ELSE (stats.properties_current_numeric / NULLIF(stats.properties_total, 0) * 100)
        END AS properties_change,
        CASE WHEN stats.completed_previous = 0 THEN 0::NUMERIC
            ELSE (((stats.completed_current::NUMERIC - stats.completed_previous::NUMERIC) / NULLIF(stats.completed_previous::NUMERIC, 0)) * 100)
        END AS completed_change,
        CASE WHEN stats.total_previous = 0 THEN 0::NUMERIC
            ELSE (((stats.total_current::NUMERIC - stats.total_previous::NUMERIC) / NULLIF(stats.total_previous::NUMERIC, 0)) * 100)
        END AS total_change
    FROM stats;
END;
$$ LANGUAGE plpgsql;

COMMIT;

REVOKE EXECUTE ON FUNCTION public.admin_get_revenue_metrics FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_revenue_metrics TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_get_monthly_stats FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_monthly_stats TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_get_user_growth_by_month FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_user_growth_by_month TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_get_active_cleanings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_active_cleanings() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_get_cleanings_over_time FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_cleanings_over_time TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_get_revenue_over_time FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_revenue_over_time TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_get_user_growth FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_user_growth TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_get_cleaning_status_breakdown FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_cleaning_status_breakdown TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_get_platform_stats_trend FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_platform_stats_trend TO authenticated;