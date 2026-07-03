import ExperienceLoader from "@/components/ExperienceLoader";
import Directory from "@/components/ui/Directory";

export default function Home() {
  return (
    <main>
      {/* the console: globe (left screen) + info panel (right screen) */}
      <section id="world" className="relative w-full overflow-hidden md:h-dvh">
        <ExperienceLoader />
        <a
          href="#directory"
          className="absolute bottom-3 left-1/2 z-50 -translate-x-1/2 animate-bounce font-mono text-[10px] uppercase tracking-[0.2em] text-ink-dim transition-colors hover:text-gold"
        >
          ▼ ecosystem directory
        </a>
      </section>

      {/* the directory: every project, sortable */}
      <Directory />
    </main>
  );
}
