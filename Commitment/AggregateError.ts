export class AggregateError extends Error {
    errors:any[];

    constructor(errors:any[],message:string) {
        super(message);
        this.errors = errors;
        this.name = 'AggregateError'
    }
}