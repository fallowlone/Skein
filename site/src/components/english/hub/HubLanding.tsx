// The English Hub landing — the ONE client:visible hydration boundary. It composes the focused
// section components (plain Preact, not their own islands) in mockup order inside <div class="wrap
// hub">. Each section subscribes to the signals it needs (englishState / register / userState) in
// its own render body. Heavy drills live on the /english/{review,reading,grammar,writing} sub-routes.
import type { Locale } from "~/i18n";
import HubBar from "./HubBar";
import DailyCycle from "./DailyCycle";
import CoverageMeter from "./CoverageMeter";
import HoursPanel from "./HoursPanel";
import NextPath from "./NextPath";
import ByoPipe from "./ByoPipe";
import OwnedModules from "./OwnedModules";
import MonologueCheckpoint from "./MonologueCheckpoint";
import Launchpads from "./Launchpads";
import CuratedLibrary from "./CuratedLibrary";
import HonestStrip from "./HonestStrip";

export default function HubLanding({ lang }: { lang: Locale }) {
  return (
    <div class="wrap hub">
      <HubBar lang={lang} />
      <DailyCycle lang={lang} />
      <CoverageMeter lang={lang} />
      <HoursPanel lang={lang} />
      <NextPath lang={lang} />
      <ByoPipe lang={lang} />
      <OwnedModules lang={lang} />
      <MonologueCheckpoint lang={lang} />
      <Launchpads lang={lang} />
      <CuratedLibrary lang={lang} />
      <HonestStrip lang={lang} />
    </div>
  );
}
