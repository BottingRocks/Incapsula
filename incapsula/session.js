

const fs = require("fs");
const path = require("path");
const fetchCookie = require(`fetch-cookie`);
const HttpsProxyAgent = require(`https-proxy-agent`);
const nodeFetch = require(`node-fetch`);
const Reese84 = require(`./reese84/reese84.js`);
const Utmvc = require(`./utmvc/utmvc.js`);
const Captcha = require("2captcha");

const DEFAULT_REESE84_PAYLOAD = require(`../incapsula/payloads/reese84.js`);
const DEFAULT_UTMVC_PAYLOAD = require(`../incapsula/payloads/utmvc.js`);

const SAVE_ASTS = process.env.SAVE_ASTS || false;

class IncapsulaSession {
  //To run this make sure to pass the --insecure-http-parser flag see:https://github.com/nodejs/node/issues/27711

  constructor({ proxyUrl, userAgent, cookieJar, _2captchaKey } = {}) {

    this.agent = proxyUrl !== undefined ? new HttpsProxyAgent(proxyUrl) : undefined;
    this.userAgent = userAgent === undefined ? `Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:93.0) Gecko/20100101 Firefox/93.0` : userAgent;

    this.defaultHeaders = {
      "user-agent": this.userAgent,
      "cache-control": `no-cache`,
      "kept-alive" : "Yes",
    };

    this.cookieJar = cookieJar || new fetchCookie.toughCookie.CookieJar();
    this.fetch = fetchCookie(nodeFetch, this.cookieJar, false);
    this.utmvc = null;
    this.reese84 = null;
    this.reese84Url = null;
    this.reese84Token = null;
    this._2captchaKey = _2captchaKey;

    this.captchaSolver = new Captcha.Solver(_2captchaKey);
  }

  async go({ url, reese84, utmvc } = {}) {

    utmvc = utmvc || DEFAULT_UTMVC_PAYLOAD;
    reese84 = reese84 || DEFAULT_REESE84_PAYLOAD;

    let mainPage = await this.fetch(url, { headers: this.defaultHeaders, agent: this.agent});
    let body = await mainPage.text();

    SAVE_ASTS && this.saveFile(`main.html`, body);

    const modeType = this.getModeType({body});
    const options = { utmvc, reese84 };

    if(modeType === "captcha"){
      await this.doCaptchaMode({url : mainPage.url, body, options});
    }else{
      await this.doNonCaptchaMode({url : mainPage.url, body, options});
    }

  }

  async setUtmvcCookie({payloadUrl , data}){

    const res = await this.fetch(payloadUrl, {headers : this.defaultHeaders, agent : this.agent});
    const body = await res.text();

    SAVE_ASTS && this.saveFile(`utmvc.js`, body)

    const utmvc = Utmvc.fromString(body);

    if(this.utmvc === null){
      this.utmvc = utmvc;
    }

    const payload = this.utmvc.createPayload(data);
    const utmvcEncodedCookie = this.utmvc.encodeUtmvcData(payload, this.cookieJar.getCookieStringSync(payloadUrl));

    this.setCookies(`___utmvc=${utmvcEncodedCookie}`, payloadUrl);

    await this.fetch(payloadUrl, {headers : this.defaultHeaders, agent : this.agent});

  }

  async doNonCaptchaMode({url, options}){

    const { utmvc, reese84 } = options;

    const refreshPage = await this.fetch(url, {
      headers: this.defaultHeaders,
      agent: this.agent,
    });

    const refreshPageBody = await refreshPage.text();
    const { utmvcUrl, reese84Url } = this.findReese84AndUtmvcUrls({url, body : refreshPageBody});

    if(utmvcUrl !== undefined){
      await this.setUtmvcCookie({payloadUrl : utmvcUrl , data : utmvc});
    }

    if(reese84Url !== undefined){
      await this.setReese84({reese84Url});
      await this.postReese84CreateRequest({ payloadUrl : reese84Url, data : reese84, setCookie : true});
      await this.postReese84UpdateRequest({oldToken : this.reese84Token});
    }

  }

  async doCaptchaMode({url, options}){

    const { utmvc, reese84 } = options;

    const refreshPage = await this.fetch(url, { headers: this.defaultHeaders, agent: this.agent});
    const refreshPageBody = await refreshPage.text();

    SAVE_ASTS && this.saveFile(`captcha.html`, refreshPageBody);

    const { utmvcUrl, reese84Url } = this.findReese84AndUtmvcUrls({url, body : refreshPageBody});

    if(utmvcUrl !== undefined){
      await this.setUtmvcCookie({payloadUrl : utmvcUrl , data : utmvc});
    }

    if(reese84Url !== undefined){

      await this.setReese84({reese84Url});
      await this.postReese84CreateRequest({ payloadUrl : reese84Url, data : reese84, setCookie : true});
      await this.postReese84UpdateRequest({oldToken : this.reese84Token});
    }

    const captchaUrl = this.findCaptchaUrl({url, body : refreshPageBody});

    if(!captchaUrl){
      throw Error(`Cannot find captcha url in body:${refreshPageBody}`)
    }


    await this.findAndSolveCaptcha({url : captchaUrl});

  }

  async setReese84({reese84Url}){
    if(reese84Url !== undefined){
      const reese84Page = await this.fetch(reese84Url, { headers: this.defaultHeaders, agent: this.agent });
      const reese84PageBody = await reese84Page.text();

      SAVE_ASTS && this.saveFile(`reese84.js`, reese84PageBody);

      if (this.reese84 === null) {
        const reese84 = Reese84.fromString(reese84PageBody);
        this.reese84 = reese84;
      }

    }
  }

