// حفظ وقراءة من ذاكرة الموبايل (localStorage).
// try/catch عشان بعض المتصفحات (زي الـ private mode) بتمنع التخزين، والأبليكشن يفضل شغال عادي.

const PREFIX = 'kora:';

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {}
}

export function load(key) {
  try {
    return JSON.parse(localStorage.getItem(PREFIX + key));
  } catch {
    return null;
  }
}
