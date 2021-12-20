

const Captcha = require(`2captcha`);
const fetchCookie = require(`fetch-cookie`);
const fs = require(`fs`);
const cheerio = require(`cheerio`);
const HttpsProxyAgent = require(`https-proxy-agent`);
const nodeFetch = require(`node-fetch`);
const path = require(`path`);
const Reese84 = require(`./reese84/reese84.js`);
const Utmvc = require(`./utmvc/utmvc.js`);

const DEFAULT_REESE84_PAYLOAD = require(`../incapsula/payloads/reese84.js`);
const DEFAULT_UTMVC_PAYLOAD = require(`../incapsula/payloads/utmvc.js`);


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

  async go({url, utmvc, reese84, gCaptchaToken}){
    utmvc = utmvc || DEFAULT_UTMVC_PAYLOAD;
    reese84 = reese84 || DEFAULT_REESE84_PAYLOAD;

    try{

      const mainPage = await this.fetch(url, { headers : this.getHeaders('main'), agent : this.agent});
      const body = await mainPage.text();

      SAVE_ASTS && this.saveFile(`main.html`, body);

      await this.doFaviconMode(url);

      const incapsulaModes = this.parseIncapsulaScripts(url, body);

      let hasDoneReese84 = false, hasDoneUtmvc = false;

      if(incapsulaModes.iframe){

        const iframePage = await this.fetch(iframeUrl, {
          headers : this.defaultHeaders,
          agent : this.agent
        });
        const iframePageBody = await iframePage.text();
        const iframeModes = this.parseIncapsulaScripts(incapsulaModes.iframe.url, iframePageBody);

        switch(incapsulaModes.iframe.type){
          case 'Reese84 Only':

            iframeModes.reese84 && await doReese84Mode({
              url : iframeModes.reese84,
              payloadData : reese84
            });

            iframeModes.reese84 = false;
            break;

          case 'Captcha':
            await this.doCaptchaMode({url, gCaptchaToken});
            break;
          case 'Banned':
            throw Error(`Need to implement this iframe mode`)
            //To do: Implement captcha and banned state
        }

        iframeModes.utmvc && this.setUtmvc(iframeModes.utmvc, utmvc)

        hasDoneUtmvc = false;

        iframeModes.reese84 && await this.doReese84Mode({
          url : iframeModes.reese84,
          payloadData : reese84
        });

        hasDoneReese84 = false;

      }
      incapsulaModes.utmvc && !hasDoneUtmvc && await this.setUtmvc({
        url : incapsulaModes.utmvc,
        payloadData : utmvc
      });


      incapsulaModes.reese84 && !hasDoneReese84 && await this.doReese84Mode({
        url : incapsulaModes.reese84,
        payloadData : reese84
      });

      const mainPageRefresh = await this.fetch(url, {
        headers : this.getHeaders('main'),
        agent : this.agent
      });

      const mainPageRefreshBody = await mainPageRefresh.text();

      SAVE_ASTS && this.saveFile(`main-refresh.html`, mainPageRefreshBody);

      if([403, 400, 401].includes(mainPageRefresh.status)){
        return { success : false, error : mainPageRefreshBody, cookies : this.getCookies(url)};
      }else{
        return { success : true, error : '', cookies : this.getCookies(url)};
      }
    }catch(e){
      return { success : false, error : e, cookies : this.getCookies(url)};
    }

  }

  async doReese84Mode({url, payloadData}){

    await this.setReese84(url);
    await this.postReese84CreateRequest({ payloadUrl : url, data: payloadData});
    await this.postReese84UpdateRequest(this.reese84Token);

  }

  async setReese84(reese84Url){
    const reese84Page = await this.fetch(reese84Url,{
      headers : this.getHeaders(`js`),
      agent : this.agent
    });

    const reese84PageBody = await reese84Page.text();

    SAVE_ASTS && this.saveFile(`reese84.js`, reese84PageBody);

    this.reese84 = Reese84.fromString(reese84PageBody);

  }

  async setUtmvc({url, payloadData}){
    const utmvcPage = await this.fetch(url,{
      headers : this.getHeaders(`js`),
      agent : this.agent
    });

    const utmvcPageBody = await utmvcPage.text();

    SAVE_ASTS && this.saveFile(`utmvc.js`, utmvcPageBody);

    this.utmvc = Utmvc.fromString(utmvcPageBody);

    const payload = this.utmvc.createPayload(payloadData);
    const utmvcEncodedCookie = this.utmvc.encodeUtmvcData(payload, this.getCookies(url));

    this.setCookies(`___utmvc=${utmvcEncodedCookie}`, url);

  }

  async postReese84CreateRequest({ payloadUrl, data}) {

    this.reese84Url = payloadUrl;
    const payload = JSON.stringify(this.reese84.createPayload(data));

    const reese84Page = await this.fetch(this.reese84Url, {
      headers : this.getHeaders(`post`),
      agent : this.agent,
      method : `POST`,
      body : payload
    });

    const reese84PageBody = await reese84Page.text();

    SAVE_ASTS && this.saveFile(`reese84-post-response.html`, reese84PageBody);

    const parsed = JSON.parse(reese84PageBody);

    this.reese84Token = parsed[`token`];
    this.setCookies(`reese84=${this.reese84Token}`, this.reese84Url);

  }

  async postReese84UpdateRequest(oldToken){

    if (oldToken === undefined) {
      oldToken = this.reese84Token;
    }

    const reese84Page = await this.fetch(this.reese84Url, {
      headers : this.getHeaders(`post`),
      agent : this.agent,
      method : `POST`,
      body : `"${oldToken}"`
    });

    const reese84PageBody = await reese84Page.text();
    const parsed = reese84PageBody === '' ? {} : JSON.parse(reese84PageBody);

    if(Object.keys(parsed).length){

      this.reese84Token = parsed[`token`];
      this.setCookies(`reese84=${oldToken}`, this.reese84Url);
    }

  }

  async doCaptchaMode({url, gCaptchaToken}){
    //TODO : Implement captcha mode
  }
  async doFaviconMode(url){
    await this.fetch(`${new URL(url).origin}/favicon.ico`, {
      headers : {...this.defaultHeaders, "Accept": "image/avif,image/webp,*/*"},
      agent : this.agent
    });

  }

  getHeaders(pageType){

    const defaultHeaders = {...this.defaultHeaders};

    if(pageType === 'post'){
      defaultHeaders['Content-Type'] = 'text/plain; charset=utf-8';
    }

    if(pageType === 'main'){
      defaultHeaders['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9';
    }else{
      defaultHeaders['Accept'] =  '*/*';
    }

    return defaultHeaders;

  }


  parseIframeUrl(html){

    const incapUrl = html.match(/\<iframe id\="main-iframe" src\="(.*?)(?=")/);

    if(!incapUrl){
      throw Error(`Could not parse iframe url:${html}`);
    }

    return incapUrl[1];
  }

  parseIncapsulaScripts(url, html){

    const result = {
      'utmvc' : this.findUtmvcUrl(url, html),
      'reese84' : this.findReese84Url(url, html),
      'iframe' : false,
    };

    const findIframe = `<iframe id="main-iframe"`;
    const hasIframe = html.indexOf(findIframe) !== -1;

    if(hasIframe){

      const iframeQuery = this.parseIframeUrl(html);

      if(iframeQuery){
        const typeNumber = iframeQuery.split(`&`)[0].split(`=`)[1];
        const parsedUrl = new URL(url);
        result[`iframe`] = {
          'type' : typeNumber,
          'url' :  `${parsedUrl.origin}${this.parseIframeUrl(html)}`
        };
      }
    }

    return result;
  }

  findUtmvcUrl( url, body ) {
    const $ = cheerio.load(body);
    let utmvcUrl = false;

    $(`script`).each((index) => {

      const script = $(`script`)[index];
      const source = script.attribs.src;

      if(source !== undefined && source.startsWith(`/_Incapsula_Resource?`)){
        const parsedUrl = new URL(url);
        utmvcUrl = `${parsedUrl.origin}${source}`;
      }

    });

    return utmvcUrl;

  }

  findReese84Url( url, body ) {
    const $ = cheerio.load(body);
    let reese84Url = false;

    $(`script`).each((index) => {

      const script = $(`script`)[index];
      const source = script.attribs.src;

      if(((script.attribs.defer === '') || (script.attribs.async === ''))
      && !source.startsWith(`http`) && !source.startsWith(`/_Incapsula_Resource?`)){
        const parsedUrl = new URL(url);
        reese84Url = `${parsedUrl.origin}${source}?d=${parsedUrl.host}`;
      }

    });

    return reese84Url;

  }

  findCaptchaUrl(url, body ) {

    const incapUrl = body.match(/\xhr.open\("POST", "(.*?)(?=")/);

    if (incapUrl) {
      const parsedUrl = new URL(url);
      return `${parsedUrl.origin}${incapUrl[1]}`;
    }

    return false;

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
