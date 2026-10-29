import type { Locale } from "~/i18n";
import AiTutorModes from "~/components/pedagogy/AiTutorModes";
import LessonQuestion from "./LessonQuestion";
import IslandErrorBoundary from "./IslandErrorBoundary";

type Props = {
  lang: Locale;
  lessonKey: string;
  concepts: string[];
};

function LessonSupportInner({ lang, lessonKey, concepts }: Props) {
  return (
    <>
      <AiTutorModes lang={lang} lessonKey={lessonKey} concepts={concepts} />
      <LessonQuestion lang={lang} lessonKey={lessonKey} />
    </>
  );
}

export default function LessonSupport(props: Props) {
  return (
    <IslandErrorBoundary lang={props.lang}>
      <LessonSupportInner {...props} />
    </IslandErrorBoundary>
  );
}
