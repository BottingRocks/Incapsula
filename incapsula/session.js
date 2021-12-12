

const Captcha = require(`2captcha`);
const fetchCookie = require(`fetch-cookie`);
const fs = require(`fs`);
const HttpsProxyAgent = require(`https-proxy-agent`);
const nodeFetch = require(`node-fetch`);
const parseUrl = require(`url`).parse;
const path = require(`path`);
const Reese84 = require(`./reese84/reese84.js`);
const Utmvc = require(`./utmvc/utmvc.js`);

const DEFAULT_REESE84_PAYLOAD = require(`../incapsula/payloads/reese84.js`);
const DEFAULT_UTMVC_PAYLOAD = require(`../incapsula/payloads/utmvc.js`);

const inquirer = require(`inquirer`);

const SAVE_ASTS = process.env.SAVE_ASTS || false;


class IncapsulaSession {
  //To run this make sure to pass the --insecure-http-parser flag see:https://github.com/nodejs/node/issues/27711

  constructor({ proxyUrl, userAgent, cookieJar, _2captchaKey, askForCaptcha } = {}) {

    this.agent = proxyUrl !== undefined ? new HttpsProxyAgent(proxyUrl) : undefined;
    this.userAgent = userAgent === undefined ? `Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:93.0) Gecko/20100101 Firefox/93.0` : userAgent;

    this.defaultHeaders = {
      'user-agent' : this.userAgent,
      'accept' : `text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8`,
      'accept-language' : `en-US,en;q=0.5`,
      'accept-encoding' : `gzip, deflate, br`,
      'connection' : `keep-alive`,
      'pragma' : `no-cache`,
      'cache-control' : `no-cache`,
    };

    this.cookieJar = cookieJar || new fetchCookie.toughCookie.CookieJar();
    this.fetch = fetchCookie(nodeFetch, this.cookieJar, false);
    this.utmvc = null;
    this.reese84 = null;
    this.reese84Url = null;
    this.reese84Token = null;
    this._2captchaKey = _2captchaKey;
    this.askForCaptcha = askForCaptcha || false;

    this.captchaSolver = new Captcha.Solver(_2captchaKey);
  }

  async go({ url, reese84, utmvc } = {}) {

    utmvc = utmvc || DEFAULT_UTMVC_PAYLOAD;
    reese84 = reese84 || DEFAULT_REESE84_PAYLOAD;

    try{

      let mainPage = await this.fetch(url, { headers : this.defaultHeaders, agent : this.agent});
      let body = await mainPage.text();
      SAVE_ASTS && this.saveFile(`main.html`, body);

      const modeType = this.getModeType(body);
      const options = { utmvc, reese84 };
      //console.log(`mode type:${modeType}`);
      switch(modeType){
        case `iframe+reese84`:
        case `iframe+reese84+utmvc+captcha`:
          const iframeUrl = `${new URL(url).origin}${this.parseIframeUrl(body)}`;
          const iframePage = await this.fetch(iframeUrl, { headers : this.defaultHeaders, agent : this.agent});
          const iframeBody = await iframePage.text();

          if(modeType === `iframe+reese84`){
            await this.doReese84Mode({url : iframePage.url, body : iframeBody, options});
          }else if(modeType === `iframe+reese84+utmvc+captcha`){
            await this.doNonCaptchaMode({url : mainPage.url, body, options});
            await this.findAndSolveCaptcha(iframePage.url);
          }
          break;

        case `reese84+utmvc`:
          await this.doNonCaptchaMode({url : mainPage.url, body, options});
          break;
      }

      return { success : true, error : null, cookies : this.getCookies(url)};
    }catch(e){
      return { success : false, error : e, cookies : ``};
    }

  }

  async setUtmvcCookie({payloadUrl , data}){

    const res = await this.fetch(payloadUrl, {headers : this.defaultHeaders, agent : this.agent});
    const body = await res.text();

    SAVE_ASTS && this.saveFile(`utmvc.js`, body);

    const utmvc = Utmvc.fromString(body);

    if(this.utmvc === null){
      this.utmvc = utmvc;
    }

    const payload = this.utmvc.createPayload(data);
    const utmvcEncodedCookie = this.utmvc.encodeUtmvcData(payload, this.cookieJar.getCookieStringSync(payloadUrl));

    this.setCookies(`___utmvc=${utmvcEncodedCookie}`, payloadUrl);

    await this.fetch(payloadUrl, {headers : this.defaultHeaders, agent : this.agent});

  }

