import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export function useBackExit() {
    const navigate = useNavigate();
    const location = useLocation();
    const [showExitToast, setShowExitToast] = useState(false);

    // 1. 탭 루트 경로들 (여기에선 Back 누르면 Home으로 이동)
    //    깊은 경로(예: /todos/1)는 제외하기 위해 exact match로 검사 예정 or startsWith?
    //    요구사항: "Home이 아닌 탭 루트 경로들" (예: /goals, /todos)
    const tabRoots = [
        "/goals",
        "/todos",
        "/anniversaries",
        "/news",
        "/meditation",
        "/bucket",
        "/gratitude",
        "/mission",
        "/contacts",
        "/community",
        "/settings",
        "/pledges",
        "/guide",
        "/roles",
        "/auth" // 로그인 페이지도 Back->Home이 자연스러울 수 있음 (이미 로그인된 상태라면)
    ];

    useEffect(() => {
        const isHome = location.pathname === "/" || location.pathname === "/home";
        const isTabRoot = tabRoots.includes(location.pathname);

        // 2. 브라우저 history 스택 조작 (Trap)
        //    Tab Root나 Home에 진입하면 현재 상태(state)를 확인하여 trap이 없으면 pushState

        // 현재 페이지가 '뒤로가기 처리 대상'인지 확인
        if (isHome || isTabRoot) {
            // pushState로 '현재 페이지'를 스택에 하나 더 쌓아서, Back 버튼이 '이전 페이지'가 아닌 '현재 페이지(trap)'를 pop하게 만듦
            // 단, 무한 증식을 막기 위해 state 체크
            if (!window.history.state?.trap) {
                window.history.pushState({ trap: true }, "", window.location.href);
            }
        }

        const handlePopState = (event: PopStateEvent) => {
            // 3. Back 버튼이 눌렸을 때 (popstate 발생)
            //    이 시점엔 이미 URL이 변했을 수 있으니, 로직으로 제어

            if (isHome) {
                // [HOME Logic]
                // 2초 내 재입력 체크
                if (showExitToast) {
                    // 이미 토스트가 떴는데 또 Back -> 앱 종료 허용 (history.back)
                    // 기본 브라우저 동작을 막지 않으면 됨? 
                    // 아니, pushState를 안 하면 됨.
                    // 여기서 아무것도 안 하면 브라우저는 이미 한 단계 뒤로 갔음 (앱 종료 or 이전 사이트)
                } else {
                    // 첫 Back -> 토스트 띄우고 + 다시 Trap 설치 (못 나가게)
                    setShowExitToast(true);
                    // UI적으로 토스트 띄우기

                    // 사용자가 '뒤로'를 눌러서 state가 pop되었으므로, 다시 현재 페이지를 push해서 제자리 유지
                    window.history.pushState({ trap: true }, "", window.location.href);

                    // 2초 뒤 토스트 닫기 (state는 유지) -> useEffect cleanup이나 setTimeout으로 처리
                }
            } else if (isTabRoot) {
                // [Tab Root Logic]
                // Back -> Home으로 이동
                // popstate가 일어났으니 브라우저는 이미 history 한 칸 뒤로 갔음. 
                // 여기서 navigate('/', { replace: true })를 하면 홈으로 교체됨.
                navigate("/", { replace: true });
            } else {
                // Deep screen 등: 기본 동작 (아무것도 안 함)
            }
        };

        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, [location.pathname, showExitToast, navigate]); // showExitToast가 바뀌면 리스너 갱신 (closure capture 문제 해결)

    // 2초 뒤 토스트 자동 닫기는 hook 내부에서 처리
    useEffect(() => {
        if (!showExitToast) return;
        const timer = setTimeout(() => setShowExitToast(false), 2000);
        return () => clearTimeout(timer);
    }, [showExitToast]);

    return { showExitToast, closeToast: () => setShowExitToast(false) };
}
