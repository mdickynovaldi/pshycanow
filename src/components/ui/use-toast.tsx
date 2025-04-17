import * as React from "react";

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 1000000;

type ToastActionElement = React.ReactElement<{
  altText: string;
  onClick: () => void;
}>;

type ToastProps = {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  open: boolean;
};

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const;

type ActionType = typeof actionTypes;

type Action =
  | {
      type: ActionType["ADD_TOAST"];
      toast: ToastProps;
    }
  | {
      type: ActionType["UPDATE_TOAST"];
      toast: Partial<ToastProps>;
    }
  | {
      type: ActionType["DISMISS_TOAST"];
      toastId?: string;
    }
  | {
      type: ActionType["REMOVE_TOAST"];
      toastId?: string;
    };

interface State {
  toasts: ToastProps[];
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

// Create dispatch function type
type ToastDispatch = (action: Action) => void;

// Make dispatch available outside the component
let dispatch: ToastDispatch = () => {};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case actionTypes.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };

    case actionTypes.DISMISS_TOAST: {
      const { toastId } = action;

      if (toastId) {
        toastTimeouts.set(
          toastId,
          setTimeout(() => {
            dispatch({
              type: actionTypes.REMOVE_TOAST,
              toastId,
            });
          }, TOAST_REMOVE_DELAY)
        );

        return {
          ...state,
          toasts: state.toasts.map((t) =>
            t.id === toastId ? { ...t, open: false } : t
          ),
        };
      }

      return {
        ...state,
        toasts: state.toasts.map((t) => ({
          ...t,
          open: false,
        })),
      };
    }
    case actionTypes.REMOVE_TOAST: {
      const { toastId } = action;

      if (toastId) {
        toastTimeouts.delete(toastId);
        return {
          ...state,
          toasts: state.toasts.filter((t) => t.id !== toastId),
        };
      }

      return {
        ...state,
        toasts: [],
      };
    }
  }
};

const useToast = () => {
  const [state, dispatchAction] = React.useReducer(reducer, {
    toasts: [],
  });

  // Update the dispatch function to use the one from useReducer
  React.useEffect(() => {
    dispatch = dispatchAction;
    
    return () => {
      for (const [, timeout] of toastTimeouts) {
        clearTimeout(timeout);
      }
    };
  }, [dispatchAction]);

  const toast = ({
    title,
    description,
    action,
    ...props
  }: Omit<ToastProps, "id" | "open">) => {
    const id = Math.random().toString(36).slice(2, 9);

    dispatch({
      type: actionTypes.ADD_TOAST,
      toast: {
        id,
        title,
        description,
        action,
        open: true,
        ...props,
      },
    });

    return {
      id,
      dismiss: () => {
        dispatch({
          type: actionTypes.DISMISS_TOAST,
          toastId: id,
        });
      },
      update: (props: Omit<ToastProps, "id" | "open">) => {
        dispatch({
          type: actionTypes.UPDATE_TOAST,
          toast: {
            id,
            ...props,
          },
        });
      },
    };
  };

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => {
      dispatch({
        type: actionTypes.DISMISS_TOAST,
        toastId,
      });
    },
  };
};

export { useToast, type ToastProps, type ToastActionElement }; 