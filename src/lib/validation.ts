import type { Attempt, Difficulty, Quiz, Question } from "@/lib/types";
const isString = (x: unknown): x is string => typeof x === "string";
export const validOwner = (x: unknown): x is string => isString(x) && /^[a-zA-Z0-9_-]{12,100}$/.test(x);
export function validQuiz(x: unknown): x is Quiz {
  if (!x || typeof x !== "object") return false;
  const q = x as Partial<Quiz>;
  return isString(q.id) && q.id.length <= 100 && isString(q.title) && q.title.length <= 250 &&
    isString(q.topic) && q.topic.length <= 500 && ["easy","medium","hard"].includes(q.difficulty as Difficulty) &&
    Array.isArray(q.questions) && q.questions.length >= 1 && q.questions.length <= 50 &&
    q.questions.every((item: Question) => isString(item.id) && isString(item.question) && item.question.length <= 2500 &&
      Array.isArray(item.options) && item.options.length >= 2 && item.options.length <= 6 &&
      item.options.every(o => isString(o) && o.length <= 1500) && Number.isInteger(item.correctIndex) &&
      item.correctIndex >= 0 && item.correctIndex < item.options.length && isString(item.explanation) && item.explanation.length <= 5000) &&
    isString(q.createdAt) && !Number.isNaN(Date.parse(q.createdAt));
}
export function validAttempt(x: unknown): x is Attempt {
  if (!x || typeof x !== "object") return false;
  const a = x as Partial<Attempt>;
  return isString(a.id) && a.id.length <= 100 && isString(a.quizId) && a.quizId.length <= 100 &&
    isString(a.title) && a.title.length <= 250 && Number.isInteger(a.score) && Number.isInteger(a.total) &&
    (a.total ?? 0) >= 1 && (a.total ?? 0) <= 50 && (a.score ?? -1) >= 0 && (a.score ?? 999) <= (a.total ?? 0) &&
    isString(a.finishedAt) && !Number.isNaN(Date.parse(a.finishedAt));
}
