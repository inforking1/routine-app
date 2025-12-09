import Calendar from "korean-lunar-calendar";

const calendar = new Calendar();

/**
 * 음력(YYYY-MM-DD)을 입력받아, targetYear(양력 기준 년도)에 해당하는 양력 날짜(YYYY-MM-DD)를 반환.
 * 만약 targetYear의 음력이 존재하지 않으면(윤달 이슈 등) 근사치 or null 반환 가능하지만,
 * 라이브러리는 윤달 처리를 지원함.
 * 
 * 여기서는 "매년 반복"되는 음력 기념일이 "올해(targetYear)"의 양력 며칠인지 계산.
 */
export function getSolarDateFromLunar(lunarDateStr: string, targetYear: number): string {
    const [_, m, d] = lunarDateStr.split("-").map(Number);

    // 음력 m월 d일이 targetYear의 양력으로 언제인지 찾기 어렵다(음력 연도를 모르므로).
    // 정확히는 "targetYear에 있는 음력 m월 d일"을 찾는 것이 아니라,
    // "음력 targetYear년 m월 d일" -> 양력 변환? NO.
    // "음력 m월 d일"을 양력으로 변환하려면 "어떤 음력 연도의 m월 d일"인지가 중요하다.

    // 기념일의 경우: "양력 2025년"에 해당하는 "음력 10월 23일"이 언제인가?
    // -> 음력 2025년 10월 23일 (보통 양력 11~12월)
    // -> 음력 2024년 10월 23일 (만약 양력 2025년 초반에 걸친다면?)

    // 보통 "올해의 음력 생일"이라 함은, "음력 연도가 올해(targetYear)인 날"을 의미함.
    // 예: 2025년에는 "음력 2025년 10월 23일"을 지냄.

    // 따라서 (targetYear, m, d)를 setLunar 하고 getSolar 하면 됨.
    // 윤달(Intercalation) 여부는? 보통 평달(false) 기준으로 기념일 저장.
    // (윤달 생일인 사람은 드물지만, 만약 윤달 저장 기능이 없다면 평달로 가정)

    calendar.setLunarDate(targetYear, m, d, false);

    const solar = calendar.getSolarCalendar();
    const sy = solar.year;
    const sm = String(solar.month).padStart(2, "0");
    const sd = String(solar.day).padStart(2, "0");

    return `${sy}-${sm}-${sd}`;
}
