import { SignatureReflection } from 'typedoc';
import { ArrayType, ConditionalType, IndexedAccessType, InferredType, IntersectionType, IntrinsicType, PredicateType, QueryType, ReferenceType, TupleType, TypeOperatorType, TypeParameterType, UnionType, UnknownType } from 'typedoc/dist/lib/models/types';
declare type Collapse = 'object' | 'function' | 'all' | 'none';
export declare function type(this: ArrayType | IntersectionType | IntrinsicType | ReferenceType | TupleType | UnionType | TypeOperatorType | TypeParameterType | QueryType | PredicateType | ReferenceType | ConditionalType | IndexedAccessType | UnknownType | InferredType, collapse?: Collapse, emphasis?: boolean): string;
export declare function getFunctionType(modelSignatures: SignatureReflection[]): string;
export {};
