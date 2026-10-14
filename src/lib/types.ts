export type Difficulty = "easy" | "medium" | "hard";
export type Question = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};
export type Quiz = {
  id: string;
  title: string;
  topic: string;
  difficulty: Difficulty;
  questions: Question[];
  createdAt: string;
  demo?: boolean;
};
export type Attempt = {
  id: string;
  quizId: string;
  title: string;
  score: number;
  total: number;
  finishedAt: string;
};
