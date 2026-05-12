import { expect, test, describe } from "vitest";
import { t, swapLocale, isLocale } from "./index";

describe("i18n", () => {
  test("isLocale recognises en and ru", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("ru")).toBe(true);
    expect(isLocale("de")).toBe(false);
  });

  test("t falls back to en when key missing in ru", () => {
    expect(t("nav.home", "ru")).toBeTypeOf("string");
    expect(t("__missing__", "en")).toBe("__missing__");
  });

  test("swapLocale swaps prefix only", () => {
    expect(swapLocale("/en/networking/tcp-handshake/", "ru"))
      .toBe("/ru/networking/tcp-handshake/");
    expect(swapLocale("/ru/", "en")).toBe("/en/");
  });
});
