// AUTHORED per-band EGP inventory (original phrasing). Task 3 overwrites/extends.
import { makeEgpId, type EgpEntry } from "./types";

export const entries: EgpEntry[] = [
  {
    id: makeEgpId("A1", "verbs", "be-present"),
    cefr: "A1",
    category: "verbs",
    can_do: { en: "Can use the present forms of 'be'.", ru: "Умеет использовать формы 'be' в настоящем времени." },
  },
];
