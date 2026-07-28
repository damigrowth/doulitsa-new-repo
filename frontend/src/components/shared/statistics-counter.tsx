'use client';

import React from 'react';

type CounterData = {
  end: number;
  label: string;
  text: string;
};

type Props = {
  data: CounterData[];
};

function useCountUp(target: number, start: boolean, duration = 1600) {
  const [value, setValue] = React.useState(0);

  React.useEffect(() => {
    if (!start) return;

    let frame: number;
    const startTime = performance.now();
    // ease-out cubic for a satisfying deceleration
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      setValue(Math.round(ease(progress) * target));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, start, duration]);

  return value;
}

function StatItem({ stat, start }: { stat: CounterData; start: boolean }) {
  const value = useCountUp(stat.end, start);

  return (
    <div className='group relative px-4 py-2 text-center'>
      <div className='flex justify-center items-baseline mb-2'>
        <span className='bg-gradient-to-br from-primary to-secondary bg-clip-text text-transparent font-bold text-4xl md:text-5xl leading-none tabular-nums tracking-tight'>
          {value.toLocaleString('el-GR')}
        </span>
        <span className='bg-gradient-to-br from-primary to-secondary bg-clip-text text-transparent font-bold text-2xl md:text-3xl ml-0.5'>
          {stat.text}
        </span>
      </div>
      <p className='text-body text-sm md:text-base font-medium'>{stat.label}</p>
    </div>
  );
}

export default function StatisticsCounter({ data }: Props) {
  const [inView, setInView] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section className='py-16'>
      <div className='container mx-auto px-4'>
        <div
          ref={ref}
          className='relative max-w-5xl mx-auto rounded-3xl border border-border bg-white/80 backdrop-blur p-8 md:p-12 shadow-[0_24px_70px_-45px_hsl(var(--primary)/0.55)] overflow-hidden'
        >
          {/* Brand glow accents */}
          <div
            aria-hidden
            className='pointer-events-none absolute -top-16 -left-10 h-48 w-48 rounded-full bg-secondary/10 blur-3xl'
          />
          <div
            aria-hidden
            className='pointer-events-none absolute -bottom-16 -right-10 h-48 w-48 rounded-full bg-fourth/10 blur-3xl'
          />

          <div className='relative grid grid-cols-2 md:grid-cols-4 gap-y-8 divide-y divide-border md:divide-y-0 md:divide-x'>
            {data.map((stat, index) => (
              <StatItem key={index} stat={stat} start={inView} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
