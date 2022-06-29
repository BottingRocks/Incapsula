

const Captcha = require(`2captcha`);
const cheerio = require(`cheerio`);
const fetchCookie = require(`fetch-cookie`);
const fs = require(`fs`);
const HttpsProxyAgent = require(`https-proxy-agent`);
const inquirer = require(`inquirer`);
const nodeFetch = require(`node-fetch`);
const path = require(`path`);
const Reese84 = require(`./reese84/reese84.js`);
const Utmvc = require(`./utmvc/utmvc.js`);

const DEFAULT_REESE84_PAYLOAD = require(`../incapsula/payloads/reese84.js`);
const DEFAULT_UTMVC_PAYLOAD = require(`../incapsula/payloads/utmvc.js`);

const SAVE_ASTS = process.env.SAVE_ASTS || false;

class IncapsulaError extends Error {}
class IncapsulaSession {
  //To run this make sure to pass the --insecure-http-parser flag see:https://github.com/nodejs/node/issues/27711

  constructor({ proxyUrl, userAgent, cookieJar, _2captchaKey, askForCaptcha } = {}) {

    this.agent = proxyUrl !== undefined ? new HttpsProxyAgent(proxyUrl) : undefined;
    //this.userAgent = userAgent === undefined ? `Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:95.0) Gecko/20100101 Firefox/95.0` : userAgent;
    this.userAgent = userAgent ;

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

  async go({reese84}){
    reese84 = reese84 || DEFAULT_REESE84_PAYLOAD;
    const url = `https://www.ticketmaster.com/`

    try{

      const mainPage = await this.fetch(url, {
        headers : this.getHeaders({
          pageType : `main`,
          url,
        }),
        agent : this.agent
      });


      const body = await mainPage.text();
      SAVE_ASTS && this.saveFile(`main.html`, body);

      await this.doReese84Mode({payloadData : reese84, referer : 'https://www.ticketmaster.com' });

      const mainPageRefresh = await this.fetch(url, {
        headers : this.getHeaders({
          pageType : `refresh`,
          url,
        }),
        agent : this.agent
      });

      const mainPageRefreshBody = await mainPageRefresh.text();
      SAVE_ASTS && this.saveFile(`main-refresh.html`, mainPageRefreshBody);

      if([403, 400, 401].includes(mainPageRefresh.status)){
        return { success : false, error : mainPageRefreshBody, cookies : this.getCookies(url)};
      }else{
        return { success : true, error : ``, cookies : this.getCookies(url)};
      }
    }catch(e){
      return { success : false, error : e, cookies : this.getCookies(url)};
    }

  }

  async doReese84Mode({payloadData, referer}){
    const payloadUrl = `https://epsf.ticketmaster.com/eps-d`;
    await this.setReese84({ payloadUrl, referer });
    await this.postReese84CreateRequest({ payloadUrl, data : payloadData, referer });
    //await this.postReese84UpdateRequest({oldToken : this.reese84Token, referer});

  }

  async setReese84({ payloadUrl, referer}){
    const reese84Page = await this.fetch(payloadUrl,{
      headers : this.getHeaders({
        pageType : `reese84`,
        url : payloadUrl,
        referer,
      }),
      agent : this.agent
    });

    const reese84PageBody = await reese84Page.text();

    SAVE_ASTS && this.saveFile(`reese84.js`, reese84PageBody);

    this.reese84 = Reese84.fromString(reese84PageBody);

  }

  async postReese84CreateRequest({ payloadUrl, data, referer}) {

    this.reese84Url = payloadUrl;

    const payload = this.reese84.createPayload(data);

    const reese84Page = await this.fetch(this.reese84Url, {
      headers : this.getHeaders({
        pageType : `reese84Create`,
        url : this.reese84Url,
        referer,
      }),
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

  async postReese84UpdateRequest({oldToken, referer}){

    if (oldToken === undefined) {
      oldToken = this.reese84Token;
    }

    const reese84Page = await this.fetch(this.reese84Url, {
      headers : this.getHeaders({
        pageType : `reese84Update`,
        url : this.reese84Url,
        referer,
        bodyLength : oldToken.length
      }),
      agent : this.agent,
      method : `POST`,
      body : `"${oldToken}"`
    });

    const reese84PageBody = await reese84Page.text();
    const parsed = reese84PageBody === `` ? {} : JSON.parse(reese84PageBody);

    if(Object.keys(parsed).length){
      this.reese84Token = parsed[`token`];
      this.setCookies(`reese84=${oldToken}`, this.reese84Url);
    }

  }

  getHeaders(options = {}){
    const pageType = options.pageType || `main`;
    const url = options.url;
    const referer = options.referer;

    switch(pageType){
      case `main`:
        return {
          'Host' : new URL(url).host,
          'User-Agent' : this.userAgent,
          'Accept' : `text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8`,
          'Accept-Language' : `en-US,en;q=0.5`,
          'Accept-Encoding' : `gzip, deflate, br`,
          'Connection' : `keep-alive`,
          'Upgrade-Insecure-Requests' : `1`,
          'Sec-Fetch-Dest' : `document`,
          'Sec-Fetch-Mode' : `navigate`,
          'Sec-Fetch-Site' : `none`,
          'Sec-Fetch-User' : `?1`
        };
      case `refresh`:
        return {
          'Host' : new URL(url).host,
          'User-Agent' : this.userAgent,
          'Accept' : `text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8`,
          'Accept-Language' : `en-US,en;q=0.5`,
          'Accept-Encoding' : `gzip, deflate, br`,
          'Connection' : `keep-alive`,
          'Cookie' : ``,
          'Upgrade-Insecure-Requests' : `1`,
          'Sec-Fetch-Dest' : `document`,
          'Sec-Fetch-Mode' : `navigate`,
          'Sec-Fetch-Site' : `cross-site`,
          'Pragma' : `no-cache`,
          'Cache-Control' : `no-cache`,
        };
      case `utmvc-image`:
        return {
          'Host' : new URL(url).host,
          'User-Agent' : this.userAgent,
          'Accept' : `image/avif,image/webp,*/*`,
          'Accept-Language' : `en-US,en;q=0.5`,
          'Accept-Encoding' : `gzip, deflate, br`,
          'Referer' : referer,
          'Connection' : `keep-alive`,
          'Cookie' : ``,
          'Sec-Fetch-Dest' : `image`,
          'Sec-Fetch-Mode' : `no-cors`,
          'Sec-Fetch-Site' : `same-origin`,
        };
      case `utmvc`:
      case `reese84`:
      case `captcha`:
        return {
          'Host' : new URL(url).host,
          'User-Agent' : this.userAgent,
          'Accept' : `*/*`,
          'Accept-Language' : `en-US,en;q=0.5`,
          'Accept-Encoding' : `gzip, deflate, br`,
          'Referer' : referer,
          'Connection' : `keep-alive`,
          'Cookie' : ``,
          'Sec-Fetch-Dest' : `script`,
          'Sec-Fetch-Mode' : `no-cors`,
          'Sec-Fetch-Site' : `same-origin`,
        };
      case `reese84Create`:
      case `reese84Update`:
        return {
          'Host' : new URL(url).host,
          'Connection' : `keep-alive`,
          'Accept' : `application/json; charset=utf-8`,
          'Content-Type' : `text/plain; charset=utf-8`,
          'User-Agent' : this.userAgent,
          'Origin' : new URL(url).origin,
          'Sec-Fetch-Site' : `same-origin`,
          'Sec-Fetch-Mode' : `cors`,
          'Sec-Fetch-Dest' : `empty`,
          'Referer' : referer,
          'Accept-Encoding' : `gzip, deflate, br`,
          'Accept-Language' : `en-US,en;q=0.5`,
          'Cookie' : ``,
        };

      case `favicon`:
        return {
          'Host' : new URL(url).host,
          'User-Agent' : this.userAgent,
          'Accept' : `image/avif,image/webp,*/*`,
          'Accept-Language' : `en-US,en;q=0.5`,
          'Accept-Encoding' : `gzip, deflate, br`,
          'Referer' : referer,
          'Connection' : `keep-alive`,
          'Cookie' : ``,
          'Sec-Fetch-Dest' : `image`,
          'Sec-Fetch-Mode' : `no-cors`,
          'Sec-Fetch-Site' : `same-origin`,
        };
      case `iframe`:
        return {
          'Host' : new URL(url).host,
          'User-Agent' : this.userAgent,
          'Accept' : `text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8`,
          'Accept-Language' : `en-US,en;q=0.5`,
          'Accept-Encoding' : `gzip, deflate, br`,
          'Referer' : referer,
          'Connection' : `keep-alive`,
          'Cookie' : ``,
          'Upgrade-Insecure-Requests' : `1`,
          'Sec-Fetch-Dest' : `iframe`,
          'Sec-Fetch-Mode' : `navigate`,
          'Sec-Fetch-Site' : `same-origin`,
        };

    }

  }

  parseIframeUrl(html){

    const incapUrl = html.match(/\<iframe id\="main-iframe" src\="(.*?)(?=")/);

    if(!incapUrl){
      throw new IncapsulaError(`Could not parse iframe url:${html}`);
    }

    return incapUrl[1];
  }

  parseIncapsulaScripts({url, html}){

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
          'type' : Number(typeNumber),
          'url' : `${parsedUrl.origin}${this.parseIframeUrl(html)}`
        };
      }
    }

    return result;
  }


  findReese84Url( url, body ) {
    const $ = cheerio.load(body);
    let reese84Url = false;

    $(`script`).each((index) => {

      const script = $(`script`)[index];
      const source = script.attribs.src;

      if(((script.attribs.defer === ``) || (script.attribs.async === ``))
      && !source.startsWith(`http`) && !source.startsWith(`/_Incapsula_Resource?`)){
        const parsedUrl = new URL(url);
        reese84Url = `${parsedUrl.origin}${source}?d=${parsedUrl.host}`;
      }

    });

    return reese84Url;

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
