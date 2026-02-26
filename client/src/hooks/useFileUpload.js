import { useState, useCallback } from 'react';
import { generateEvents, downloadBlob } from '../utils/api';

const INITIAL_STATE = {
  file: null,
  status: 'idle', // idle | loading | success | error
  message: '',
};

export function useFileUpload() {
  const [state, setState] = useState(INITIAL_STATE);

  const setFile = useCallback((file) => {
    setState({ ...INITIAL_STATE, file });
  }, []);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const submit = useCallback(async (dates = {}) => {
    setState((prev) => ({ ...prev, status: 'loading', message: '' }));

    try {
      const blob = await generateEvents(state.file, dates);
      downloadBlob(blob);
      setState((prev) => ({
        ...prev,
        status: 'success',
        message: 'Events generated! Check your downloads.',
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        message: err.message || 'Something went wrong',
      }));
    }
  }, [state.file]);

  return { ...state, setFile, reset, submit };
}