  async doReese84Mode({url, body, options}){

    const { reese84 } = options;
    const reese84Url = this.findReese84Url( url, body );

    if(reese84Url){
      await this.setReese84(reese84Url);
      await this.postReese84CreateRequest({ payloadUrl : reese84Url, data : reese84, setCookie : true});
      await this.postReese84UpdateRequest(this.reese84Token);
    }

  }

  async doNonCaptchaMode({url, body, options}){

    const { utmvc, reese84 } = options;

    const { utmvcUrl, reese84Url } = this.findReese84AndUtmvcUrls(url, body);

    if(utmvcUrl !== undefined){
      await this.setUtmvcCookie({payloadUrl : utmvcUrl , data : utmvc});
    }

    if(reese84Url !== undefined){
      await this.setReese84(reese84Url);
      await this.postReese84CreateRequest({ payloadUrl : reese84Url, data : reese84, setCookie : true});
      await this.postReese84UpdateRequest(this.reese84Token);
    }

  }

  async setReese84(reese84Url){
    if(reese84Url !== undefined){
      const reese84Page = await this.fetch(reese84Url, { headers : this.defaultHeaders, agent : this.agent });
      const reese84PageBody = await reese84Page.text();

      SAVE_ASTS && this.saveFile(`reese84.js`, reese84PageBody);

      if (this.reese84 === null) {
        const reese84 = Reese84.fromString(reese84PageBody);
        this.reese84 = reese84;
      }

    }
  }

  async postReese84CreateRequest({ payloadUrl, data}) {

    const payload = this.reese84.createPayload(data);

    const reese84Res = await this.fetch(payloadUrl, {
      headers : this.defaultHeaders,
      agent : this.agent,
      method : `POST`,
      body : JSON.stringify(payload)
    });

    const body = await reese84Res.text();
    const parsed = JSON.parse(body);

    this.reese84Token = parsed[`token`];
    this.reese84Url = payloadUrl;

    this.setCookies(`reese84=${this.reese84Token}`, payloadUrl);

  }

  async postReese84UpdateRequest(oldToken){

    if (oldToken === undefined) {
      oldToken = this.reese84Token;
    }

    const reese84Res = await this.fetch(this.reese84Url, {
      headers : this.defaultHeaders,
      agent : this.agent,
      method : `POST`,
      body : `"${oldToken}"`,
    });

    const body = await reese84Res.text();
    const parsed = JSON.parse(body);

    this.reese84Token = parsed[`token`];

    this.setCookies(`reese84=${this.reese84Token}`, this.reese84Url);

  }

  async findAndSolveCaptcha( url) {
    const res = await this.fetch(url, { headers : this.defaultHeaders, agent : this.agent });
    const body = await res.text();

    const hasRecaptchaCallbackUrl = body.match(/xhr\.open\("POST", "(.*?)(?=")/);

    if (!hasRecaptchaCallbackUrl) {
      throw Error(`Cannot find RecaptchaCallbackUrl`);
    }

    const hasRecaptchaKey = body.match(/\<div class\="g-recaptcha" data-sitekey\="(.*?)(?=")/);

    if (!hasRecaptchaKey) {
      throw Error(`Cannot find RecaptchaKey`);
    }

    const parsedUrl = new URL(url);
    const recaptchaCallbackUrl = `${parsedUrl.origin}${hasRecaptchaCallbackUrl[1]}`;

    let gCaptchaResponse = null;

