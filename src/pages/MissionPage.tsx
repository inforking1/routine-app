import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
} from "react";
import PageShell from "../components/PageShell";
import {
  isOperator,
  fetchMissions,
  fetchMyUserMissions,
  fetchMyCoupons,
  rpcCreateMission,
  rpcUpdateMission,
  rpcEnrollMission,
  rpcCompleteMission,
  rpcCreateCoupon,
  type Mission,
  type UserMission,
} from "../utils/dataSource";
import { format } from "date-fns";
/* ✅ 추가: 로그인 유저 ID를 얻기 위해 supabase 클라이언트 임포트 */
import { supabase } from "../lib/supabaseClient";

type Props = { onHome?: () => void };

/* ---------- UI Primitives (공통) ---------- */

const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className = "",
  children,
}) => (
  <section
    className={
      "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm " + className
    }
  >
    {children}
  </section>
);

const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }
> = ({ className = "", busy, children, ...rest }) => (
  <button
    {...rest}
    disabled={busy || rest.disabled}
    className={
      "inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50 active:scale-[.99] disabled:opacity-60 " +
      className
    }
  >
    {busy ? "처리 중…" : children}
  </button>
);

/** ✅ ref 전달을 지원하는 Input (forwardRef) */
const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...rest }, ref) => (
    <input
      ref={ref}
      {...rest}
      className={
        "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400/40 " +
        className
      }
    />
  )
);
Input.displayName = "Input";

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({
  className = "",
  children,
  ...rest
}) => (
  <select
    {...rest}
    className={
      "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400/40 " +
      className
    }
  >
    {children}
  </select>
);

/* ---------- Page ---------- */

