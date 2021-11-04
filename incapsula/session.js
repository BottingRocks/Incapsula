

const fs = require("fs");
const path = require("path");
const fetchCookie = require(`fetch-cookie`);
const HttpsProxyAgent = require(`https-proxy-agent`);
const nodeFetch = require(`node-fetch`);
const Reese84 = require(`./reese84/reese84.js`);
const Utmvc = require(`./utmvc/utmvc.js`);

const DEFAULT_REESE84_PAYLOAD = require(`../incapsula/payloads/reese84.js`);
const DEFAULT_UTMVC_PAYLOAD = require(`../incapsula/payloads/utmvc.js`);
const { fromString } = require(`./ast.js`);

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

    console.log(`defaultHeaders`, this.defaultHeaders, userAgent, this.userAgent, this.agent)

    this.cookieJar = cookieJar || new fetchCookie.toughCookie.CookieJar();
    this.fetch = fetchCookie(nodeFetch, this.cookieJar, false);
    this.utmvc = null;
    this.reese84 = null;
    this.reese84Url = null;
    this.reese84Token = null;
    this._2captchaKey = _2captchaKey;
  }


  saveFile(savePath, source) {
    const rawSrcPath = path.join(SAVE_ASTS, `${savePath}`);

    !fs.existsSync(path.join(SAVE_ASTS)) && fs.mkdirSync(path.join(SAVE_ASTS), parseInt("0744", 8));

    fs.writeFileSync(rawSrcPath, source);
  }


  async go({ url, reese84, utmvc } = {}) {

    utmvc = utmvc || DEFAULT_UTMVC_PAYLOAD;
    reese84 = reese84 || DEFAULT_REESE84_PAYLOAD;

    let mainPage = await this.fetch(url, { headers: this.defaultHeaders, agent: this.agent});
    let body = await mainPage.text();

    SAVE_ASTS && this.saveFile(`main.html`, body);

    const modeType = this.getModeType({body});
    const options = { utmvc, reese84 };

    console.log(`mainPage url`, mainPage.url, "original url", url)

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

    console.log(`payload data`, data);
    const payload = this.utmvc.createPayload(data);
    console.log(`payload `, payload)
    const utmvcEncodedCookie = this.utmvc.encodeUtmvcData(payload, this.cookieJar.getCookieStringSync(payloadUrl));

    this.setCookies(`___utmvc=${utmvcEncodedCookie}`, payloadUrl);

    await this.fetch(payloadUrl, {headers : this.defaultHeaders, agent : this.agent});

  }

  async doNonCaptchaMode({url, body, options}){

    const { utmvc, reese84 } = options;

    const { utmvcUrl, reese84Url } = this.findReese84AndUtmvcUrls({url, body});

    console.log(`utmvcUrl`, utmvcUrl, `\nreese84Url`, reese84Url)
    if(utmvcUrl !== undefined){
      await this.setUtmvcCookie({payloadUrl : utmvcUrl , data : utmvc});

    }

    if(reese84Url !== undefined){

      await this.setReese84({reese84Url});
      console.log(`doing reese84`);
      await this.postReese84CreateRequest({ payloadUrl : reese84Url, data : reese84, setCookie : true});
      await this.postReese84UpdateRequest({oldToken : this.reese84Token});
    }

  }

  async doCaptchaMode({url, body, options}){

    const { utmvc, reese84 } = options;

    const refreshPage = await this.fetch(url, { headers: this.defaultHeaders, agent: this.agent});
    const refreshPageBody = await refreshPage.text();

    SAVE_ASTS && this.saveFile(`captcha.html`, refreshPageBody);

    const { utmvcUrl, reese84Url } = this.findReese84AndUtmvcUrls({url, body : refreshPageBody});

    const captchaUrl = this.findCaptchaUrl({url, body : refreshPageBody});

    if(!captchaUrl){
      throw Error(`Cannot find captcha url in body:${refreshPageBody}`)
    }

    await this.findAndSolveCaptcha({url : captchaUrl});

    await this.setReese84({reese84Url});
    console.log(`******doing captcha mode bitches*****`)
    if(reese84Url !== undefined){
      await this.postReese84CreateRequest({ payloadUrl : reese84Url, data : reese84, setCookie : true});
      await this.postReese84UpdateRequest({oldToken : this.reese84Token});
    }


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


  findUtmvcUrl({ url, body }) {

    const incapUrl = body.match(/\/_Incapsula_Resource\?(.*?)(?=")/);

    if (incapUrl) {
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


  async postReese84CreateRequest({ payloadUrl, data, setCookie = false}) {

    const payload = this.reese84.encode(data);

    console.log(`payload url in reese84`, payloadUrl)
    console.log(`\n\n`)
    console.log(`\n\n`)


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
    //const recaptchaCallbackUrl = url;
    const recaptchaKey = hasRecaptchaKey[1];

    const gCaptchaResponse = await this.solveCaptcha({ recaptchaKey, recaptchaCallbackUrl, _2captchaKey: this._2captchaKey });

    const submitRes = await this.fetch(recaptchaCallbackUrl, {
      headers: {
        ...this.defaultHeaders,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "*/*"
      },
      method: "POST",
      agent: this.agent,
      body: `g-recaptcha-response=${gCaptchaResponse}`
    });

    const submitResBody = await submitRes.text();
    console.log(`gCaptchaResponse:${gCaptchaResponse}`)
    console.log(submitRes);

    const refreshPage = await this.fetch(`https://driverpracticaltest.dvsa.gov.uk/`, {
      headers: {
        ...this.defaultHeaders,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "*/*"
      },
      agent: this.agent,
    });
    console.log(`refresh page \n\n`, await refreshPage.text());


  }

  async solveCaptcha({ recaptchaKey, recaptchaCallbackUrl, _2captchaKey }) {

    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    const proxy = this.agent !== undefined ? `${this.agent.proxy.auth}:${this.agent.proxy.host}:${this.agent.proxy.port}` : "";
    const proxyUrl = this.agent !== undefined ? `&proxy=${encodeURIComponent(proxy)}&proxyType=HTTP` : '';
    const submitCaptchaJobUrl = `https://2captcha.com/in.php?key=${_2captchaKey}&method=userrecaptcha&googlekey=${recaptchaKey}&pageurl=${encodeURIComponent(recaptchaCallbackUrl)}${proxyUrl}`;

    let status = null;
    let captchaId = null;

    while (status !== "done") {

      let res, body;

      if (status === null) {

        res = await this.fetch(submitCaptchaJobUrl, {
          headers: this.defaultHeaders,
          agent: this.agent,
        });
        body = await res.text();
      } else if (status === "started") {
        const getCaptchaJobUrl = `https://2captcha.com/res.php?key=${_2captchaKey}&action=get&id=${captchaId}`;
        res = await this.fetch(getCaptchaJobUrl, { headers: this.defaultHeaders, agent: this.agent });
        body = await res.text();

      }

      if (body === "CAPTCHA_NOT_READY") {
        console.log("CAPTCHA_NOT_READY")
        await delay(3000);
        continue;
      }

      if (body.split("|")[0] === "OK" && status === "started") {

        return body.split("|")[1];

      } else if (body.split("|")[0] === "OK" && status === null) {

        status = "started";
        captchaId = body.split("|")[1];
        console.log(`captchaId:${captchaId}`)
        await delay(3000);
        continue;
      }

      await delay(3000);

    }


  }

  getCookies(url) {
    return this.cookieJar.getCookieStringSync(url);
  }

  setCookies(value, url) {
    this.cookieJar.setCookieSync(`${value}`, url);
  }

}


module.exports = IncapsulaSession;
