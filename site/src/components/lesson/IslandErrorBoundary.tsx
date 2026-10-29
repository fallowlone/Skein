import { Component, type ComponentChildren } from "preact";
import type { Locale } from "~/i18n";

const COPY = {
  en: {
    title: "This block failed to load.",
    body: "The rest of the lesson still works — try reloading it.",
    retry: "Retry",
  },
  ru: {
    title: "Блок не загрузился.",
    body: "Остальная часть урока работает — попробуйте загрузить его заново.",
    retry: "Повторить",
  },
} as const;

interface Props {
  lang: Locale;
  children: ComponentChildren;
}
interface State {
  failed: boolean;
}

/**
 * Per-island crash containment for lesson pages. Each `client:*` island is
 * its own Preact root, so a boundary must live INSIDE the island's tree (not
 * around it in Astro markup) to catch the failure. Wrap the island's content
 * with this; a crash then degrades to this fallback instead of silently
 * unmounting the block.
 */
export default class IslandErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  componentDidCatch() {
    this.setState({ failed: true });
  }

  render(props: Props, state: State) {
    if (state.failed) {
      const copy = COPY[props.lang] ?? COPY.en;
      return (
        <div role="alert" data-island-fallback class="island-fallback">
          <p>
            <strong>{copy.title}</strong> {copy.body}
          </p>
          <button type="button" onClick={() => this.setState({ failed: false })}>
            {copy.retry}
          </button>
        </div>
      );
    }
    return props.children;
  }
}
