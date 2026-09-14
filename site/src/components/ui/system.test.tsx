import { render } from "preact";
import { afterEach, describe, expect, it } from "vitest";
import { Icon } from "./icon";
import { Field } from "./field";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./select";
import { Checkbox } from "./checkbox";
import { Switch } from "./switch";
import { Slider } from "./slider";
import { Dialog, DialogTrigger, DialogContent, DialogTitle } from "./dialog";
import { Popover, PopoverTrigger, PopoverContent } from "./popover";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "./tooltip";

let host: HTMLDivElement;

function mount(node: preact.JSX.Element) {
  host = document.createElement("div");
  document.body.appendChild(host);
  render(node, host);
  return host;
}

afterEach(() => {
  render(null, host);
  host.remove();
});

describe("ui system step 1", () => {
  it("Icon renders a lucide-style svg slot", () => {
    const h = mount(<Icon name="search" />);
    const svg = h.querySelector('svg[data-slot="icon"][data-icon="search"]');
    expect(svg).not.toBeNull();
  });

  it("Label + Field wire label, error and alert role", () => {
    const h = mount(
      <Field label="Name" htmlFor="f-name" error="Required">
        <Input id="f-name" aria-describedby="f-name-error" />
      </Field>,
    );
    expect(h.querySelector("label")?.getAttribute("for")).toBe("f-name");
    expect(h.querySelector("label")?.id).toBe("f-name-label");
    expect(h.querySelector("#f-name")?.getAttribute("aria-describedby")).toBe("f-name-error");
    expect(h.querySelector('[role="alert"]')?.textContent).toContain("Required");
    expect(h.querySelector('[data-slot="field"]')?.getAttribute("data-invalid")).toBe("true");
  });

  it("Input renders icon chrome, clearable, password toggle and states", () => {
    const h = mount(
      <div>
        <Input id="a" leadingIcon="search" trailingIcon="calendar" value="q" onInput={() => {}} />
        <Input id="b" type="password" passwordToggle value="secret" onInput={() => {}} />
        <Input id="c" clearable value="abc" onInput={() => {}} />
        <Input id="d" state="error" value="x" onInput={() => {}} />
        <Input id="e" state="success" value="y" onInput={() => {}} />
      </div>,
    );
    expect(h.querySelectorAll('[data-slot="input-wrap"]').length).toBe(5);
    expect(h.querySelector('[data-icon="search"]')).not.toBeNull();
    expect((h.querySelector('[aria-label="Show password"]') as HTMLButtonElement | null)?.tabIndex).toBe(0);
    expect((h.querySelector('[aria-label="Clear input"]') as HTMLButtonElement | null)?.tabIndex).toBe(0);
    expect(h.querySelector("#d")?.getAttribute("data-state")).toBe("error");
    expect(h.querySelector("#e")?.getAttribute("data-state")).toBe("success");
  });

  it("Textarea renders counter when requested", () => {
    const h = mount(<Textarea value="hello" maxLength={10} showCount onInput={() => {}} />);
    expect(h.textContent).toContain("5/10");
  });

  it("Radix wrappers mount closed without crashing", () => {
    const h = mount(
      <div>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Pick" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="a">A</SelectItem>
          </SelectContent>
        </Select>
        <Checkbox aria-label="agree" />
        <Switch aria-label="motion" />
        <Field label="Level" htmlFor="level-slider">
          <Slider id="level-slider" defaultValue={[50]} />
        </Field>
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>T</DialogTitle>
          </DialogContent>
        </Dialog>
        <Popover>
          <PopoverTrigger>Info</PopoverTrigger>
          <PopoverContent>Body</PopoverContent>
        </Popover>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>Hover</TooltipTrigger>
            <TooltipContent>Tip</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>,
    );
    expect(h.querySelector('[data-slot="select-trigger"]')).not.toBeNull();
    expect(h.querySelector('[data-slot="checkbox"]')).not.toBeNull();
    expect(h.querySelector('[data-slot="switch"]')).not.toBeNull();
    expect(h.querySelector('[data-slot="slider"]')).not.toBeNull();
    expect(h.querySelector('[data-slot="slider-thumb"]')?.getAttribute("aria-labelledby")).toBe("level-slider-label");
    expect(h.textContent).toContain("Open");
  });
});
