import { useBackButton } from "./useBackButton";
import { useSwipeNav } from "./useSwipeNav";

export function NavGestures() {
  useSwipeNav();
  useBackButton();
  return null;
}
