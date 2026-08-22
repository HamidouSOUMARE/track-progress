"use client";

import { useEffect } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { formatValue } from "@/lib/format";

interface AnimatedNumberProps {
  value: number;
  className?: string;
}

/** Compteur qui « roule » jusqu'à la nouvelle valeur : le progrès doit se voir. */
export function AnimatedNumber({ value, className }: AnimatedNumberProps) {
  const reduceMotion = useReducedMotion();
  const motionValue = useMotionValue(value);
  const text = useTransform(motionValue, (latest) => formatValue(latest));

  useEffect(() => {
    if (reduceMotion) {
      motionValue.set(value);
      return;
    }

    const controls = animate(motionValue, value, {
      duration: 0.7,
      ease: [0.16, 1, 0.3, 1],
    });

    return () => controls.stop();
  }, [motionValue, reduceMotion, value]);

  return <motion.span className={className}>{text}</motion.span>;
}
