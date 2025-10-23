// 절대 여기서 createClient(...)를 호출하지 마세요.
// 공용 싱글톤을 supabaseClient.ts에서만 생성하고,
// 이 파일은 그 인스턴스를 재수출만 합니다.

export { supabase as default, supabase } from "./supabaseClient";