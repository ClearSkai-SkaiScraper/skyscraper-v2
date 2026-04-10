import * as Sentry from '@sentry/nextjs';

type AnyFn<T> = () => Promise<T>;

export async function withDbSpan<T>(name: string, fn: AnyFn<T>): Promise<T> {
  // Guard against missing getCurrentHub API in this build context
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hub = (Sentry as any).getCurrentHub?.();
  const transaction = hub?.getScope?.()?.getTransaction?.();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let span: any;
  if (transaction) {
    span = transaction.startChild({ op: 'db', description: name });
  } else {
    span = Sentry.startSpan({ name: `db:${name}`, op: 'db' }, () => null);
  }
  try {
    const started = Date.now();
    const result = await fn();
    span?.setData('duration_ms', Date.now() - started);
    return result;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    span?.setStatus('internal_error');
    span?.setData('error', e?.message);
    Sentry.captureException(e, { tags: { dbSpan: name } });
    throw e;
  } finally {
    span?.finish?.();
  }
}
