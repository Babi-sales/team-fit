import { useApp } from "@/context/AppContext";

export function useTargetUserId(): string | null {
  const { currentUser, viewedUserId } = useApp();
  return viewedUserId ?? currentUser?.id ?? null;
}
