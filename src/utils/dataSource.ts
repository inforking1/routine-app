// src/utils/dataSource.ts
import { supabase } from "../lib/supabaseClient";

/** ---------- 공통 타입 ---------- */
export type UUID = string;

/** ---------- Todos ---------- */
export type Todo = {
  id: UUID;
  user_id: UUID;
  text: string;
  done: boolean;
  due: string | null;         // 'YYYY-MM-DD'
  order: number | null;
  pinned: boolean;
  created_at: string;
  // New fields
  priority: "high" | "normal"; // default 'normal'
  tags: string[];             // default []
  is_recurring: boolean;      // default false
  recurring_rule: string | null;
  notes: string;              // default ''
  goal_id: UUID | null;
};

/** ---------- Anniversaries ---------- */
export type Anniversary = {
  id: UUID;
  user_id: UUID;
  title: string;
  date: string;               // 'YYYY-MM-DD'
  type?: 'solar' | 'lunar';
  is_recurring?: boolean;
  created_at: string;
};

/** ---------- Gratitude ---------- */
export type Gratitude = {
  id: UUID;
  user_id: UUID;
  text: string;
  date: string | null;        // optional 'YYYY-MM-DD'
  created_at: string;
};

/** ---------- Mind Pledges (오늘의 다짐) ---------- */
export type MindPledge = {
  id: UUID;
  user_id: UUID;
  text: string;
  selected: boolean | null;
  created_at: string;
};

