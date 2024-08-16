import { Commitment } from '../Commitment/Commitment';
import { AggregateError } from '../Commitment/AggregateError';

const resolveValue:number = 42;
const rejectError:Error = new Error('失败');

const createResolvedPromise = (value) => new Commitment(resolve => resolve(value));
const createRejectedPromise = (error) => new Commitment((_, reject) => reject(error));


const promise1:Commitment<unknown> = createResolvedPromise(1);
const promise2:Commitment<unknown> = createResolvedPromise(2);
const rejectedPromise1:Commitment<unknown> = createRejectedPromise(rejectError);
const rejectedPromise2:Commitment<unknown> = createRejectedPromise(rejectError);

const testPromise = (promise, expectedValue, done, shouldReject:boolean = false):void => {
    if (shouldReject) {
        promise.catch(error => {
            expect(error).toEqual(expectedValue);
            done();
        });
    } else {
        promise.then(value => {
            expect(value).toBe(expectedValue);
            done();
        });
    }
};

describe('Commitment Class', () => {
    test('测试resolve', done => {
        const promise:Commitment<unknown> = createResolvedPromise(resolveValue);
        testPromise(promise, resolveValue, done);
    });

    test('测试reject', done => {
        const promise:Commitment<unknown> = createRejectedPromise(rejectError);
        testPromise(promise, rejectError, done, true);
    });

    test('测试finally', done => {
        const promise:Commitment<unknown> = createResolvedPromise(resolveValue);
        const finallyCallback = jest.fn();
        promise.finally(finallyCallback).then(value => {
            expect(value).toBe(resolveValue);
            expect(finallyCallback).toHaveBeenCalled();
            done();
        });
    });

    test('测试.all成功方法', done => {
        Commitment.all([promise1, promise2]).then(values => {
            expect(values).toEqual([1, 2]);
            done();
        });
    });

    test('测试.all失败方法', done => {
        Commitment.all([promise1, rejectedPromise1]).catch(error => {
            expect(error).toEqual(rejectError);
            done();
        });
    });

    test('测试.allSettled', done => {
        Commitment.allSettled([promise1, rejectedPromise1]).then(results => {
            expect(results).toEqual([
                { status: Commitment.FULFILLED, value: 1 },
                { status: Commitment.REJECTED, reason: rejectError }
            ]);
            done();
        });
    });

    test('测试.any方法 (成功)', done => {
        Commitment.any([rejectedPromise1, promise2]).then(value => {
            expect(value).toBe(2);
            done();
        });
    });

    test('测试.any方法 (失败)', done => {
        Commitment.any([rejectedPromise1, rejectedPromise2]).catch(error => {
            expect(error).toBeInstanceOf(AggregateError);
            done();
        });
    });

    test('测试.race方法', done => {
        const racePromise1:Commitment<unknown> = new Commitment((_, reject) => setTimeout(() => reject(rejectError), 100));
        const racePromise2:Commitment<unknown> = new Commitment((resolve) => setTimeout(() => resolve(2), 50));
        Commitment.race([racePromise1, racePromise2]).then(value => {
            expect(value).toBe(2);
            done();
        });
    });
});
