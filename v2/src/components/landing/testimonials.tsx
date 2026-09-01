import { TESTIMONIALS } from "@/components/landing/content";

export function Testimonials() {
  return (
    <section id="testimonials" className="scroll-mt-24 border-t border-border py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">
          From Production Teams
        </p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Attacks Dropped in Kernel, Proven in Compliance Audits
        </h2>
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <figure
              key={t.name}
              className="flex flex-col rounded-2xl bg-card p-6 shadow-[0_0_0_1px_rgb(255_255_255_/_0.08)] sm:p-7"
            >
              <blockquote className="flex-1 text-base leading-relaxed text-foreground">
                {t.quote}
              </blockquote>
              <figcaption className="mt-6 border-t border-border pt-4">
                <p className="text-sm font-medium">{t.name}</p>
                <p className="text-sm text-muted-foreground">
                  {t.role}, {t.org}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
