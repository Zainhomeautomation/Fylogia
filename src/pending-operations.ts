// Reload safety for local work outside the main preference/library store.
// Tokens are operation-scoped (including nested work) and always released.
const pending = new Set<symbol>();
export const hasPendingLocalOperations = () => pending.size > 0;
export function beginLocalOperation() {
  const token = Symbol();
  pending.add(token);
  return () => {
    pending.delete(token);
  };
}
export function trackLocalOperation<Args extends unknown[], Result>(
  operation: (...args: Args) => Promise<Result>,
) {
  return async (...args: Args): Promise<Result> => {
    const finish = beginLocalOperation();
    try {
      return await operation(...args);
    } finally {
      finish();
    }
  };
}
