

const generate = require(`@babel/generator`).default;
const { fromString, fromFile } = require(`../ast.js`);

const clearConcealedStringsSession = require(`./transformations/clear-concealed-strings-session.js`);
const decodeEval = require(`./transformations/decode-eval.js`);
const findUtmcvProperties = require(`./transformations/find-utmcv-properties.js`);
const renameBrowserProperties = require(`./transformations/rename-browser-properties.js`);
const replaceInliningFunctions = require(`./transformations/replace-inlining-functions.js`);
const replaceObtuseBinaryExpressions = require(`./transformations/replace-obtuse-binary-expressions.js`);
const replacePropertyHexLiterals = require(`./transformations/replace-property-hex-literals.js`);
const replaceStaticValues = require("./transformations/replace-static-values.js");
const reverseControlFlowCases = require(`./transformations/reverse-control-flow-cases.js`);


class Utmvc {

  constructor(ast) {
    this.ast = ast;
  }

  static fromString(str) {

    let ast = fromString(str);

    Utmvc.deobfuscate(ast);
    return new Utmvc(ast);

  }

  static fromFile(file) {

    let ast = fromFile(file);

    Utmvc.deobfuscate(ast);
    return new Utmvc(ast);

  }

  static fromAst(ast) {

    Utmvc.deobfuscate(ast);
    return new Utmvc(ast);

  }

  static deobfuscate(ast) {

    ast = decodeEval(ast);
    [
      replacePropertyHexLiterals,
      clearConcealedStringsSession,
      reverseControlFlowCases,
      replaceInliningFunctions,
      replaceObtuseBinaryExpressions,
      replaceStaticValues,
      renameBrowserProperties,
      findUtmcvProperties,
      /*
      */
    ].map((t) => t(ast));


  }

  createPayload(data){

    const payload = new Array();

    Object.keys(data).forEach((key)=>{
      payload.push(`${key}=${encodeURIComponent(data[key])}`);
    });

    return payload.join(`,`);
  }

  getIncapFromCookie(cookie){

    const incaps = [];

    const regex = new RegExp(`^\\s?incap_ses_`);

    const cookieParts = cookie.split(`;`);

    for (var i = 0; i < cookieParts[`length`]; i++) {
      const cookieIndexOf = cookieParts[i][`substr`](0x0, cookieParts[i][`indexOf`](`=`));

      const value = cookieParts[i][`substr`](cookieParts[i][`indexOf`](`=`) + 1, cookieParts[i][`length`]);

      if (regex[`test`](cookieIndexOf)) {
        incaps.push(value);
      }
    }

    return incaps;
  }

  encodeUtmvcData(data, cookiesString){

    const incaps = this.getIncapFromCookie(cookiesString);

    return this.ast.program.sandbox.utmvcEncoder(data, incaps);
  }

  createPayloadUrl({payloadUrl}){
    const { origin } = new URL(payloadUrl);
    return `${origin}${this.ast.program.sandbox[`urls`][`timestamp`]}${Math.random()}`;
  }


}


module.exports = Utmvc;
