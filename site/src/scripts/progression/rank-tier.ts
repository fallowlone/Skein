import type { Tier } from "~/types";
import { rankById } from "./ranks";

export function rankToTier(rankId: string): Tier {
  return rankById(rankId).contentTier;
}
