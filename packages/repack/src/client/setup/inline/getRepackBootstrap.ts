export const getRepackBootstrap = ({
  chunkLoadingGlobal,
}: {
  chunkLoadingGlobal: string;
}) => `
/******** Re.Pack bootstrap *********************************************/
/******/
/******/  /* ensure self is defined */
/******/  var self = self || this || new Function("return this")() || ({});
/******/
/******/  /* ensure repack object is defined */
/******/  var __repack__ = self["__repack__"] = __repack__ || self["__repack__"] || {
/******/    loadChunk: function() { throw new Error("Missing implementation for __repack__.loadChunk"); },
/******/    execChunkCallback: [],
/******/  };
/******/
/******/  /* inject repack to callback for chunk loading */
/******/  !function() {
/******/    function repackLoadChunkCallback(parentPush, data) {
/******/      if (parentPush) parentPush(data);
/******/      var chunkIds = data[0];
/******/      var i = 0;
/******/      for(; i < chunkIds.length; i++) {
/******/        __repack__.execChunkCallback.push(chunkIds[i]);
/******/      }
/******/    }
/******/
/******/    var chunkLoadingGlobal = self["${chunkLoadingGlobal}"] = self["${chunkLoadingGlobal}"] || [];
/******/    chunkLoadingGlobal.push = repackLoadChunkCallback.bind(null, chunkLoadingGlobal.push.bind(chunkLoadingGlobal));
/******/  }();
/******/
/************************************************************************/
`;
