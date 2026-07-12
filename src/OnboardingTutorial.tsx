import { ArrowLeft, ArrowRight, Check, Eye, FileText, Keyboard, Link2, Paintbrush, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

interface OnboardingTutorialProps {
  onComplete(): void;
}

interface TutorialStep {
  eyebrow: string;
  title: string;
  description: string;
  icon: ReactNode;
  points: string[];
}

const steps: TutorialStep[] = [
  {
    eyebrow: "Welcome",
    title: "Write without getting in your way",
    description: "Draftwell is a local-first Markdown and HTML editor built around a fast source editor and a clean live preview.",
    icon: <FileText size={28} />,
    points: ["Open files from anywhere on your computer", "Drop several files into the window to open tabs", "Create a new file and choose its location when saving"]
  },
  {
    eyebrow: "Views",
    title: "Choose the workspace you need",
    description: "Switch between focused writing, side-by-side editing, and a distraction-free rendered preview.",
    icon: <Eye size={28} />,
    points: ["Write shows only the source editor", "Split keeps source and preview together", "Preview gives the rendered document the full window"]
  },
  {
    eyebrow: "Split mode",
    title: "Keep both panes in step",
    description: "Use Sync when you want the editor and preview to travel together, or Free when you want to inspect each pane independently.",
    icon: <Link2 size={28} />,
    points: ["Sync follows whichever pane you are actively scrolling", "Free preserves a separate position for each pane", "The toolbar inserts common Markdown and HTML structures"]
  },
  {
    eyebrow: "Make it yours",
    title: "Customize the writing environment",
    description: "The paintbrush opens live controls for color, typography, spacing, reading width, and toolbar layout.",
    icon: <Paintbrush size={28} />,
    points: ["Changes preview immediately and persist across restarts", "Reset returns every visual control to its default", "Advanced users can extend everything with custom CSS and JavaScript"]
  },
  {
    eyebrow: "Ready",
    title: "A few shortcuts, then start writing",
    description: "The essentials are always close at hand. You can replay this tutorial later from the question-mark button.",
    icon: <Keyboard size={28} />,
    points: ["Ctrl/Cmd + N — new file", "Ctrl/Cmd + O — open files", "Ctrl/Cmd + S — save", "Ctrl/Cmd + 1 / 2 / 3 — Write, Split, Preview"]
  }
];

export default function OnboardingTutorial({ onComplete }: OnboardingTutorialProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onComplete();
      if (event.key === "ArrowLeft" && stepIndex > 0) setStepIndex((current) => current - 1);
      if (event.key === "ArrowRight" && !isLast) setStepIndex((current) => current + 1);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLast, onComplete, stepIndex]);

  return (
    <div className="onboarding-overlay">
      <section className="onboarding-dialog" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <header className="onboarding-header">
          <div className="onboarding-brand"><span>D</span> Draftwell</div>
          <button className="icon-button" onClick={onComplete} aria-label="Skip tutorial" title="Skip tutorial"><X size={17} /></button>
        </header>

        <div className="onboarding-content">
          <div className="onboarding-visual">
            <div className="onboarding-icon">{step.icon}</div>
            <div className="onboarding-preview-lines"><i /><i /><i /><i /></div>
          </div>
          <div className="onboarding-copy">
            <span className="onboarding-eyebrow">{step.eyebrow}</span>
            <h2 id="onboarding-title">{step.title}</h2>
            <p>{step.description}</p>
            <ul>{step.points.map((point) => <li key={point}><Check size={13} /> <span>{point}</span></li>)}</ul>
          </div>
        </div>

        <footer className="onboarding-footer">
          <div className="onboarding-progress" aria-label={`Step ${stepIndex + 1} of ${steps.length}`}>
            {steps.map((tutorialStep, index) => <button key={tutorialStep.title} className={index === stepIndex ? "active" : ""} onClick={() => setStepIndex(index)} aria-label={`Go to step ${index + 1}`} />)}
          </div>
          <span className="onboarding-footer-spacer" />
          {stepIndex > 0 && <button className="secondary-button compact" onClick={() => setStepIndex((current) => current - 1)}><ArrowLeft size={14} /> Back</button>}
          <button className="primary-button compact" onClick={() => isLast ? onComplete() : setStepIndex((current) => current + 1)}>
            {isLast ? <><Check size={14} /> Start writing</> : <>Next <ArrowRight size={14} /></>}
          </button>
        </footer>
      </section>
    </div>
  );
}
