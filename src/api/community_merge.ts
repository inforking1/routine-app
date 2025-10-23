import { supabase } from "../lib/supabaseClient";
import { getDeviceId } from "../lib/device";

/**
 * 로그인 직후 호출해, 이 디바이스(device_id)에서 내가 만든 익명 글/댓글을
 * 현재 로그인된 계정(user_id)으로 귀속(머지)합니다.
 */
export async function claimAnonymousCommunityData(): Promise<{
  updatedPosts: number;
  updatedComments: number;
}> {
  // ./auth 대신 supabase.auth에서 직접 현재 유저 조회
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) {
    // 유저 조회 실패 시 머지 시도하지 않음
    return { updatedPosts: 0, updatedComments: 0 };
  }
  if (!user) {
    // 미로그인 상태면 아무 것도 하지 않음
    return { updatedPosts: 0, updatedComments: 0 };
  }

  const device_id = getDeviceId();

  // 내가 이 디바이스에서 만든(=device_id 일치) + 아직 user_id가 비어있는 행만 대상으로 업데이트
  const { data: updPosts, error: e1 } = await supabase
    .from("posts")
    .update({ user_id: user.id })
    .eq("device_id", device_id)
    .is("user_id", null)
    .select("id");

  if (e1) throw e1;

  const { data: updComments, error: e2 } = await supabase
    .from("comments")
    .update({ user_id: user.id })
    .eq("device_id", device_id)
    .is("user_id", null)
    .select("id");

  if (e2) throw e2;

  return {
    updatedPosts: updPosts?.length ?? 0,
    updatedComments: updComments?.length ?? 0,
  };
}
