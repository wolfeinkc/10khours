import { useState, useRef, useCallback, useEffect } from 'react';

export interface DebouncedSliderProps<T> {
  initialValue: T;
  onSave: (value: T) => void;
  debounceMs?: number;
}

export interface DebouncedSliderResult<T> {
  value: T;
  isInteracting: boolean;
  isPending: boolean;
  handlers: {
    onStart: () => void;
    onEnd: () => void;
    onChange: (value: T) => void;
  };
}

/**
 * A hook for debounced slider interactions that prevents auto-save during active interaction
 * and only triggers save operations after the user stops interacting for a specified time.
 * 
 * @param initialValue - The initial value for the slider
 * @param onSave - Callback function to handle save operation
 * @param debounceMs - Debounce timeout in milliseconds (default: 1000ms)
 */
export function useDebouncedSlider<T>({
  initialValue,
  onSave,
  debounceMs = 1000
}: DebouncedSliderProps<T>): DebouncedSliderResult<T> {
  // Single source of truth for value
  const [value, setValue] = useState<T>(initialValue);
  const [isInteracting, setIsInteracting] = useState<boolean>(false);
  const [isPending, setIsPending] = useState<boolean>(false);
  
  // Use refs to avoid including state in dependencies that could cause re-renders
  const isInteractingRef = useRef<boolean>(false);
  const valueRef = useRef<T>(initialValue);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize the refs when initialValue changes
  useEffect(() => {
    // Only update if not interacting
    if (!isInteractingRef.current) {
      setValue(initialValue);
      valueRef.current = initialValue;
    }
  }, [initialValue]);
  
  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Cancel any pending debounced save
  const cancelSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsPending(false);
  }, []);

  // Handle start of interaction (mouse/touch down)
  const handleStart = useCallback(() => {
    isInteractingRef.current = true;
    setIsInteracting(true);
    cancelSave();
  }, [cancelSave]);

  // Handle end of interaction (mouse/touch up)
  const handleEnd = useCallback(() => {
    isInteractingRef.current = false;
    setIsInteracting(false);
    
    // Schedule save after interaction ends
    setIsPending(true);
    timeoutRef.current = setTimeout(() => {
      try {
        onSave(valueRef.current);
      } catch (error) {
        console.error('Error saving slider value:', error);
      } finally {
        setIsPending(false);
      }
    }, debounceMs);
  }, [debounceMs, onSave]);

  // Handle value change
  const handleChange = useCallback((newValue: T) => {
    valueRef.current = newValue;
    setValue(newValue);
    
    // If this is a programmatic change (not user interaction),
    // then schedule a save after debounce period
    if (!isInteractingRef.current) {
      cancelSave();
      setIsPending(true);
      timeoutRef.current = setTimeout(() => {
        try {
          onSave(newValue);
        } catch (error) {
          console.error('Error saving slider value:', error);
        } finally {
          setIsPending(false);
        }
      }, debounceMs);
    }
  }, [debounceMs, onSave, cancelSave]);

  return {
    value,
    isInteracting,
    isPending,
    handlers: {
      onStart: handleStart,
      onEnd: handleEnd,
      onChange: handleChange
    }
  };
}

export default useDebouncedSlider;
