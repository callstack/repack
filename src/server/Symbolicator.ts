import { URL } from 'url';
import path from 'path';

export interface ReactNativeStackFrame {
  lineNumber: number;
  column: number;
  file: string;
  methodName: string;
}

// 1. figure out platform from stack frames's file
// 2. fetch source map
// 3. filter out unnecessary frames https://github.com/facebook/metro/blob/a9862e66368cd177884ea1e014801fe0c57ef5d7/packages/metro/src/Server.js#L1042
// 4. symbolicate each stack frame https://github.com/facebook/metro/blob/a9862e66368cd177884ea1e014801fe0c57ef5d7/packages/metro/src/Server/symbolicate.js#L57
// 5. create code frame
// 6. reply

export class Symbolicator {
  static inferPlatformFromStack(stack: ReactNativeStackFrame[]) {
    for (const frame of stack) {
      const { searchParams, pathname } = new URL(frame.file, 'file://');
      const platform = searchParams.get('platform');
      if (platform) {
        return platform;
      } else {
        const [bundleFilename] = pathname.split('/').reverse();
        const [, platformOrExtension, extension] = bundleFilename.split('.');
        if (extension) {
          return platformOrExtension;
        }
      }
    }
  }
}

// async _symbolicate(req: IncomingMessage, res: ServerResponse) {
//   const getCodeFrame = (urls, symbolicatedStack) => {
//     for (let i = 0; i < symbolicatedStack.length; i++) {
//       const {collapse, column, file, lineNumber} = symbolicatedStack[i];
//       // $FlowFixMe[incompatible-call]
//       const entryPoint = path.resolve(this._config.projectRoot, file);
//       if (collapse || lineNumber == null || urls.has(entryPoint)) {
//         continue;
//       }

//       try {
//         return {
//           content: codeFrameColumns(
//             fs.readFileSync(entryPoint, 'utf8'),
//             {
//               // Metro returns 0 based columns but codeFrameColumns expects 1-based columns
//               // $FlowFixMe[unsafe-addition]
//               start: {column: column + 1, line: lineNumber},
//             },
//             {forceColor: true},
//           ),
//           location: {
//             row: lineNumber,
//             column,
//           },
//           fileName: file,
//         };
//       } catch (error) {
//         console.error(error);
//       }
//     }

//     return null;
//   };

//   try {
//     const symbolicatingLogEntry = log(
//       createActionStartEntry('Symbolicating'),
//     );
//     debug('Start symbolication');
//     /* $FlowFixMe: where is `rawBody` defined? Is it added by the `connect` framework? */
//     const body = await req.rawBody;
//     const stack = JSON.parse(body).stack.map(frame => {
//       if (frame.file && frame.file.includes('://')) {
//         return {
//           ...frame,
//           file: this._config.server.rewriteRequestUrl(frame.file),
//         };
//       }
//       return frame;
//     });
//     // In case of multiple bundles / HMR, some stack frames can have different URLs from others
//     const urls = new Set();

//     stack.forEach(frame => {
//       const sourceUrl = frame.file;
//       // Skip `/debuggerWorker.js` which does not need symbolication.
//       if (
//         sourceUrl != null &&
//         !urls.has(sourceUrl) &&
//         !sourceUrl.endsWith('/debuggerWorker.js') &&
//         sourceUrl.startsWith('http')
//       ) {
//         urls.add(sourceUrl);
//       }
//     });

//     debug('Getting source maps for symbolication');
//     const sourceMaps = await Promise.all(
//       Array.from(urls.values()).map(this._explodedSourceMapForURL, this),
//     );

//     debug('Performing fast symbolication');
//     const symbolicatedStack = await await symbolicate(
//       stack,
//       zip(urls.values(), sourceMaps),
//       this._config,
//     );

//     debug('Symbolication done');
//     res.end(
//       JSON.stringify({
//         codeFrame: getCodeFrame(urls, symbolicatedStack),
//         stack: symbolicatedStack,
//       }),
//     );
//     process.nextTick(() => {
//       log(createActionEndEntry(symbolicatingLogEntry));
//     });
//   } catch (error) {
//     console.error(error.stack || error);
//     res.statusCode = 500;
//     res.end(JSON.stringify({error: error.message}));
//   }
// }

// async _explodedSourceMapForURL(reqUrl: string): Promise<ExplodedSourceMap> {
//   const options = parseOptionsFromUrl(
//     reqUrl,
//     new Set(this._config.resolver.platforms),
//     BYTECODE_VERSION,
//   );

//   const {
//     entryFile,
//     transformOptions,
//     serializerOptions,
//     graphOptions,
//     onProgress,
//   } = splitBundleOptions(options);

//   /**
//    * `entryFile` is relative to projectRoot, we need to use resolution function
//    * to find the appropriate file with supported extensions.
//    */
//   const resolvedEntryFilePath = await this._resolveRelativePath(entryFile, {
//     transformOptions,
//   });

//   const graphId = getGraphId(resolvedEntryFilePath, transformOptions, {
//     shallow: graphOptions.shallow,
//     experimentalImportBundleSupport: this._config.transformer
//       .experimentalImportBundleSupport,
//   });
//   let revision;
//   const revPromise = this._bundler.getRevisionByGraphId(graphId);
//   if (revPromise == null) {
//     ({revision} = await this._bundler.initializeGraph(
//       resolvedEntryFilePath,
//       transformOptions,
//       {onProgress, shallow: graphOptions.shallow},
//     ));
//   } else {
//     ({revision} = await this._bundler.updateGraph(await revPromise, false));
//   }

//   let {prepend, graph} = revision;
//   if (serializerOptions.modulesOnly) {
//     prepend = [];
//   }

//   return getExplodedSourceMap(
//     [...prepend, ...this._getSortedModules(graph)],
//     {
//       processModuleFilter: this._config.serializer.processModuleFilter,
//     },
//   );
// }

// async _resolveRelativePath(filePath, {transformOptions}) {
//   const resolutionFn = await transformHelpers.getResolveDependencyFn(
//     this._bundler.getBundler(),
//     transformOptions.platform,
//   );
//   return resolutionFn(`${this._config.projectRoot}/.`, filePath);
// }
