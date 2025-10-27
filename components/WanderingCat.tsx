import React, { useState, useEffect, useRef } from 'react';

interface ThoughtBubble {
  top: number;
  left: number;
  visible: boolean;
}

export const WanderingCat: React.FC = () => {
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const [isPaused, setIsPaused] = useState(false);
  const [thoughtBubble, setThoughtBubble] = useState<ThoughtBubble>({ top: 0, left: 0, visible: false });
  const catRef = useRef<HTMLImageElement>(null);
  const interactionTimeoutRef = useRef<number | null>(null);
  const pauseTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const catElement = catRef.current;
    if (!catElement) return;

    // We need to determine the initial direction based on the animation delay.
    // A -15s delay on a 30s animation effectively starts it halfway through.
    // The animation goes from left to right, so at 15s, it's moving right.
    setDirection('right');


    const handleAnimationIteration = () => {
      // The direction flips at each end of the alternate animation
      setDirection(prev => (prev === 'left' ? 'right' : 'left'));
    };

    catElement.addEventListener('animationiteration', handleAnimationIteration);
    
    // Function to schedule the next pause
    const schedulePause = () => {
        if (pauseTimeoutRef.current) window.clearTimeout(pauseTimeoutRef.current);
        const randomDelay = Math.random() * 10000 + 8000; // Pause every 8-18 seconds
        
        pauseTimeoutRef.current = window.setTimeout(() => {
            setIsPaused(true);
        }, randomDelay);
    };

    schedulePause();

    return () => {
      catElement.removeEventListener('animationiteration', handleAnimationIteration);
      if (interactionTimeoutRef.current) window.clearTimeout(interactionTimeoutRef.current);
      if (pauseTimeoutRef.current) window.clearTimeout(pauseTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (isPaused) {
      const productCards = document.querySelectorAll('[data-product-card="true"]');
      const visibleCards: Element[] = [];

      productCards.forEach(card => {
        const rect = card.getBoundingClientRect();
        if (rect.top >= 0 && rect.bottom <= window.innerHeight) {
          visibleCards.push(card);
        }
      });

      if (visibleCards.length > 0) {
        const randomCard = visibleCards[Math.floor(Math.random() * visibleCards.length)];
        const cardRect = randomCard.getBoundingClientRect();
        
        setThoughtBubble({
          left: cardRect.left + cardRect.width / 2,
          top: cardRect.top,
          visible: true
        });
      }

      // Unpause after a few seconds
      interactionTimeoutRef.current = window.setTimeout(() => {
        setIsPaused(false);
        setThoughtBubble(prev => ({ ...prev, visible: false }));
        
        // Reschedule the next pause
        const randomDelay = Math.random() * 10000 + 8000;
         pauseTimeoutRef.current = window.setTimeout(() => {
            setIsPaused(true);
        }, randomDelay);

      }, 4000); // Interaction lasts 4 seconds
    }
  }, [isPaused]);

  return (
    <>
      <style>{`
        .thought-bubble {
            position: fixed;
            background: white;
            border: 2px solid #ccc;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
            transform: translate(-50%, -120%);
            transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out;
            opacity: 0;
            pointer-events: none;
            z-index: 1000;
        }
        .thought-bubble.visible {
            opacity: 1;
            transform: translate(-50%, -130%);
        }
        .thought-bubble::after {
            content: '';
            position: absolute;
            bottom: -12px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 10px solid transparent;
            border-right: 10px solid transparent;
            border-top: 15px solid white;
            filter: drop-shadow(0 1px 0.5px #ccc);
        }
      `}</style>
      <img
          ref={catRef}
          src="https://i.gifer.com/Xqg8.gif"
          alt="Wandering dog"
          style={{
            position: 'fixed',
            bottom: '10px',
            height: '50px',
            zIndex: 9999,
            pointerEvents: 'none',
            transform: direction === 'right' ? 'scaleX(1)' : 'scaleX(-1)',
            // Start the animation halfway through using a negative delay.
            // The animation itself controls the `left` property.
            animation: 'walk-horizontal 30s linear -15s infinite alternate',
            animationPlayState: isPaused ? 'paused' : 'running',
          }}
        />
      <div className={`thought-bubble ${thoughtBubble.visible ? 'visible' : ''}`} style={{ top: thoughtBubble.top, left: thoughtBubble.left }}>
        <span role="img" aria-label="heart" style={{ fontSize: '24px' }}>❤️</span>
      </div>
    </>
  );
};
