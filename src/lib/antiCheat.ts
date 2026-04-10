const STORAGE_KEY = "er5_matrix_progress";
const CHEAT_KEY = "er5_matrix_cheated";

export function getProgress(): number {
  return parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
}

export function setProgress(stage: number) {
  const current = getProgress();
  if (stage > current) {
    localStorage.setItem(STORAGE_KEY, stage.toString());
  }
}

export function checkAndFlagCheat(): boolean {
  const progress = getProgress();
  if (progress > 0 && progress < 4) {
    localStorage.setItem(CHEAT_KEY, "true");
    return true;
  }
  return false;
}

export function isCheated(): boolean {
  return localStorage.getItem(CHEAT_KEY) === "true";
}

export function getPassword(): string {
  return isCheated() ? "_AnotherOne304" : "AnotherOne304";
}

export function resetProgress() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(CHEAT_KEY);
}
