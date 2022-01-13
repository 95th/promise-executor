# promise-executor

A promise executor which returns the next value to be resolved. The results are ordered according to their completion.

User can call `submit(Promise)` to add a promise

and call `next()` to get a promise that will resolve next.

## Usage:

```typescript
const exec = new PromiseExecutor<number>();
exec.submit(Promise.resolve(1));
exec.submit(Promise.resolve(2));

const firstCompleted = await exec.next();
const secondCompleted = await exec.next();
```

## Building:

```sh
# Build
npm run build

# Test
npm run test
```

This library is useful to build logic which require limited concurrency.

For example: You have 20 tasks to perform but you want to limit the concurrent tasks to 4.

```typescript
const exec = new PromiseExecutor();
const concurrency = 4;
let i = 0;
let totalTasks = 20;

while (true) {
    if (exec.length == 0 && i == totalTasks) {
        // Nothing pending and nothing more to add.
        break;
    }
    // Add tasks if below target concurrency.
    while (exec.remaining < concurrency && i < totalTasks) {
        exec.submit(getTask(i));
        i++;
    }
    // Wait for one of the tasks to complete.
    const result = await exec.next();
    if (result) {
        useResult(result.value);
    }
}
```
