import { FolderOpen, Paintbrush, RotateCcw, X } from "lucide-react";
import { useEffect } from "react";
import {
  DEFAULT_CUSTOMIZATION_PREFERENCES,
  type CustomizationPreferences,
  type PreviewFont,
  type ToolbarPreset
} from "./lib/preferences";

interface CustomizationPanelProps {
  preferences: CustomizationPreferences;
  onChange(preferences: CustomizationPreferences): void;
  onClose(): void;
  onOpenAdvanced(): void;
}

interface RangeSettingProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange(value: number): void;
}

function RangeSetting({ label, value, min, max, step = 1, unit, onChange }: RangeSettingProps) {
  return (
    <label className="customization-range">
      <span><strong>{label}</strong><output>{value}{unit}</output></span>
      <input type="range" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

const previewFonts: Array<{ value: PreviewFont; label: string; sample: string }> = [
  { value: "serif", label: "Serif", sample: "Editorial" },
  { value: "sans", label: "Sans", sample: "Modern" },
  { value: "mono", label: "Mono", sample: "Technical" }
];

const toolbarPresets: Array<{ value: ToolbarPreset; label: string; description: string }> = [
  { value: "default", label: "Default", description: "Headings first, then formatting and structure." },
  { value: "writing", label: "Writing", description: "Emphasis, links and lists before advanced tools." },
  { value: "technical", label: "Technical", description: "Code and equations at the front." }
];

export default function CustomizationPanel({ preferences, onChange, onClose, onOpenAdvanced }: CustomizationPanelProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const patch = (next: Partial<CustomizationPreferences>) => onChange({ ...preferences, ...next });

  return (
    <div className="customization-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="customization-panel" role="dialog" aria-modal="true" aria-labelledby="customization-title">
        <header className="customization-panel-header">
          <div className="customization-title">
            <span className="customization-title-icon"><Paintbrush size={17} /></span>
            <div><h2 id="customization-title">Customize Draftwell</h2><p>Changes are previewed and saved automatically.</p></div>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close customization panel"><X size={17} /></button>
        </header>

        <div className="customization-panel-body">
          <fieldset className="customization-section">
            <legend>Color</legend>
            <label className="color-setting">
              <span><strong>Accent color</strong><small>Buttons, selection, links and active states</small></span>
              <span className="color-control"><input type="color" value={preferences.accentColor} onChange={(event) => patch({ accentColor: event.target.value })} /><code>{preferences.accentColor}</code></span>
            </label>
          </fieldset>

          <fieldset className="customization-section">
            <legend>Typography</legend>
            <RangeSetting label="Editor text" value={preferences.editorFontSize} min={12} max={24} unit="px" onChange={(editorFontSize) => patch({ editorFontSize })} />
            <RangeSetting label="Preview text" value={preferences.previewFontSize} min={13} max={28} unit="px" onChange={(previewFontSize) => patch({ previewFontSize })} />
            <RangeSetting label="Line spacing" value={preferences.lineHeight} min={1.2} max={2.2} step={0.05} unit="×" onChange={(lineHeight) => patch({ lineHeight })} />
            <div className="customization-choice-label"><strong>Preview typeface</strong></div>
            <div className="font-options">
              {previewFonts.map((font) => <label key={font.value} className={`font-option font-${font.value} ${preferences.previewFont === font.value ? "active" : ""}`}>
                <input type="radio" name="preview-font" checked={preferences.previewFont === font.value} onChange={() => patch({ previewFont: font.value })} />
                <span className="font-sample">Aa</span><span><strong>{font.label}</strong><small>{font.sample}</small></span>
              </label>)}
            </div>
          </fieldset>

          <fieldset className="customization-section">
            <legend>Reading width</legend>
            <RangeSetting label="Editor column" value={preferences.editorWidth} min={520} max={1200} step={20} unit="px" onChange={(editorWidth) => patch({ editorWidth })} />
            <RangeSetting label="Preview column" value={preferences.previewWidth} min={520} max={1200} step={20} unit="px" onChange={(previewWidth) => patch({ previewWidth })} />
          </fieldset>

          <fieldset className="customization-section">
            <legend>Formatting toolbar</legend>
            <div className="toolbar-preset-options">
              {toolbarPresets.map((preset) => <label key={preset.value} className={preferences.toolbarPreset === preset.value ? "active" : ""}>
                <input type="radio" name="toolbar-preset" checked={preferences.toolbarPreset === preset.value} onChange={() => patch({ toolbarPreset: preset.value })} />
                <span><strong>{preset.label}</strong><small>{preset.description}</small></span>
              </label>)}
            </div>
          </fieldset>
        </div>

        <footer className="customization-panel-footer">
          <button className="secondary-button compact" onClick={() => onChange({ ...DEFAULT_CUSTOMIZATION_PREFERENCES })}><RotateCcw size={14} /> Reset</button>
          <span className="customization-footer-spacer" />
          <button className="secondary-button compact" onClick={onOpenAdvanced}><FolderOpen size={14} /> Advanced CSS &amp; JS</button>
          <button className="primary-button compact" onClick={onClose}>Done</button>
        </footer>
      </section>
    </div>
  );
}
