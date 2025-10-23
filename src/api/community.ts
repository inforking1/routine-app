// src/api/community.ts
import { supabase } from "../lib/supabaseClient";
import { getDeviceId } from "../lib/device";

export type ServerPost = {
  id: number;
  user_id: string | null;
  device_id: string | null;
  author: string | null;
  title: string | null;
  content: string;
  likes: number;
  created_at: string;
};

export type ServerComment = {
  id: number;
  post_id: number;
  user_id: string | null;
  device_id: string | null;
  author: string | null;
  content: string;
  created_at: string;
};

// ---- 로컬 구조 가정(community_posts) ----
export type LocalComment = {
  id?: number;
  author?: string;
  content: string;
  createdAt?: string | number; // ISO or epoch
};

export type LocalPost = {
  id: number;
  author?: string;
  title?: string;
  content: string;
  likes?: number;
  createdAt?: string | number; // ISO or epoch
  comments?: LocalComment[];
};

// createdAt 정규화
function normalizeISO(v?: string | number): string {
  if (!v) return new Date().toISOString();
  if (typeof v === "number") return new Date(v).toISOString();
  // string
  const d = new Date(v);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

/** 서버: posts + comments 전체 가져오기 (검색어 선택) */
export async function fetchServerPosts(search?: string) {
  let query = supabase
    .from("posts")
    .select("*, comments(*)")
    .order("created_at", { ascending: false });

  if (search && search.trim()) {
    const q = `%${search.trim()}%`;
    query = query.or(`title.ilike.${q},content.ilike.${q},author.ilike.${q}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Array<ServerPost & { comments: ServerComment[] }>;
}

/** 1개 글 업로드(로컬 → 서버) */
export async function uploadOneLocalPost(lp: LocalPost) {
  const device_id = getDeviceId();
  const { data: post, error: e1 } = await supabase
    .from("posts")
    .insert([
      {
        device_id,
        author: lp.author ?? "익명",
        title: (lp.title ?? lp.content?.split("\n")?.[0] ?? "").slice(0, 120) || null,
        content: lp.content,
        likes: lp.likes ?? 0,
        created_at: normalizeISO(lp.createdAt),
      },
    ])
    .select("*")
    .single();

  if (e1) throw e1;

  // 댓글 업로드
  if (lp.comments?.length) {
    const rows = lp.comments.map((c) => ({
      post_id: (post as ServerPost).id,
      device_id,
      author: c.author ?? "익명",
      content: c.content,
      created_at: normalizeISO(c.createdAt),
    }));
    const { error: e2 } = await supabase.from("comments").insert(rows);
    if (e2) throw e2;
  }

  return post as ServerPost;
}

/** 다수 글 일괄 업로드(중복 방지: localStorage에 이전한 id 기록) */
export async function uploadLocalCommunityAll() {
  const localPosts: LocalPost[] = JSON.parse(
    localStorage.getItem("community_posts") || "[]"
  );

  if (!Array.isArray(localPosts) || localPosts.length === 0) {
    return { uploaded: 0, skipped: 0 };
  }

  const migratedKey = "migrated_post_ids";
  const migrated: Record<string, true> = JSON.parse(
    localStorage.getItem(migratedKey) || "{}"
  );

  let uploaded = 0;
  let skipped = 0;

  for (const lp of localPosts) {
    const k = String(lp.id);
    if (migrated[k]) {
      skipped++;
      continue;
    }
    try {
      await uploadOneLocalPost(lp);
      migrated[k] = true;
      uploaded++;
      // 매 건마다 저장(중간 실패 대비)
      localStorage.setItem(migratedKey, JSON.stringify(migrated));
    } catch (e) {
      console.error("업로드 실패:", e);
    }
  }

  return { uploaded, skipped };
}

/** 서버 → 로컬로 community_posts 형태로 내려받기(뷰 유지용) */
export async function downloadServerToLocal() {
  const rows = await fetchServerPosts();
  const localShape: LocalPost[] = rows.map((p) => ({
    id: p.id,
    author: p.author ?? undefined,
    title: p.title ?? undefined,
    content: p.content,
    likes: p.likes ?? 0,
    createdAt: p.created_at,
    comments: (p.comments ?? []).map((c) => ({
      id: c.id,
      author: c.author ?? undefined,
      content: c.content,
      createdAt: c.created_at,
    })),
  }));

  localStorage.setItem("community_posts", JSON.stringify(localShape));
  return { count: localShape.length };
}