export default function MissionPage({ onHome }: Props) {
  const [operator, setOperator] = useState<boolean>(false);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [myMissions, setMyMissions] = useState<UserMission[]>([]);
  const [myCoupons, setMyCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // StrictMode 이중 실행 방지
  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    (async () => {
      setLoading(true);
      try {
        try {
          const ok = await isOperator();
          setOperator(!!ok);
        } catch (e) {
          console.warn("isOperator() failed:", e);
          setOperator(false);
        }

        const [ms, ums, coup] = await Promise.allSettled([
          fetchMissions(),
          fetchMyUserMissions(),
          fetchMyCoupons(),
        ]);

        setMissions(ms.status === "fulfilled" ? ms.value : []);
        if (ms.status === "rejected")
          console.warn("fetchMissions failed:", ms.reason);

        setMyMissions(ums.status === "fulfilled" ? ums.value : []);
        if (ums.status === "rejected")
          console.warn("fetchMyUserMissions failed:", ums.reason);

        setMyCoupons(coup.status === "fulfilled" ? coup.value : []);
        if (coup.status === "rejected")
          console.warn("fetchMyCoupons failed:", coup.reason);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const myStatusByMissionId = useMemo(() => {
    const m = new Map<string, UserMission>();
    myMissions.forEach((um) => m.set(um.mission_id, um));
    return m;
  }, [myMissions]);

  const refresh = async () => {
    setLoading(true);
    try {
      const [ms, ums, coup] = await Promise.allSettled([
        fetchMissions(),
        fetchMyUserMissions(),
        fetchMyCoupons(),
      ]);
      setMissions(ms.status === "fulfilled" ? ms.value : []);
      if (ms.status === "rejected")
        console.warn("fetchMissions failed:", ms.reason);
      setMyMissions(ums.status === "fulfilled" ? ums.value : []);
      if (ums.status === "rejected")
        console.warn("fetchMyUserMissions failed:", ums.reason);
      setMyCoupons(coup.status === "fulfilled" ? coup.value : []);
      if (coup.status === "rejected")
        console.warn("fetchMyCoupons failed:", coup.reason);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell title="미션 & 리워드" onHome={onHome}>
      {loading ? (
        <div className="p-4 text-sm text-slate-600">로딩 중…</div>
      ) : (
        <div className="space-y-8">
          {/* 유저: 미션 목록 */}
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-semibold">진행 가능한 미션</h2>
              <Button onClick={refresh}>새로고침</Button>
            </div>

            <div className="grid gap-3">
              {missions.length === 0 ? (
                <p className="text-sm text-slate-500">
                  현재 활성 미션이 없습니다.
                </p>
              ) : (
                missions.map((m) => {
                  const my = myStatusByMissionId.get(m.id);
                  const status = my?.status ?? "todo";
                  const canEnroll = !my;
                  const canComplete = my && my.status !== "done";

                  return (
                    <div
                      key={m.id}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-lg font-semibold">
                            {m.title}
                          </div>
                          {m.description && (
                            <p className="mt-1 line-clamp-3 text-sm text-slate-600">
                              {m.description}
                            </p>
                          )}
                          <p className="mt-2 text-xs text-slate-500">
                            기간:{" "}
                            {m.starts_at
                              ? format(new Date(m.starts_at), "yyyy-MM-dd")
                              : "상시"}{" "}
                            ~{" "}
                            {m.ends_at
                              ? format(new Date(m.ends_at), "yyyy-MM-dd")
                              : "제한없음"}
                          </p>
                          <p className="text-xs text-slate-500">
                            보상: 포인트 {m.reward_points ?? 0}
                            {m.coupon_id ? " + 쿠폰" : ""}
                          </p>
                        </div>

                        <div className="flex min-w-[120px] flex-col items-end gap-2">
                          <span className="text-right text-xs text-slate-500">
                            내 상태: {status}
                          </span>

                          {canEnroll && (
                            <Button
                              onClick={async () => {
                                try {
                                  await rpcEnrollMission(m.id);
                                  await refresh();
                                  alert("참여 완료!");
                                } catch (e: any) {
                                  console.error(e);
                                  alert(
                                    `참여하기 실패: ${
                                      e?.message ?? "알 수 없는 오류"
                                    }`
                                  );
                                }
                              }}
                            >
                              참여하기
                            </Button>
                          )}

                          {canComplete && (
                            <Button
                              onClick={async () => {
                                try {
                                  await rpcCompleteMission(m.id);
                                  await refresh();
                                  alert("완료 처리 및 보상 지급 완료!");
                                } catch (e: any) {
                                  console.error(e);
                                  alert(
                                    `완료 처리 실패: ${
                                      e?.message ?? "알 수 없는 오류"
                                    }`
                                  );
                                }
                              }}
                            >
                              완료하기(보상받기)
                            </Button>
                          )}

                          {!canEnroll && !canComplete && (
                            <span className="text-sm font-medium text-green-600">
                              완료됨
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          {/* 유저: 내 쿠폰 */}
          <Card>
            <h2 className="mb-3 text-xl font-semibold">내 쿠폰</h2>
            {myCoupons.length === 0 ? (
              <p className="text-sm text-slate-500">발급된 쿠폰이 없습니다.</p>
            ) : (
              <div className="grid gap-2">
                {myCoupons.map((uc: any) => (
                  <div
                    key={uc.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {uc.coupon?.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {uc.coupon?.discount_type === "percent"
                          ? `할인 ${uc.coupon?.discount_value}%`
                          : `할인 ${uc.coupon?.discount_value}원`}
                        {uc.coupon?.expires_at
                          ? ` · 유효기간 ${format(
                              new Date(uc.coupon.expires_at),
                              "yyyy-MM-dd"
                            )}`
                          : ""}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">
                      발급: {format(new Date(uc.issued_at), "yyyy-MM-dd")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* 운영자 전용 패널 */}
          {operator && (
            <OperatorPanels onChanged={refresh} missions={missions} />
          )}
        </div>
      )}
    </PageShell>
  );
}

/* ---------- Operator Panel ---------- */

function OperatorPanels({
  onChanged,
  missions,
}: {
  onChanged: () => Promise<void>;
  missions: Mission[];
}) {
  // 언컨트롤드 텍스트 (IME 완전 호환)
  const missionTitleRef = useRef<HTMLInputElement>(null);
  const missionDescRef = useRef<HTMLInputElement>(null);
  const couponNameRef = useRef<HTMLInputElement>(null);
  const couponDescRef = useRef<HTMLInputElement>(null);

  // 컨트롤드로 OK인 값들
  const [start, setStart] = useState<string>("");
  const [end, setEnd] = useState<string>("");
  const [points, setPoints] = useState<number>(0);
  const [couponId, setCouponId] = useState<string>("");

  const [couponType, setCouponType] =
    useState<"percent" | "amount">("percent");
  const [couponValue, setCouponValue] = useState<number>(10);
  const [couponExpire, setCouponExpire] = useState<string>("");

  const [busyMission, setBusyMission] = useState(false);
  const [busyCoupon, setBusyCoupon] = useState(false);

  return (
    <Card>
      <h2 className="mb-3 text-xl font-semibold">운영자 패널</h2>

      {/* 쿠폰 생성 */}
      <Card className="mb-4">
        <div className="mb-2 font-medium">쿠폰 생성</div>
        <div className="grid gap-2 md:grid-cols-5">
          <Input placeholder="이름" ref={couponNameRef} />
          <Input
            placeholder="설명(선택)"
            ref={couponDescRef}
            className="md:col-span-2"
          />
          <Select
            value={couponType}
            onChange={(e) => setCouponType(e.target.value as any)}
          >
            <option value="percent">percent(%)</option>
            <option value="amount">amount(원)</option>
          </Select>
          <Input
            type="number"
            placeholder="할인값"
            value={couponValue}
            onChange={(e) => setCouponValue(Number(e.target.value) || 0)}
          />
          <Input
            type="date"
            value={couponExpire}
            onChange={(e) => setCouponExpire(e.target.value)}
            className="md:col-span-2"
          />
          <Button
            busy={busyCoupon}
            onClick={async () => {
              const name = (couponNameRef.current?.value ?? "").trim();
              const desc = (couponDescRef.current?.value ?? "").trim();
              if (!name) {
                alert("쿠폰 이름을 입력해 주세요.");
                return;
              }
              if (
                couponType === "percent" &&
                (couponValue <= 0 || couponValue > 100)
              ) {
                alert("퍼센트 할인은 1~100 사이여야 합니다.");
                return;
              }
              if (couponType === "amount" && couponValue <= 0) {
                alert("정액 할인은 1원 이상이어야 합니다.");
                return;
              }
              setBusyCoupon(true);
              try {
                const id = await rpcCreateCoupon({
                  name,
                  description: desc || undefined,
                  discount_type: couponType,
                  discount_value: couponValue,
                  expires_at: couponExpire
                    ? new Date(couponExpire).toISOString()
                    : null,
                });
                if (couponNameRef.current) couponNameRef.current.value = "";
                if (couponDescRef.current) couponDescRef.current.value = "";
                setCouponValue(10);
                setCouponExpire("");
                alert(`쿠폰 생성 완료: ${id ?? "(ID 없음)"}`);
              } catch (e: any) {
                console.error(e);
                alert(`쿠폰 생성 실패: ${e?.message ?? "알 수 없는 오류"}`);
              } finally {
                setBusyCoupon(false);
              }
            }}
          >
            쿠폰 생성
          </Button>
        </div>
      </Card>

      {/* 미션 생성 */}
      <Card className="mb-4">
        <div className="mb-2 font-medium">미션 생성</div>
        <div className="grid gap-2 md:grid-cols-6">
          <Input placeholder="제목" ref={missionTitleRef} className="md:col-span-2" />
          <Input
            placeholder="설명(선택)"
            ref={missionDescRef}
            className="md:col-span-2"
          />
          <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          <Input
            type="number"
            placeholder="포인트"
            value={points}
            onChange={(e) => setPoints(Number(e.target.value) || 0)}
          />
          <Input
            placeholder="쿠폰 ID(선택)"
            value={couponId}
            onChange={(e) => setCouponId(e.target.value)}
            className="md:col-span-2"
          />
          <Button
            busy={busyMission}
            onClick={async () => {
              const title = (missionTitleRef.current?.value ?? "").trim();
              const description = (missionDescRef.current?.value ?? "").trim();

              if (!title) {
                alert("제목을 입력해 주세요.");
                return;
              }
              if (start && end) {
                const s = new Date(start);
                const e = new Date(end);
                if (s > e) {
                  alert("시작일이 종료일보다 늦을 수 없습니다.");
                  return;
                }
              }
              if (points < 0) {
                alert("포인트는 0 이상이어야 합니다.");
                return;
              }

              setBusyMission(true);
              try {
                /* ✅ 현재 로그인된 사용자 ID 가져오기 */
                // 1) 로그인 세션으로 사용자 확인 (getSession이 더 안정적)
                const { data: { session } } = await supabase.auth.getSession();
                const uid = session?.user?.id;
                if (!uid) {
                  alert("로그인이 필요합니다.");
                  return;
                }

                // 2) payload에서 user_id는 빼고 보냄 (DB 기본값이 auth.uid()로 채움)
                const payload: any = {
                  title,
                  description: description || undefined,
                  starts_at: start ? new Date(start).toISOString() : null,
                  ends_at: end ? new Date(end).toISOString() : null,
                  reward_points: points,
                  coupon_id: couponId || null,
                  status: 'active',
                };

                const id = await rpcCreateMission(payload); // ← user_id 보내지 않음

                if (missionTitleRef.current) missionTitleRef.current.value = "";
                if (missionDescRef.current) missionDescRef.current.value = "";
                setStart("");
                setEnd("");
                setPoints(0);
                setCouponId("");
                await onChanged();
                alert(`미션 생성 완료: ${id ?? "(ID 없음)"}`);
              } catch (e: any) {
                console.error(e);
                alert(`미션 생성 실패: ${e?.message ?? "알 수 없는 오류"}`);
              } finally {
                setBusyMission(false);
              }
            }}
            className="md:col-span-1"
          >
            미션 생성
          </Button>
        </div>
      </Card>

      {/* 미션 목록(활성/비활성) */}
      <Card>
        <div className="mb-2 font-medium">미션 목록</div>
        <div className="grid gap-2">
          {missions.length === 0 ? (
            <div className="text-sm text-slate-500">미션이 없습니다.</div>
          ) : (
            missions.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{m.title}</div>
                  <div className="text-xs text-slate-500">
                    보상: 포인트 {m.reward_points ?? 0}
                    {m.coupon_id ? " + 쿠폰" : ""} · 상태:{" "}
                    {m.is_active ? "활성" : "비활성"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={async () => {
                      try {
                        await rpcUpdateMission(m.id, { status: m.is_active ? 'inactive' : 'active' });
                        await onChanged();
                      } catch (e: any) {
                        console.error(e);
                        alert(
                          `상태 변경 실패: ${e?.message ?? "알 수 없는 오류"}`
                        );
                      }
                    }}
                  >
                    {m.is_active ? "비활성화" : "활성화"}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </Card>
  );
}
