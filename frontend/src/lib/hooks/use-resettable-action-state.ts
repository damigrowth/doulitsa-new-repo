/**
 * Custom Hook: useResettableActionState
 *
 * Wraps React's useActionState hook to provide reset functionality.
 * Solves the problem of resetting form state without triggering server actions.
 *
 * @see https://www.nico.fyi/blog/reset-state-from-react-useactionstate
 */

import { useActionState } from 'react';

export function useResettableActionState<State, Payload>(
  action: (state: Awaited<State>, payload: Payload) => State | Promise<State>,
  initialState: Awaited<State>,
  permalink?: string,
): [
  state: Awaited<State>,
  dispatch: (payload: Payload | null) => void,
  isPending: boolean,
  reset: () => void,
] {
  const [state, submit, isPending] = useActionState(
    async (state: Awaited<State>, payload: Payload | null) => {
      // If payload is null, reset to initial state
      if (!payload) {
        return initialState;
      }
      // Otherwise, execute the actual action
      const data = await action(state, payload);
      return data;
    },
    initialState,
    permalink,
  );

  const reset = () => {
    submit(null);
  };

  return [state, submit, isPending, reset];
}
