"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ifShowTypeHierarchy = void 0;
function ifShowTypeHierarchy(options) {
    var _a;
    const typeHierarchy = (_a = this.model) === null || _a === void 0 ? void 0 : _a.typeHierarchy;
    return typeHierarchy && typeHierarchy.next
        ? options.fn(this)
        : options.inverse(this);
}
exports.ifShowTypeHierarchy = ifShowTypeHierarchy;
