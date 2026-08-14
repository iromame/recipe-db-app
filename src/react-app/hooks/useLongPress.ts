import { useCallback, useRef, useState } from 'react';

export function useLongPress(
    onLongPress: (e: any) => void,
    onClick: () => void,
    { shouldPreventDefault = true, delay = 500 } = {}
) {
    const [longPressTriggered, setLongPressTriggered] = useState(false);
    const timeout = useRef<any>(null);
    const target = useRef<any>(null);
    const isMoving = useRef<boolean>(false);
    const startPos = useRef<{ x: number; y: number } | null>(null);

    const start = useCallback(
        (event: any) => {
            isMoving.current = false;
            if (event.touches && event.touches.length > 0) {
                startPos.current = {
                    x: event.touches[0].clientX,
                    y: event.touches[0].clientY
                };
            } else {
                startPos.current = null;
            }

            if (shouldPreventDefault && event.target) {
                event.target.addEventListener('touchend', preventDefault, {
                    passive: false
                });
                target.current = event.target;
            }
            timeout.current = setTimeout(() => {
                onLongPress(event);
                setLongPressTriggered(true);
            }, delay);
        },
        [onLongPress, delay, shouldPreventDefault]
    );

    const clear = useCallback(
        (_event: any, shouldTriggerClick = true) => {
            timeout.current && clearTimeout(timeout.current);
            if (shouldTriggerClick && !longPressTriggered && !isMoving.current) {
                onClick();
            }
            setLongPressTriggered(false);
            if (shouldPreventDefault && target.current) {
                target.current.removeEventListener('touchend', preventDefault);
            }
        },
        [longPressTriggered, onClick, shouldPreventDefault]
    );

    return {
        onMouseDown: (e: any) => start(e),
        onTouchStart: (e: any) => start(e),
        onMouseUp: (e: any) => clear(e),
        onMouseLeave: (e: any) => {
            isMoving.current = true;
            clear(e, false);
        },
        onTouchEnd: (e: any) => clear(e),
        onTouchMove: (e: any) => {
            if (startPos.current && e.touches && e.touches.length > 0) {
                const moveX = e.touches[0].clientX;
                const moveY = e.touches[0].clientY;
                const distance = Math.sqrt(
                    Math.pow(moveX - startPos.current.x, 2) + Math.pow(moveY - startPos.current.y, 2)
                );
                if (distance > 10) {
                    isMoving.current = true;
                    clear(e, false);
                }
            } else {
                isMoving.current = true;
                clear(e, false);
            }
        }
    };
}

const preventDefault = (event: Event) => {
    if (!('touches' in event)) return;
    if ((event as any).touches.length < 2 && event.preventDefault) {
        event.preventDefault();
    }
};
