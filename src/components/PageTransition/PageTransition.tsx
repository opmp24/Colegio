import { useRef, useEffect } from "react";
import gsap from "gsap";

interface PageTransitionProps {
  children: React.ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.fromTo(
      ref.current,
      { x: "100%", autoAlpha: 0 },
      { x: 0, autoAlpha: 1, duration: 0.35, ease: "power3.out" }
    );
  }, []);

  return <div ref={ref}>{children}</div>;
}
