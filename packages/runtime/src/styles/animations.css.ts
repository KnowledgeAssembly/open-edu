export const animationsCss = `
@keyframes oas-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes oas-slide-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes oas-highlight {
  0%,
  100% {
    background-color: transparent;
  }
  50% {
    background-color: var(--oe-color-warning, #fef3c7);
  }
}

@keyframes oas-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

@keyframes oas-glow {
  0%,
  100% {
    box-shadow: 0 0 0 0 var(--oe-color-primary);
  }
  50% {
    box-shadow: 0 0 8px 2px var(--oe-color-primary);
  }
}

@keyframes oas-badge {
  0% {
    opacity: 0;
    transform: scale(0.4) rotate(-8deg);
  }
  60% {
    opacity: 1;
    transform: scale(1.1) rotate(2deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(0);
  }
}

@keyframes oas-confetti {
  0%,
  100% {
    opacity: 1;
    transform: translateY(0) rotate(0deg);
  }
  25% {
    opacity: 0.85;
    transform: translateY(-6px) rotate(45deg);
  }
  75% {
    opacity: 0.95;
    transform: translateY(-2px) rotate(-45deg);
  }
}

@keyframes oas-sparkle {
  0%,
  100% {
    opacity: 0.4;
    transform: scale(0.9);
  }
  50% {
    opacity: 1;
    transform: scale(1.15);
  }
}

@keyframes oas-celebrate {
  0%,
  100% {
    transform: scale(1) rotate(0deg);
  }
  25% {
    transform: scale(1.08) rotate(-2deg);
  }
  75% {
    transform: scale(1.08) rotate(2deg);
  }
}

/* Utility classes for CSS animation backend */
.oas-animate-fade {
  animation: oas-fade-in var(--oe-motion-duration-normal, 200ms) ease-out both;
}

.oas-animate-slide {
  animation: oas-slide-in var(--oe-motion-duration-normal, 200ms) ease-out both;
}

.oas-animate-highlight {
  animation: oas-highlight var(--oe-motion-duration-slow, 300ms) ease-in-out both;
}

.oas-animate-pulse {
  animation: oas-pulse var(--oe-motion-duration-fast, 100ms) ease-in-out both;
}

.oas-animate-glow {
  animation: oas-glow var(--oe-motion-duration-slow, 300ms) ease-in-out both;
}

.oas-animate-badge {
  animation: oas-badge var(--oe-motion-duration-slow, 300ms) ease-out both;
}

.oas-animate-confetti {
  animation: oas-confetti 600ms ease-in-out 3;
}

.oas-animate-sparkle {
  animation: oas-sparkle var(--oe-motion-duration-normal, 200ms) ease-in-out 3;
}

.oas-animate-celebrate {
  animation: oas-celebrate var(--oe-motion-duration-slow, 300ms) ease-in-out 2;
}

/* Reduced motion: instant reveal */
@media (prefers-reduced-motion: reduce) {
  .oas-animate-fade,
  .oas-animate-slide,
  .oas-animate-highlight,
  .oas-animate-pulse,
  .oas-animate-glow,
  .oas-animate-badge,
  .oas-animate-confetti,
  .oas-animate-sparkle,
  .oas-animate-celebrate {
    animation: none;
    opacity: 1;
    transform: none;
    background-color: transparent;
    box-shadow: none;
  }
}
`;
