import { useEffect, useState } from 'react';
import PageShell from '../components/PageShell';
import { supabase } from '../lib/supabaseClient';
import useAuth from '../hooks/useAuth';

type Routine = {
    id: string;
    user_id: string;
    title: string;
    order_index: number;
    category: string;
};

export default function RoutineManagePage({ onHome }: { onHome?: () => void }) {
    const { user } = useAuth();
    const [routines, setRoutines] = useState<Routine[]>([]);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState<'morning' | 'evening'>('morning');
    const [newTitle, setNewTitle] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');

    // Fetch Routines
    const fetchRoutines = async () => {
        if (!user) return;
        setLoading(true);
        try {
            let { data, error } = await supabase
                .from('routines')
                .select('*')
                .eq('user_id', user.id)
                .eq('category', category)
                .order('order_index', { ascending: true });

            if (error) throw error;

            // Auto-seed if empty
            if (!data || data.length === 0) {
                const seeds = [
                    { user_id: user.id, title: '물 한 잔 마시기', category: 'morning', order_index: 0 },
                    { user_id: user.id, title: '스트레칭 5분', category: 'morning', order_index: 1 },
                    { user_id: user.id, title: '오늘의 다짐 읽기', category: 'morning', order_index: 2 },
                ];
                // Only seed for morning for now as per requirements
                if (category === 'morning') {
                    const { data: inserted, error: insertError } = await supabase.from('routines').insert(seeds).select();
                    if (insertError) throw insertError;
                    data = inserted;
                }
            }

            setRoutines(data || []);
        } catch (e: any) {
            console.error('Error fetching routines:', e);
            alert('루틴을 불러오는 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoutines();
    }, [user, category]);

    // Add Routine
    const handleAdd = async () => {
        if (!newTitle.trim() || !user) return;
        try {
            const nextOrder = routines.length > 0 ? Math.max(...routines.map(r => r.order_index)) + 1 : 0;
            const { data, error } = await supabase
                .from('routines')
                .insert({
                    user_id: user.id,
                    title: newTitle.trim(),
                    category,
                    order_index: nextOrder
                })
                .select()
                .single();

            if (error) throw error;
            setRoutines([...routines, data]);
            setNewTitle('');
        } catch (e: any) {
            console.error('Error adding routine:', e);
            alert('루틴 추가 실패');
        }
    };

    // Delete Routine
    const handleDelete = async (id: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        try {
            const { error } = await supabase.from('routines').delete().eq('id', id);
            if (error) throw error;
            setRoutines(routines.filter(r => r.id !== id));
        } catch (e: any) {
            console.error('Error deleting routine:', e);
            alert('삭제 실패');
        }
    };

    // Start Edit
    const startEdit = (r: Routine) => {
        setEditingId(r.id);
        setEditTitle(r.title);
    };

    // Save Edit
    const saveEdit = async () => {
        if (!editingId || !editTitle.trim()) {
            setEditingId(null);
            return;
        }
        try {
            const { error } = await supabase
                .from('routines')
                .update({ title: editTitle.trim() })
                .eq('id', editingId);
            if (error) throw error;

            setRoutines(routines.map(r => r.id === editingId ? { ...r, title: editTitle.trim() } : r));
            setEditingId(null);
            setEditTitle('');
        } catch (e) {
            console.error('Update failed', e);
            alert('수정 실패');
        }
    };

    if (!user) {
        return (
            <PageShell title="루틴 관리" onHome={onHome} showHeader={false}>
                <div className="py-10 text-center text-slate-500">로그인이 필요합니다.</div>
            </PageShell>
        );
    }

    return (
        <PageShell title="루틴 관리" onHome={onHome} showHeader={false}>
            {/* Header Card */}
            <section className="rounded-[22px] bg-[#F3F5FE] shadow-sm px-5 py-6 mb-5 md:hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-1">
                    <h1 className="text-[20px] font-semibold text-slate-900">루틴 관리</h1>
                    {onHome && (
                        <button
                            onClick={onHome}
                            className="text-[13px] text-indigo-600 bg-white/70 border border-indigo-100 rounded-full px-3 py-[3px] shadow-sm hover:bg-white hover:border-indigo-200 hover:text-indigo-700 active:scale-[0.97] transition-all"
                        >
                            ← 홈으로
                        </button>
                    )}
                </div>
                <p className="text-[13px] text-slate-600">아침 루틴을 추가·수정·삭제하고, 나중에 저녁 루틴도 확장할 수 있도록 준비합니다.</p>
            </section>

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setCategory('morning')}
                    className={`inline-flex items-center justify-center rounded-full px-3 py-1.5 text-[13px] font-medium transition-all
            ${category === 'morning' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white/80 border border-slate-200 text-slate-600 hover:bg-white'}`}
                >
                    아침 루틴
                </button>
                <button
                    disabled
                    className="inline-flex items-center justify-center rounded-full px-3 py-1.5 text-[13px] font-medium bg-white/60 border border-slate-200 text-slate-400 cursor-not-allowed"
                >
                    저녁 루틴
                </button>
            </div>

            {/* Main List Card */}
            <section className="rounded-[22px] bg-[#F5F7FF] shadow-sm px-5 py-6 space-y-4">
                <div>
                    <h2 className="text-[18px] font-semibold text-slate-900 mb-1">아침 루틴</h2>
                    <p className="text-[13px] text-slate-600 mb-3">하루를 여는 루틴을 자유롭게 구성해 보세요.</p>
                </div>

                {/* List */}
                <div className="space-y-2">
                    {loading ? (
                        <div className="text-center py-4 text-slate-400 text-[13px]">루틴을 불러오는 중입니다...</div>
                    ) : routines.length === 0 ? (
                        <div className="text-center py-4 text-slate-400 text-[13px]">등록된 루틴이 없습니다.</div>
                    ) : (
                        routines.map((r) => (
                            <div key={r.id} className="flex items-center justify-between rounded-[16px] bg-white/80 px-4 py-2.5 border border-indigo-50 text-[14px] text-slate-800 md:hover:bg-white md:hover:shadow-sm md:transition-all">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <span className="text-[16px] text-slate-400 cursor-grab select-none">≡</span>
                                    {editingId === r.id ? (
                                        <input
                                            autoFocus
                                            className="flex-1 min-w-0 bg-transparent outline-none border-b border-indigo-300 pb-1"
                                            value={editTitle}
                                            onChange={(e) => setEditTitle(e.target.value)}
                                            onBlur={saveEdit}
                                            onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                                        />
                                    ) : (
                                        <span className="truncate">{r.title}</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                    {editingId === r.id ? (
                                        <button onClick={saveEdit} className="text-[12px] text-emerald-600 bg-white border border-emerald-100 rounded-full px-3 py-[3px] shadow-sm">저장</button>
                                    ) : (
                                        <button onClick={() => startEdit(r)} className="text-[12px] text-indigo-600 bg-white border border-indigo-100 rounded-full px-3 py-[3px] shadow-sm hover:bg-white hover:border-indigo-200 hover:text-indigo-700">수정</button>
                                    )}
                                    <button onClick={() => handleDelete(r.id)} className="text-[12px] text-rose-500 bg-transparent hover:bg-rose-50 rounded-full px-2 py-[2px]" title="삭제">🗑</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Add New */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-indigo-100">
                    <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        placeholder="예: 물 한 잔 마시기"
                        className="flex-1 rounded-full border border-indigo-100 bg-white px-3 py-2 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                    <button
                        onClick={handleAdd}
                        className="text-[13px] text-white bg-emerald-600 rounded-full px-4 py-2 shadow-sm hover:bg-emerald-700 active:scale-[0.97] transition-all whitespace-nowrap"
                    >
                        추가
                    </button>
                </div>
            </section>

        </PageShell>
    );
}
