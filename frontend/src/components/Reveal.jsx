import { useEffect, useRef, useState } from "react";

// Fades its content in the first time it scrolls into view
export default function Reveal({ as: Tag = "div", className = "", delay = 0, children }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setShown(true), { threshold: 0.15 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref} className={`reveal ${shown ? "in" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </Tag>
  );
}
