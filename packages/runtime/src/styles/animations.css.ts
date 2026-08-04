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

/* Reduced motion: instant reveal */
@media (prefers-reduced-motion: reduce) {
  .oas-animate-fade,
  .oas-animate-slide,
  .oas-animate-highlight,
  .oas-animate-pulse,
  .oas-animate-glow {
    animation: none;
    opacity: 1;
    transform: none;
    background-color: transparent;
    box-shadow: none;
  }
}
`;
