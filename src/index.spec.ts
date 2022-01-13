import { PromiseExecutor } from ".";

describe("PromiseExecutor", () => {
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    it("should run all promises to completion when requested", async () => {
        const e = new PromiseExecutor();
        e.submit(Promise.resolve(1));
        e.submit(Promise.resolve(2));
        e.submit(Promise.resolve(3));

        await e.next();
        await e.next();
        await e.next();

        expect(e.remaining).toBe(0);
    });

    it("should throw for rejected promise and remove task", async () => {
        const e = new PromiseExecutor();
        e.submit(Promise.reject(1));

        await expect(e.next()).rejects.toBe(1);
        expect(e.remaining).toBe(0);
    });

    it("should resolve earlier values first", async () => {
        const e = new PromiseExecutor();
        e.submit(sleep(10).then(() => 1));
        e.submit(sleep(30).then(() => 2));
        e.submit(sleep(20).then(() => 3));

        await expect(e.next()).resolves.toStrictEqual({ value: 1 });
        await expect(e.next()).resolves.toStrictEqual({ value: 3 });
        await expect(e.next()).resolves.toStrictEqual({ value: 2 });

        expect(e.remaining).toBe(0);
    });

    it("should resolve and throw mixed values and clean out the tasks", async () => {
        const e = new PromiseExecutor();
        e.submit(Promise.resolve(1));
        e.submit(Promise.reject(2));

        await expect(e.next()).resolves.toStrictEqual({ value: 1 });
        await expect(e.next()).rejects.toBe(2);

        expect(e.remaining).toBe(0);
    });

    it("should resolve to undefined if there are no tasks", async () => {
        const e = new PromiseExecutor();
        await expect(e.next()).resolves.toBe(undefined);
        expect(e.remaining).toBe(0);
    });
});
