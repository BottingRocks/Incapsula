

const Captcha = require(`2captcha`);
const fetchCookie = require(`fetch-cookie`);
const fs = require(`fs`);
const parseUrl = require('url').parse;
const HttpsProxyAgent = require(`https-proxy-agent`);
const nodeFetch = require(`node-fetch`);
const path = require(`path`);
const Reese84 = require(`./reese84/reese84.js`);
const Utmvc = require(`./utmvc/utmvc.js`);

const DEFAULT_REESE84_PAYLOAD = require(`../incapsula/payloads/reese84.js`);
const DEFAULT_UTMVC_PAYLOAD = require(`../incapsula/payloads/utmvc.js`);

const SAVE_ASTS = process.env.SAVE_ASTS || false;

const inquirer = require('inquirer');



class IncapsulaSession {
  //To run this make sure to pass the --insecure-http-parser flag see:https://github.com/nodejs/node/issues/27711

  constructor({ proxyUrl, userAgent, cookieJar, _2captchaKey } = {}) {

    this.agent = proxyUrl !== undefined ? new HttpsProxyAgent(proxyUrl) : undefined;
    this.userAgent = userAgent === undefined ? `Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:93.0) Gecko/20100101 Firefox/93.0` : userAgent;

    this.defaultHeaders = {
      'User-Agent' : this.userAgent,
      'Accept' : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language' : 'en-US,en;q=0.5',
      'Accept-Encoding' : 'gzip, deflate, br',
      'Connection' : 'keep-alive',
      'Upgrade-Insecure-Requests' : '1',
      'Sec-Fetch-Dest' : 'document',
      'Sec-Fetch-Mode' : 'navigate',
      'Sec-Fetch-Site' : 'none',
      'Sec-Fetch-User' : '?1',
      'Pragma' : 'no-cache',
      'Cache-Control' : 'no-cache',
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

    let mainPage = await this.fetch(url, { headers : this.defaultHeaders, agent : this.agent});
    let body = await mainPage.text();

    let iframePage, iframeBody;

    SAVE_ASTS && this.saveFile(`main.html`, body);

    const modeType = this.getModeType(body);
    const options = { utmvc, reese84 };

    switch(modeType){
      case "iframe+reese84":
        iframePage = await this.fetch(this.parseIframeUrl(url, body), { headers : this.defaultHeaders, agent : this.agent});
        iframeBody = await iframePage.text();
        await this.doReese84Mode({url : iframePage.url, body: iframeBody, options});
        break;
      case "iframe+reese84+utmvc+captcha":
        iframePage = await this.fetch(this.parseIframeUrl(url, body), { headers : this.defaultHeaders, agent : this.agent});
        iframeBody = await iframePage.text();
        await this.doCaptchaMode({url : iframePage.url, body: iframeBody, options});
        break;
      case "reese84+utmvc":
        await this.doNonCaptchaMode({url : mainPage.url, body, options});
        break;
    }

  }

  parseIframeUrl(url, html){

    const incapUrl = html.match(/\<iframe id\="main-iframe" src\="(.*?)(?=")/);

    if(!incapUrl){
      throw Error(`Could not parse iframe url:${html}`)
    }
    const parsedUrl = new URL(url);

    return `${parsedUrl.origin}${incapUrl[1]}`;
  }

