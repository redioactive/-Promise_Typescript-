import { AggregateError } from './AggregateError'; // 导入 AggregateError 类

// 定义 Commitment 类，实现了 PromiseLike 接口
export class Commitment<T> implements PromiseLike<T> {
    // 定义常量表示承诺的状态
    static readonly PENDING: String = 'pending';    // 等待中
    static readonly FULFILLED: String = 'fulfilled'; // 已兑现
    static readonly REJECTED: String = 'rejected';  // 已拒绝

    private status: string = Commitment.PENDING; // 承诺的状态，初始为 'pending'
    private result: any = null; // 承诺的结果
    private resolveCallbacks: Array<(value: T) => void> = []; // 解决回调函数数组
    private rejectCallbacks: Array<(error: any) => void> = []; // 拒绝回调函数数组
    private finallyCallbacks: Array<() => void> = []; // finally 回调函数数组

    // 构造函数
    constructor(func: (resolve: (value: T) => void, reject: (error: any) => void) => void) {
        try {
            func(this.resolve.bind(this), this.reject.bind(this)); // 执行传入的函数
        } catch (error) {
            this.reject(error); // 捕获并拒绝错误
        }
    }

    // 解决承诺
    private resolve(value: T): void {
        if (this.status === Commitment.PENDING) {
            this.status = Commitment.FULFILLED; // 设置状态为 'fulfilled'
            this.result = value; // 保存结果
            this.executeCallbacks(this.resolveCallbacks, value); // 执行所有解决回调
        }
    }

    // 拒绝承诺
    private reject(error: any): void {
        if (this.status === Commitment.PENDING) {
            this.status = Commitment.REJECTED; // 设置状态为 'rejected'
            this.result = error; // 保存错误
            this.executeCallbacks(this.rejectCallbacks, error); // 执行所有拒绝回调
        }
    }

    // 执行回调函数
    private executeCallbacks(callbacks: Array<(value: any) => void>, value: any): void {
        setTimeout(() => {
            callbacks.forEach(callback => callback(value)); // 执行所有回调函数
            this.finallyCallbacks.forEach(callback => callback()); // 执行所有 finally 回调函数
        });
    }

    // then 方法
    then<U>(onFulfilled?: (value: T) => U | PromiseLike<U>, onRejected?: (error: any) => U | PromiseLike<U>): PromiseLike<U> {
        return new Commitment<U>((resolve, reject): void => {
            const handleCallback = (callback: (value: T) => U | PromiseLike<U>, value: T): void => {
                try {
                    resolve(callback(value)); // 执行回调函数并解决承诺
                } catch (error) {
                    reject(error); // 捕获并拒绝错误
                }
            };

            // 根据当前状态决定如何处理回调
            if (this.status === Commitment.PENDING) {
                if (onFulfilled) this.resolveCallbacks.push(() => handleCallback(onFulfilled, this.result));
                if (onRejected) this.rejectCallbacks.push(() => handleCallback(onRejected, this.result));
            } else if (this.status === Commitment.FULFILLED && onFulfilled) {
                setTimeout(() => handleCallback(onFulfilled, this.result));
            } else if (this.status === Commitment.REJECTED && onRejected) {
                setTimeout(() => handleCallback(onRejected, this.result));
            }
        });
    }

    // catch 方法
    catch<U>(onRejected: (error: any) => U | PromiseLike<U>): Commitment<U> {
        return this.then(undefined, onRejected) as Commitment<U>;
    }

    // finally 方法
    finally(callback: () => void): PromiseLike<T> {
        const promise: PromiseLike<void> = this.then(
            value => {
                this.finallyCallbacks.forEach(cb => cb()); // 执行 finally 回调函数
                return value; // 返回原值
            },
            error => {
                this.finallyCallbacks.forEach(cb => cb()); // 执行 finally 回调函数
                throw error; // 抛出错误
            }
        );
        this.finallyCallbacks.push(callback); // 添加 finally 回调函数
        return promise; // 返回承诺
    }

    // 静态 all 方法
    static all<T>(promises: Array<PromiseLike<T>>): Commitment<T[]> {
        return new Commitment<T[]>((resolve, reject) => {
            const results: T[] = []; // 存储结果
            let resolvedCount: number = 0; // 解决的计数器
            if (promises.length === 0) return resolve(results); // 如果没有承诺，直接返回空数组

            // 处理每个承诺
            promises.forEach((promise: PromiseLike<T>, index: number): void => {
                Commitment.resolve(promise).then(
                    value => {
                        results[index] = value; // 存储结果
                        if (++resolvedCount === promises.length) resolve(results); // 如果所有承诺都解决，返回结果
                    },
                    reject // 处理错误
                );
            });
        });
    }

    // 静态 allSettled 方法
    static allSettled<T>(promises: Array<PromiseLike<T>>): PromiseLike<Array<{
        status: string;
        value?: T;
        reason?: any
    }>> {
        return new Commitment<Array<{ status: string; value?: T; reason?: any }>>((resolve) => {
            const results: Array<{ status: string; value?: T; reason?: any }> = []; // 存储结果
            let settledCount: number = 0; // 已解决的计数器
            if (promises.length === 0) return resolve([]); // 如果没有承诺，返回空数组

            // 处理每个承诺
            promises.forEach((promise: PromiseLike<T>, index: number): void => {
                Commitment.resolve(promise).then(
                    value => {
                        results[index] = { status: Commitment.FULFILLED, value }; // 记录成功的结果
                        if (++settledCount === promises.length) resolve(results); // 如果所有承诺都处理完，返回结果
                    },
                    error => {
                        results[index] = { status: Commitment.REJECTED, reason: error }; // 记录失败的结果
                        if (++settledCount === promises.length) resolve(results); // 如果所有承诺都处理完，返回结果
                    }
                );
            });
        });
    }

    // 静态 any 方法
    static any<T>(promises: Array<PromiseLike<T>>): Commitment<T> {
        return new Commitment<T>((resolve, reject) => {
            const errors: any[] = []; // 存储错误
            let rejectedCount: number = 0; // 拒绝的计数器

            if (promises.length === 0) return reject(new AggregateError([], 'No promises in the array')); // 如果没有承诺，返回错误

            // 处理每个承诺
            promises.forEach(promise => {
                Commitment.resolve(promise).then(resolve, error => {
                    errors.push(error); // 存储错误
                    if (++rejectedCount === promises.length) {
                        reject(new AggregateError(errors, 'All promises were rejected')); // 如果所有承诺都被拒绝，返回 AggregateError
                    }
                });
            });
        });
    }

    // 静态 race 方法
    static race<T>(promises: Array<PromiseLike<T>>): PromiseLike<T> {
        return new Commitment<T>((resolve, reject) => {
            if (promises.length === 0) return reject(new Error('No promises in the array')); // 如果没有承诺，返回错误

            // 处理每个承诺
            promises.forEach(promise => {
                Commitment.resolve(promise).then(resolve, reject); // 解决或拒绝第一个完成的承诺
            });
        });
    }

    // 静态 resolve 方法
    static resolve<T>(value: T | PromiseLike<T>): PromiseLike<T> {
        if (value instanceof Commitment) return value as PromiseLike<T>; // 如果值已经是 Commitment 实例，直接返回
        return new Commitment<T>((resolve) => resolve(value)); // 否则创建新的 Commitment 并解决值
    }
}
