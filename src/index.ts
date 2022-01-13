/**
 * A promise executor which returns the next value to be resolved.
 *
 * User can call `submit(Promise)` to add a promise
 * and call `next()` to get a promise that will resolve next.
 *
 * This is useful to build logic which require limited concurrency.
 *
 * For example: You have 20 blocks to upload but you want to limit the concurrent uploads to 4.
 *
 * ```typescript
 *  const exec = new PromiseExecutor();
 *  const concurrency = 4;
 *  let i = 0;
 *  let totalBlock = 20;
 *
 *  while (true) {
 *      if (exec.length == 0 && i == totalBlocks) {
 *          // Nothing pending and nothing more to add.
 *          break;
 *      }
 *
 *      // Add tasks if below target concurrency.
 *      while (exec.remaining < concurrency && i < totalBlocks) {
 *          exec.submit(blockUploadPromise(i));
 *          i++;
 *      }
 *
 *      // Wait for one of the tasks to complete.
 *      const result = await exec.next();
 *      if (result) {
 *          useResult(result.value);
 *      }
 *  }
 * ```
 */
export class PromiseExecutor<T> {
    private tasks: Promise<Result<T>>[] = [];
    private taskIds = new Map<symbol, Promise<Result<T>>>();

    constructor();
    constructor(tasks: Promise<T>[]);
    constructor(tasks?: Promise<T>[]) {
        if (tasks) {
            for (const t of tasks) {
                this.submit(t);
            }
        }
    }

    /**
     * Submit a promise to this executor.
     *
     * The next call to `next()` will include this promise.
     *
     * @param promise - The promise to be added
     */
    submit(promise: Promise<T>): void {
        const id = Symbol();

        const p: Promise<Result<T>> = promise.then(
            (value) => ({ ok: true, value, id }),
            (err) => ({ ok: false, err, id })
        );

        this.tasks.push(p);
        this.taskIds.set(id, p);
    }

    /**
     * Get the next resolved value.
     *
     * Output is `{ value: T }` if the executor is not idle, otherwise `undefined`.
     *
     * @returns the next resolved value.
     */
    async next(): Promise<Option<T>> {
        if (this.tasks.length === 0) {
            return undefined;
        }

        const result = await Promise.race(this.tasks);
        this.removeTask(result.id);

        if (result.ok) {
            return { value: result.value };
        }

        throw result.err;
    }

    get remaining(): number {
        return this.tasks.length;
    }

    private removeTask(id: symbol) {
        const p = this.taskIds.get(id);
        if (p) {
            this.taskIds.delete(id);
            this.tasks = this.tasks.filter((t) => t !== p);
        }
    }
}

/**
 * A type indicating the presence of data of some type `T`.
 */
export interface Some<T> {
    value: T;
}

/**
 * A type indicating presence or absence of data. It is `Some<T>` if data is present, otherwise `undefined`.
 */
export type Option<T> = Some<T> | undefined;

interface Ok<T> {
    ok: true;
    value: T;
    id: symbol;
}

interface Err {
    ok: false;
    err: unknown;
    id: symbol;
}

type Result<T> = Ok<T> | Err;
