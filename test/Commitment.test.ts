import {Commitment} from '../Commitment/Commitment'
import {AggregateError} from '../Commitment/AggregateError'

describe('Commitment Class', () => {
    test('测试resolve', done => {
        const promise:Commitment<number> = new Commitment<number>((resolve) => resolve(42));
        promise.then(value => {
            expect(value).toBe(42);
            done();
        });
    });

    test('测试reject', done => {
        const promise:Commitment<number> = new Commitment<number>((_, reject) => reject(new Error('失败')));
        promise.catch(error => {
            expect(error).toEqual(new Error('失败'));
            done();
        });
    });

    test('测试finally', done => {
        const promise:Commitment<number> = new Commitment<number>((resolve) => resolve(42));
        const finallyCallback = jest.fn();
        promise.finally(finallyCallback).then(value => {
            expect(value).toBe(42);
            expect(finallyCallback).toHaveBeenCalled();
            done();
        });
    });

    test('测试 .all成功方法', done => {
        const promise1:Commitment<number> = new Commitment<number>((resolve) => resolve(1));
        const promise2:Commitment<number> = new Commitment<number>((resolve) => resolve(2));
        Commitment.all([promise1, promise2]).then(values => {
            expect(values).toEqual([1, 2]);
            done();
        });
    });

    test('测试 .all失败方法', done => {
        const promise1:Commitment<number> = new Commitment<number>((resolve) => resolve(1));
        const promise2:Commitment<number> = new Commitment<number>((_, reject) => reject(new Error('失败')));
        Commitment.all([promise1, promise2]).catch(error => {
            expect(error).toEqual(new Error('失败'));
            done();
        });
    });

    test('测试.allSettled', done => {
        const promise1:Commitment<number> = new Commitment<number>((resolve) => resolve(1));
        const promise2:Commitment<number> = new Commitment<number>((_, reject) => reject(new Error('失败')));
        Commitment.allSettled([promise1, promise2]).then(results => {
            expect(results).toEqual([
                { status: Commitment.FULFILLED, value: 1 },
                { status: Commitment.REJECTED, reason: new Error('失败') }
            ]);
            done();
        });
    });

    test('测试.any方法', done => {
        const promise1:Commitment<number> = new Commitment<number>((_, reject) => reject(new Error('失败')));
        const promise2:Commitment<number> = new Commitment<number>((resolve) => resolve(2));
        Commitment.any([promise1, promise2]).then(value => {
            expect(value).toBe(2);
            done();
        });
    });

    test('测试.any方法', done => {
        const promise1:Commitment<number> = new Commitment<number>((_, reject) => reject(new Error('失败')));
        const promise2:Commitment<number> = new Commitment<number>((_, reject) => reject(new Error('失败')));
        Commitment.any([promise1, promise2]).catch(error => {
            expect(error).toBeInstanceOf(AggregateError);
            done();
        });
    });

    test('测试.race方法', done => {
        const promise1:Commitment<number> = new Commitment<number>((_, reject) => setTimeout(() => reject(new Error('失败')), 100));
        const promise2:Commitment<number> = new Commitment<number>((resolve) => setTimeout(() => resolve(2), 50));
        Commitment.race([promise1, promise2]).then(value => {
            expect(value).toBe(2);
            done();
        });
    });
});
