"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFunctionType = exports.type = void 0;
const typedoc_1 = require("typedoc");
const types_1 = require("typedoc/dist/lib/models/types");
const theme_1 = require("../../theme");
const escape_1 = require("./escape");
function type(collapse = 'none', emphasis = true) {
    if (this instanceof types_1.ReferenceType) {
        return getReferenceType(this, emphasis);
    }
    if (this instanceof types_1.ArrayType && this.elementType) {
        return getArrayType(this, emphasis);
    }
    if (this instanceof types_1.UnionType && this.types) {
        return getUnionType(this, emphasis);
    }
    if (this instanceof types_1.IntersectionType && this.types) {
        return getIntersectionType(this);
    }
    if (this instanceof types_1.TupleType && this.elements) {
        return getTupleType(this);
    }
    if (this instanceof types_1.IntrinsicType && this.name) {
        return getIntrinsicType(this, emphasis);
    }
    if (this instanceof types_1.ReflectionType && this.declaration) {
        return getReflectionType(this.declaration, collapse);
    }
    if (this instanceof typedoc_1.DeclarationReflection) {
        return getReflectionType(this, collapse);
    }
    if (this instanceof types_1.TypeOperatorType) {
        return getTypeOperatorType(this);
    }
    if (this instanceof types_1.QueryType) {
        return getQueryType(this);
    }
    if (this instanceof types_1.TypeParameterType) {
        return getTypeParameterType(this);
    }
    if (this instanceof types_1.ConditionalType) {
        return getConditionalType(this);
    }
    if (this instanceof types_1.IndexedAccessType) {
        return getIndexAccessType(this);
    }
    if (this instanceof types_1.UnknownType) {
        return getUnknownType(this);
    }
    if (this instanceof types_1.InferredType) {
        return getInferredType(this);
    }
    if (this instanceof types_1.LiteralType) {
        return getLiteralType(this);
    }
    return this ? escape_1.escape(this.toString()) : '';
}
exports.type = type;
function getLiteralType(model) {
    if (typeof model.value === 'bigint') {
        return `*${model.value}n*`;
    }
    return `*${model.value}*`;
}
function getReflectionType(model, collapse) {
    if (model.signatures) {
        return collapse === 'function' || collapse === 'all'
            ? '*function*'
            : getFunctionType(model.signatures);
    }
    return collapse === 'object' || collapse === 'all'
        ? '*object*'
        : getDeclarationType(model);
}
function getDeclarationType(model) {
    if (model.indexSignature || model.children) {
        let indexSignature = '';
        const declarationIndexSignature = model.indexSignature;
        if (declarationIndexSignature) {
            const key = declarationIndexSignature.parameters
                ? declarationIndexSignature.parameters.map((param) => `[${param.name}: ${param.type}]`)
                : '';
            const obj = type.call(declarationIndexSignature.type);
            indexSignature = `${key}: ${obj}; `;
        }
        const types = model.children &&
            model.children.map((obj) => {
                return `\`${obj.name}${obj.flags.isOptional ? '?' : ''}\`: ${type.call(obj.signatures || obj.children ? obj : obj.type)} ${obj.defaultValue && obj.defaultValue !== '...'
                    ? `= ${escape_1.escape(obj.defaultValue)}`
                    : ''}`;
            });
        return `{ ${indexSignature ? indexSignature : ''}${types ? types.join('; ') : ''} }${model.defaultValue && model.defaultValue !== '...'
            ? `= ${escape_1.escape(model.defaultValue)}`
            : ''}`;
    }
    return '{}';
}
function getFunctionType(modelSignatures) {
    const functions = modelSignatures.map((fn) => {
        const typeParams = fn.typeParameters
            ? `<${fn.typeParameters
                .map((typeParameter) => typeParameter.name)
                .join(', ')}\\>`
            : [];
        const params = fn.parameters
            ? fn.parameters.map((param) => {
                return `${param.flags.isRest ? '...' : ''}\`${escape_1.escape(param.name)}${param.flags.isOptional ? '?' : ''}\`: ${type.call(param.type ? param.type : param)}`;
            })
            : [];
        const returns = type.call(fn.type);
        return typeParams + `(${params.join(', ')}) => ${returns}`;
    });
    return functions.join('');
}
exports.getFunctionType = getFunctionType;
function getReferenceType(model, emphasis) {
    if (model.reflection || (model.name && model.typeArguments)) {
        const reflection = model.reflection && model.reflection.url
            ? [
                `[*${escape_1.escape(model.reflection.name)}*](${theme_1.default.HANDLEBARS.helpers.relativeURL(model.reflection.url)})`,
            ]
            : [emphasis ? `*${escape_1.escape(model.name)}*` : escape_1.escape(model.name)];
        if (model.typeArguments && model.typeArguments.length > 0) {
            reflection.push(`<${model.typeArguments
                .map((typeArgument) => `${type.call(typeArgument, 'none', false)}`)
                .join(', ')}\\>`);
        }
        return reflection.join('');
    }
    return escape_1.escape(model.name);
}
function getArrayType(model, emphasis) {
    const arrayType = type.call(model.elementType, 'none', emphasis);
    return model.elementType.type === 'union'
        ? `(${arrayType})[]`
        : `${arrayType}[]`;
}
function getUnionType(model, emphasis) {
    return model.types
        .map((unionType) => type.call(unionType, 'none', emphasis))
        .join(` \\| `);
}
function getIntersectionType(model) {
    return model.types
        .map((intersectionType) => type.call(intersectionType))
        .join(' & ');
}
function getTupleType(model) {
    return `[${model.elements.map((element) => type.call(element)).join(', ')}]`;
}
function getIntrinsicType(model, emphasis) {
    return emphasis ? `*${escape_1.escape(model.name)}*` : escape_1.escape(model.name);
}
function getTypeOperatorType(model) {
    return `${model.operator} ${type.call(model.target)}`;
}
function getQueryType(model) {
    return `*typeof* ${type.call(model.queryType)}`;
}
function getTypeParameterType(model) {
    return escape_1.escape(model.name);
}
function getInferredType(model) {
    return `*infer* ${escape_1.escape(model.name)}`;
}
function getUnknownType(model) {
    return escape_1.escape(model.name);
}
function getConditionalType(model) {
    const md = [];
    if (model.checkType) {
        md.push(type.call(model.checkType));
    }
    md.push('*extends*');
    if (model.extendsType) {
        md.push(type.call(model.extendsType));
    }
    md.push('?');
    if (model.trueType) {
        md.push(type.call(model.trueType));
    }
    md.push(':');
    if (model.falseType) {
        md.push(type.call(model.falseType));
    }
    return md.join(' ');
}
function getIndexAccessType(model) {
    const md = [];
    if (model.objectType) {
        md.push(type.call(model.objectType));
    }
    if (model.indexType) {
        md.push(`[${type.call(model.indexType)}]`);
    }
    return md.join('');
}
