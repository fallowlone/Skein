import type { Locale } from "~/i18n";
import AiTutorModes from "~/components/pedagogy/AiTutorModes";
import LessonQuestion from "./LessonQuestion";

export default function LessonSupport({
  lang,
  lessonKey,
  concepts,
}: {
  lang: Locale;
  lessonKey: string;
  concepts: string[];
}) {
  return (
    <>
      <AiTutorModes lang={lang} lessonKey={lessonKey} concepts={concepts} />
      <LessonQuestion lang={lang} lessonKey={lessonKey} />
    </>
  );
}
