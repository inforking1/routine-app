export type Anniv = {
  id: string;
  user_id: string;
  title: string;
  date: string;      // YYYY-MM-DD
  note: string | null;
  pinned: boolean;
  created_at: string;
};