  getModeType(html){

    const findIframe = `<iframe id="main-iframe"`;
    const hasIframe = html.indexOf(findIframe) !== -1;

    if(hasIframe){

      const findUrl = html.match(/main-iframe" src="(.*?)(?:")/);

      if(findUrl){
        const typeNumber = findUrl[1].split("&")[0].split("=")[1];

        switch(typeNumber){
          case "42":
            return "iframe+reese84";
          case "31":
            return "iframe+reese84+utmvc+captcha";
        }
      }
    }

    return "reese84+utmvc";
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
    const reese84Url = this.findReese84Url({ url, body });

    if(reese84Url){
      await this.setReese84({reese84Url});
      await this.postReese84CreateRequest({ payloadUrl : reese84Url, data : reese84, setCookie : true});
      await this.postReese84UpdateRequest({oldToken : this.reese84Token});
    }

  }
  async doNonCaptchaMode({url, body, options}){

    const { utmvc, reese84 } = options;

    const { utmvcUrl, reese84Url } = this.findReese84AndUtmvcUrls({url, body});

    if(utmvcUrl !== undefined){
      await this.setUtmvcCookie({payloadUrl : utmvcUrl , data : utmvc});
    }

    if(reese84Url !== undefined){
      await this.setReese84({reese84Url});
      await this.postReese84CreateRequest({ payloadUrl : reese84Url, data : reese84, setCookie : true});
      await this.postReese84UpdateRequest({oldToken : this.reese84Token});
    }

  }

  async doCaptchaMode({url, body, options}){

    const { utmvc, reese84 } = options;

    SAVE_ASTS && this.saveFile(`captcha.html`, body);

    const { utmvcUrl, reese84Url } = this.findReese84AndUtmvcUrls({url, body});

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
      throw Error(`Cannot find captcha url in body:${refreshPageBody}`);
    }


    await this.findAndSolveCaptcha({url : captchaUrl});

  }

  async setReese84({reese84Url}){
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

  async postReese84CreateRequest({ payloadUrl, data, setCookie = false}) {

    const payload = this.reese84.encode(data);

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

  async postReese84UpdateRequest({oldToken}){

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

  async findAndSolveCaptcha({ url }) {

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
    const recaptchaKey = hasRecaptchaKey[1];

    const captchaOptions = {};

    if(this.agent !== undefined){
      const proxy = `${this.agent.proxy.auth === null ? `` : this.agent.proxy.auth}${this.agent.proxy.host}:${this.agent.proxy.port}`;
      captchaOptions[`proxytype`] = `HTTP`;
      captchaOptions[`proxy`] = proxy;
      captchaOptions[`cookies`] = this.getCookies(url).split(";")
    }

    //const gCaptchaResponse = await this.captchaSolver.recaptcha(recaptchaKey, recaptchaCallbackUrl, {...captchaOptions});
    //const gCaptchaResponse = await this.captchaSolver.recaptcha(recaptchaKey, recaptchaCallbackUrl, {...captchaOptions});

    const gCaptchaResponse = {data :'03AGdBq25hoCmO-v17XY7nhKE1Vgmp-AnHY9OpCbmDeqiQhCXUnIUxtCQSjydm6-DXMP_PDNF1ZJAhM5qeqFoPFc9uzSkBbiDkNy7NrIKp7dw2tAJ1EF3WddIPZHP8BAsG8Xoe4mHqNpf3TehuyxPxaqDrdasOc_gTKJIvSo0sZYBsMN7EKnS7yRFxEyylbEyWeC1pVvk0OP7dA8nVTOQvF2TM0Wtv5IW-qItGpamITzQ2zaJLvF_jtDtOWPE4oiqbFJAIL6ofCPLG8uE01G_60l7krivvA8fxyG-sK7xcET1QiTaHzpBEbPThwQ7j_i4ufkqnihK8EyjjwsO4uwokjzE5MPPULxrd7bCg0UxFKcmJEvxVbXHfj5m2JPkF2D20vLihPMm4O4YzR1_kFN11e7ZW4N7jOVbUfDdI-ex0MKZNXIUArZJ1Y0FL2FJ_A8vj3sqxjKlxhtxvaA_FvXfue4JW0v2NsHojlpUQCC9r--WqeD4Mg4isIndkgCIQ7nyCClgIZ1YribqHciXtkoonA6Hynu5YRfJFVEn4l5IGJRjbCXdNpNczKSXpu9Xu3sdp-Scprs_r1XJzJTEwwvOczFRk47NbcXm4lR-i3k-omlG8t7Mh_SzHchKlBKdskfTgB_dwz5kgbR-cMgNsTbY_Tf5SAE0ptUW9buGSML5X0i-L5j1t2zdyfSg8Ui_6xkwX3DgQGNJ8qXjzQj9S5OO6EyrIGKMCmuV5UPPm9r28xksrIX0ExK6tciFkhp6qYk04GbMr3KR_UW6efskXwWPJcrvF3bTVpdvXEmc76by_g8lOJnfejjUZ4hdplKVfJzOse8EqCETDlg5gT4gmsYmNh8DAaoTStuzSANo3F4kSoZ_iJdqn7o91d8H414HgfogLPQkFtFmv4s-_XVgoyTAv79_roaE5IY5lZIPaYhMZs73pi8ooPGTIOLOyAxwAAbmqtTiGiaazBY85HCziKht7blZju6xJpS_fItr0uKyKj_a_G9rT3SWtYD3RunDWe9_PdWBcqgv9WHNWVAADM14tuKgD-E3t-YAF3BXh-nm987J-2lfAmmmT9OZKJFfrVr1S1DRDqrCnZizNSuQdfdGCaISLoSRLsF4BAzhCSw_CYbHOqqPhElBkGgbt59KAOAc4pEe32EOGTpRGtKC-3cbvO6577Tj_yLtXf8rCWuHfSXNWt_onppIU1_VOJN0BF1vaGas2kJTlyJX_'};

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'gcaptcharesponse',
        message: "What's your gcaptcharesponse",
      }
    ]);


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
      body : `g-recaptcha-response=${answers.gcaptcharesponse}`
    });

    const captchaBodyResponse = await submitRes.text();
    SAVE_ASTS && this.saveFile(`captcharesponse.html`, captchaBodyResponse);


  }

  findUtmvcUrl({ url, body }) {

    const incapUrl = body.match(/(?!:src\=")\/_Incapsula_Resource\?(.*?)(?=")/);

    if (incapUrl && incapUrl[1].indexOf(`xinfo=`) === -1){
      const parsedUrl = new URL(url);
      return `${parsedUrl.origin}${incapUrl[0]}`;
    }

    return false;

  }

  findReese84Url({ url, body }) {

    const incapUrl = body.match(/src\="(.*?)" async(.*?)\>\<\/script\>/);

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

  findReese84AndUtmvcUrls({url, body}){

    const urls = {
      "utmvcUrl" : undefined,
      "reese84Url" : undefined
    };

    const hasUtmvcUrl = this.findUtmvcUrl({ url, body });

    if (hasUtmvcUrl) {
      urls[`utmvcUrl`] = hasUtmvcUrl;
    }

    const hasReese84Url = this.findReese84Url({ url, body });

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
