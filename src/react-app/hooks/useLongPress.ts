import { useCallback, useRef, useState } from 'react';

export function useLongPress(
    onLongPress: (e: any) => void,
    onClick: () => void,
    { shouldPreventDefault = true, delay = 500 } = {}
) {
    const [longPressTriggered, setLongPressTriggered] = useState(false);
    const timeout = useRef<any>(null);
    const target = useRef<any>(null);

    const start = useCallback(
        (event: any) => {
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
            shouldTriggerClick && !longPressTriggered && onClick();
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
        onMouseLeave: (e: any) => clear(e, false),
        onTouchEnd: (e: any) => clear(e),
        onTouchMove: (e: any) => clear(e, false)
    };
}

const preventDefault = (event: Event) => {
    if (!('touches' in event)) return;
    if ((event as any).touches.length < 2 && event.preventDefault) {
        event.preventDefault();
    }
};
