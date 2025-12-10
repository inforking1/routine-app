import { useState, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import useAuth from './useAuth';

export type RoutineLog = {
    id: number;
    routine_id: string;
    is_success: boolean;
    completed_at: string;
    category?: string;
};

/**
 * useRoutineAnalytics
 * - 루틴 성공 데이터를 분석하고 조회하는 훅
 * - 추후 대시보드 차트 등에 연동 가능
 */
export function useRoutineAnalytics() {
    const { user } = useAuth();
    const [logs, setLogs] = useState<RoutineLog[]>([]);
    const [loading, setLoading] = useState(false);

    // 1. 기간별 로그 조회
    const fetchLogs = async (days: number = 30) => {
        if (!user) return;
        setLoading(true);
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const { data, error } = await supabase
                .from('routine_logs')
                .select('*')
                .eq('user_id', user.id)
                .gte('completed_at', startDate.toISOString())
                .order('completed_at', { ascending: true });

            if (error) throw error;
            setLogs(data as RoutineLog[]);
        } catch (e) {
            console.error("Failed to fetch routine logs", e);
        } finally {
            setLoading(false);
        }
    };

    // 2. 로그 기록 (성공 시 호출)
    const logSuccess = async (routineId: string, category: string = 'general') => {
        if (!user) return;
        try {
            await supabase.from('routine_logs').insert({
                user_id: user.id,
                routine_id: routineId,
                category,
                is_success: true,
                completed_at: new Date().toISOString(),
            });
            // 낙관적 업데이트 등은 필요 시 추가
        } catch (e) {
            console.error("Failed to log routine success", e);
        }
    };

    // 3. 분석: 일간 성공률 (예시)
    const dailySuccessRate = useMemo(() => {
        if (logs.length === 0) return 0;
        const total = logs.length;
        const success = logs.filter(l => l.is_success).length;
        return Math.round((success / total) * 100);
    }, [logs]);

    // 4. 분석: 카테고리별 분포
    const categoryDistribution = useMemo(() => {
        const dist: Record<string, number> = {};
        logs.forEach(l => {
            const cat = l.category || 'uncategorized';
            dist[cat] = (dist[cat] || 0) + 1;
        });
        return dist;
    }, [logs]);

    return {
        logs,
        loading,
        fetchLogs,
        logSuccess,
        stats: {
            dailySuccessRate,
            categoryDistribution
        }
    };
}