    if(this.askForCaptcha){

      const answers = await inquirer.prompt([
        {
          type : `input`,
          name : `gCaptchaResponse`,
          message : `What's your gcaptcharesponse`,
        }
      ]);

      gCaptchaResponse = answers.gCaptchaResponse;

    }else{

      const recaptchaKey = hasRecaptchaKey[1];

      const captchaOptions = {};

      if(this.agent !== undefined){
        const proxy = `${this.agent.proxy.auth === null ? `` : this.agent.proxy.auth}${this.agent.proxy.host}:${this.agent.proxy.port}`;
        captchaOptions[`proxytype`] = `HTTP`;
        captchaOptions[`proxy`] = proxy;
        captchaOptions[`cookies`] = this.getCookies(url).split(`;`);
      }

      gCaptchaResponse = await this.captchaSolver.recaptcha(recaptchaKey, recaptchaCallbackUrl, {...captchaOptions});
      //gCaptchaResponse = "";
    }

    const submitRes = await this.fetch(recaptchaCallbackUrl, {
      headers : {
        ...this.defaultHeaders,
        "content-type" : `application/x-www-form-urlencoded`,
        "origin" : parsedUrl.origin,
        "referer" : url,
        "accept" : `*/*`
      },
      method : `POST`,
      agent : this.agent,
      body : `g-recaptcha-response=${gCaptchaResponse}`
    });

    const captchaBodyResponse = await submitRes.text();
    SAVE_ASTS && this.saveFile(`captcharesponse.html`, captchaBodyResponse);


  }

  parseIframeUrl(html){

    const incapUrl = html.match(/\<iframe id\="main-iframe" src\="(.*?)(?=")/);

    if(!incapUrl){
      throw Error(`Could not parse iframe url:${html}`);
    }

    return incapUrl[1];
  }

  getModeType(html){

    const findIframe = `<iframe id="main-iframe"`;
    const hasIframe = html.indexOf(findIframe) !== -1;

    if(hasIframe){

      const iframeQuery = this.parseIframeUrl(html);

      if(iframeQuery){
        const typeNumber = iframeQuery.split(`&`)[0].split(`=`)[1];

        switch(typeNumber){
          case `42`:
            return `iframe+reese84`;
          case `31`:
            return `iframe+reese84+utmvc+captcha`;
        }
      }
    }

    return `reese84+utmvc`;
  }

  findUtmvcUrl( url, body ) {

    const incapUrl = body.match(/(?!:src\=")\/_Incapsula_Resource\?(.*?)(?=")/);

    if (incapUrl && incapUrl[1].indexOf(`xinfo=`) === -1){
      const parsedUrl = new URL(url);
      return `${parsedUrl.origin}${incapUrl[0]}`;
    }

    return false;

  }

  findReese84Url( url, body ) {

    const incapUrl = body.match(/[script|src] src\="(.*?)(?=" [async|async defer])/);
    if (incapUrl) {
      const parsedUrl = new URL(url);
      return `${parsedUrl.origin}${incapUrl[1]}?d=${parsedUrl.host}`;
      //return `${parsedUrl.origin}${incapUrl[1]}`;
    }

    return false;

  }

  findCaptchaUrl(url, body ) {

    const incapUrl = body.match(/\xhr.open\("POST", "(.*?)(?=")/);

    if (incapUrl) {
      const parsedUrl = new URL(url);
      return `${parsedUrl.origin}${incapUrl[1]}`;
    }

    return false;

  }

  findReese84AndUtmvcUrls(url, body){

    const urls = {
      "utmvcUrl" : undefined,
      "reese84Url" : undefined
    };

    const hasUtmvcUrl = this.findUtmvcUrl( url, body );

    if (hasUtmvcUrl) {
      urls[`utmvcUrl`] = hasUtmvcUrl;
    }

    const hasReese84Url = this.findReese84Url( url, body );

    if (hasReese84Url) {
      urls[`reese84Url`] = hasReese84Url;
    }

    return urls;
  }

  getCookies(url) {
    return this.cookieJar.getCookieStringSync(url);
  }

  setCookies(value, url) {
    this.cookieJar.setCookieSync(`${value}`, url);
  }

  saveFile(savePath, source) {
    const rawSrcPath = path.join(SAVE_ASTS, `${savePath}`);

    !fs.existsSync(path.join(SAVE_ASTS)) && fs.mkdirSync(path.join(SAVE_ASTS), parseInt(`0744`, 8));

    fs.writeFileSync(rawSrcPath, source);
  }
}


module.exports = IncapsulaSession;
