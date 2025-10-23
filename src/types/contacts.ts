export type Contact = {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  tags: string[] | null;
  importance: number | null;
  birthday: string | null;     // 'YYYY-MM-DD'
  anniversary: string | null;  // 'YYYY-MM-DD'
  last_contacted_at: string | null;
  created_at: string;
  relation?: string;
};

export type Ping = {
  id: string;
  user_id: string;
  contact_id: string;
  method: 'call'|'sms'|'kakao'|'share'|'etc'|null;
  note: string | null;
  created_at: string;
};