  async postReese84CreateRequest({ payloadUrl, data, setCookie = false}) {

    const payload = this.reese84.encode(data);

    const reese84Res = await this.fetch(payloadUrl, {
      headers: this.defaultHeaders,
      agent: this.agent,
      method: `POST`,
      body: JSON.stringify(payload)
    });

    const body = await reese84Res.text();
    const parsed = JSON.parse(body);


    this.reese84Token = parsed['token'];
    this.reese84Url = payloadUrl;

    this.setCookies(`reese84=${this.reese84Token}`, payloadUrl);

  }

  async postReese84UpdateRequest({oldToken}){

    if (oldToken === undefined) {
      oldToken = this.reese84Token;
    }

    const reese84Res = await this.fetch(this.reese84Url, {
      headers: this.defaultHeaders,
      agent: this.agent,
      method: `POST`,
      body: `"${oldToken}"`,
    });

    const body = await reese84Res.text();
    console.log(`wtf update from reese`, body)
    const parsed = JSON.parse(body);

    this.reese84Token = parsed['token'];

    this.setCookies(`reese84=${this.reese84Token}`, this.reese84Url);

  }

  async findAndSolveCaptcha({ url }) {

    const res = await this.fetch(url, { headers: this.defaultHeaders, agent: this.agent });
    const body = await res.text();

    const hasRecaptchaCallbackUrl = body.match(/xhr\.open\("POST", "(.*?)(?=")/)

    if (!hasRecaptchaCallbackUrl) {
      throw Error("Cannot find RecaptchaCallbackUrl")
    }

    const hasRecaptchaKey = body.match(/\<div class\="g-recaptcha" data-sitekey\="(.*?)(?=")/)

    if (!hasRecaptchaKey) {
      throw Error("Cannot find RecaptchaKey")
    }

    const parsedUrl = new URL(url);
    const recaptchaCallbackUrl = `${parsedUrl.origin}${hasRecaptchaCallbackUrl[1]}`;
    const recaptchaKey = hasRecaptchaKey[1];

    const captchaOptions = {}

    if(this.agent !== undefined){
      const proxy = `${this.agent.proxy.auth === null ? "" : this.agent.proxy.auth}${this.agent.proxy.host}:${this.agent.proxy.port}`;
      captchaOptions['proxytype'] = "HTTP"
      captchaOptions['proxy'] = proxy
    }

    const gCaptchaResponse = await this.captchaSolver.recaptcha(recaptchaKey, recaptchaCallbackUrl, {...captchaOptions});

    const submitRes = await this.fetch(recaptchaCallbackUrl, {
      headers: {
        ...this.defaultHeaders,
        "content-type": "application/x-www-form-urlencoded",
        "origin" : parsedUrl.origin,
        "referer" : url,
        "accept": "*/*"
      },
      method: "POST",
      agent: this.agent,
      body: `g-recaptcha-response=${gCaptchaResponse.data}`
    });

    await submitRes.text();


  }

  findUtmvcUrl({ url, body }) {

    const incapUrl = body.match(/(?!:src\=")\/_Incapsula_Resource\?(.*?)(?=")/);

    if (incapUrl && incapUrl[1].indexOf("xinfo=") === -1){
      const parsedUrl = new URL(url);
      return `${parsedUrl.origin}${incapUrl[0]}`;
    }

    return false;

  }

  findReese84Url({ url, body }) {

    const incapUrl = body.match(/script src\="(.*?)" async\>\<\/script\>/);

    if (incapUrl) {
      const parsedUrl = new URL(url);
      return `${parsedUrl.origin}${incapUrl[1]}?d=${parsedUrl.host}`;
    }

    return false;

  }

  findCaptchaUrl({ url, body }) {

    const incapUrl = body.match(/\<iframe id\="main-iframe" src\="(.*?)(?=")/);

    if (incapUrl) {
      const parsedUrl = new URL(url);
      return `${parsedUrl.origin}${incapUrl[1]}`;
    }

    return false;

  }

  getModeType({body}){

    const findIframe = `<iframe id="main-iframe"`;
    return body.indexOf(findIframe) !== -1 ? "captcha" : "noncaptcha";
  }

  findReese84AndUtmvcUrls({url, body}){

    const urls = {
      "utmvcUrl" : undefined,
      "reese84Url" : undefined
    };

    const hasUtmvcUrl = this.findUtmvcUrl({ url, body });

    if (hasUtmvcUrl) {
      urls['utmvcUrl'] = hasUtmvcUrl;
    }

    const hasReese84Url = this.findReese84Url({ url, body });

    if (hasReese84Url) {
      urls['reese84Url'] = hasReese84Url;
    }

    return urls
  }

  getCookies(url) {
    return this.cookieJar.getCookieStringSync(url);
  }

  setCookies(value, url) {
    this.cookieJar.setCookieSync(`${value}`, url);
  }

  saveFile(savePath, source) {
    const rawSrcPath = path.join(SAVE_ASTS, `${savePath}`);

    !fs.existsSync(path.join(SAVE_ASTS)) && fs.mkdirSync(path.join(SAVE_ASTS), parseInt("0744", 8));

    fs.writeFileSync(rawSrcPath, source);
  }
}


module.exports = IncapsulaSession;