export function createSource(userId: UUID) {
  return {
    // ===== Todos =====
    async listTodos(limit?: number): Promise<Todo[]> {
      let q = supabase
        .from("todos")
        .select("id,user_id,text,done,due,order,pinned,created_at,priority,tags,is_recurring,recurring_rule,notes,goal_id")
        .eq("user_id", userId)
        .order("pinned", { ascending: false })
        .order("order", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Todo[];
    },

    async addTodo(input: Omit<Todo, "id" | "created_at" | "user_id"> & { text: string }): Promise<Todo> {
      const { data, error } = await supabase
        .from("todos")
        .insert({
          user_id: userId,
          text: input.text,
          done: false,
          due: input.due ?? null,
          order: input.order ?? null,
          pinned: !!input.pinned,
          priority: input.priority || "normal",
          tags: input.tags || [],
          is_recurring: !!input.is_recurring,
          recurring_rule: input.recurring_rule || null,
          notes: input.notes || "",
          goal_id: input.goal_id || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Todo;
    },

    async updateTodo(id: UUID, patch: Partial<Omit<Todo, "id" | "user_id" | "created_at">>): Promise<void> {
      const { error } = await supabase
        .from("todos")
        .update(patch)
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw error;
    },

    async removeTodo(id: UUID): Promise<void> {
      const { error } = await supabase
        .from("todos")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw error;
    },

    // ===== Anniversaries =====
    async listAnniversaries(limit?: number): Promise<Anniversary[]> {
      let q = supabase
        .from("anniversaries")
        .select("id,user_id,title,date,type,is_recurring,created_at")
        .eq("user_id", userId)
        .order("date", { ascending: true });
      q = q.limit(limit || 50);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Anniversary[];
    },

    // ===== Gratitude =====
    async listGratitude(limit?: number): Promise<Gratitude[]> {
      let q = supabase
        .from("gratitudes")
        .select("id,user_id,text,date,created_at")
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      q = q.limit(limit || 50);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Gratitude[];
    },

    async addGratitude(text: string, date?: string | null): Promise<Gratitude> {
      const { data, error } = await supabase
        .from("gratitudes")
        .insert({ user_id: userId, text, date: date ?? null })
        .select()
        .single();
      if (error) throw error;
      return data as Gratitude;
    },

    // 🔽🔽🔽 [추가] 감사일기 수정 메서드 🔽🔽🔽
    async updateGratitude(id: UUID, text: string): Promise<Gratitude> {
      const { data, error } = await supabase
        .from("gratitudes")
        .update({ text })
        .eq("id", id)
        .eq("user_id", userId)
        .select()
        .single();
      if (error) throw error;
      return data as Gratitude;
    },
    // 🔼🔼🔼 [추가 끝] 🔼🔼🔼

    // 🔽🔽🔽 [추가] 감사일기 삭제 메서드 (UI에서 호출됨) 🔽🔽🔽
    async removeGratitude(id: UUID): Promise<void> {
      const { error } = await supabase
        .from("gratitudes")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw error;
    },
    // 🔼🔼🔼 [추가 끝] 🔼🔼🔼

    // ===== Mind Pledges (오늘의 다짐) =====
    async listPledges(limit?: number): Promise<MindPledge[]> {
      let q = supabase
        .from("mind_pledges")
        .select("id,user_id,text,selected,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      q = q.limit(limit || 50);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as MindPledge[];
    },

    async addPledge(text: string): Promise<MindPledge> {
      const { data, error } = await supabase
        .from("mind_pledges")
        .insert({ user_id: userId, text })
        .select()
        .single();
      if (error) throw error;
      return data as MindPledge;
    },

    async updatePledge(id: UUID, patch: Partial<Pick<MindPledge, "text" | "selected">>) {
      const { error } = await supabase
        .from("mind_pledges")
        .update(patch)
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw error;
    },

    async removePledge(id: UUID) {
      const { error } = await supabase
        .from("mind_pledges")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw error;
    },
  };
}

// ---------- Missions / Rewards ----------
export async function isOperator(): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_operator");
  if (error) return false;
  return Boolean(data);
}

export type UserRoleRow = { user_id: string; email: string; roles: string[] | null };

export async function fetchUserRoleList(): Promise<UserRoleRow[]> {
  const { data, error } = await supabase.rpc("list_user_roles");
  if (error) throw error;
  return (data ?? []) as UserRoleRow[];
}

export async function grantUserRole(email: string, role: string) {
  const { error } = await supabase.rpc("grant_role", { p_email: email, p_role: role });
  if (error) throw error;
}

export async function revokeUserRole(email: string, role: string) {
  const { error } = await supabase.rpc("revoke_role", { p_email: email, p_role: role });
  if (error) throw error;
}

export type Mission = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  reward_points: number | null;
  coupon_id: string | null;
  is_active: boolean;
  created_at: string;
};

export type UserMission = {
  id: string;
  mission_id: string;
  user_id: string;
  status: "todo" | "in_progress" | "done";
  progress: number;
  completed_at: string | null;
  created_at: string;
};

export type Coupon = {
  id: string;
  name: string;
  description: string | null;
  discount_type: "percent" | "amount";
  discount_value: number;
  expires_at: string | null;
  active: boolean;
  created_at: string;
};

export type UserCoupon = {
  id: string;
  user_id: string;
  coupon_id: string;
  issued_at: string;
  used_at: string | null;
};

export async function fetchMissions(): Promise<Mission[]> {
  const { data, error } = await supabase
    .from("missions")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Mission[];
}

export async function fetchMyUserMissions(): Promise<UserMission[]> {
  const { data, error } = await supabase
    .from("user_missions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as UserMission[];
}

export async function fetchMyCoupons(): Promise<(UserCoupon & { coupon: Coupon })[]> {
  const { data, error } = await supabase
    .from("user_coupons")
    .select("*, coupon:coupon_id(*)")
    .order("issued_at", { ascending: false });
  if (error) throw error;
  return data as any;
}

/** 운영자용 */
export async function rpcCreateMission(input: {
  title: string;
  description?: string;
  starts_at?: string | null;
  ends_at?: string | null;
  reward_points?: number;
  coupon_id?: string | null;
  status?: 'active' | 'inactive' | 'draft';
}): Promise<string> {
  const { data, error } = await supabase.rpc("create_mission", {
    p_title: input.title,
    p_description: input.description ?? null,
    p_starts_at: input.starts_at ?? null,
    p_ends_at: input.ends_at ?? null,
    p_reward_points: input.reward_points ?? 0,
    p_coupon_id: input.coupon_id ?? null,
  });
  if (error) throw error;
  return data as string;
}

export async function rpcUpdateMission(id: string, patch: Partial<{
  title: string;
  description: string;
  starts_at: string | null;
  ends_at: string | null;
  reward_points: number;
  coupon_id: string | null;
  status?: 'active' | 'inactive' | 'draft';
}>): Promise<void> {
  const { error } = await supabase.rpc("update_mission", {
    p_id: id,
    p_title: patch.title ?? null,
    p_description: patch.description ?? null,
    p_starts_at: patch.starts_at ?? null,
    p_ends_at: patch.ends_at ?? null,
    p_reward_points: patch.reward_points ?? null,
    p_coupon_id: patch.coupon_id ?? null,
  });
  if (error) throw error;
}

export async function rpcCreateCoupon(input: {
  name: string;
  description?: string;
  discount_type?: "percent" | "amount";
  discount_value: number;
  expires_at?: string | null;
}): Promise<string> {
  const { data, error } = await supabase.rpc("create_coupon", {
    p_name: input.name,
    p_description: input.description ?? null,
    p_discount_type: input.discount_type ?? "percent",
    p_discount_value: input.discount_value,
    p_expires_at: input.expires_at ?? null,
  });
  if (error) throw error;
  return data as string;
}

/** 유저용 */
export async function rpcEnrollMission(missionId: string): Promise<void> {
  const { error } = await supabase.rpc("enroll_in_mission", { p_mission_id: missionId });
  if (error) throw error;
}

export async function rpcCompleteMission(missionId: string): Promise<void> {
  const { error } = await supabase.rpc("complete_mission", { p_mission_id: missionId });
  if (error) throw error;
}